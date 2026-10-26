# First-party product telemetry

Food My Way can measure its launch funnel without sending recipes or customer content to an advertising platform.

## Deployment

Completed September 27, 2026:

1. Created the Cloudflare D1 database and applied `migrations/0003_product_telemetry.sql`.
2. Bound it to the Pages project as `TELEMETRY` in preview and production.
3. Enabled `telemetryEnabled` in release `2.62.0` and deployed commit `1273d9e`.
4. Confirmed production accepted allowlisted events and stored only the normalized event, UUID-style session identifier, path, empty allowlisted details object, and timestamp.
5. Seeded a disposable event older than 90 days, submitted another production event, and confirmed the expired row was deleted within the same ingestion transaction.

The documented deletion query remains an operational backstop.

## Data minimization

The endpoint accepts only named product events. It discards recipe titles, ingredients, diary content, email addresses, URLs containing query strings, error messages, stack traces, IP-derived location, and arbitrary properties. A random identifier lives only for the browser tab session.

Every accepted event transaction deletes rows older than 90 days before inserting the new event. Run the same deletion manually during incident recovery or if event ingestion has been inactive for an extended period.

## Source of truth

Browser telemetry measures intent and product activation. It must never claim that a purchase occurred: a visitor can forge a success URL or browser event. Paid orders, refunds, and active access are authoritative only in the signed Stripe webhook records and `PURCHASES` database.

## Launch funnel queries

Daily funnel counts:

```sql
SELECT substr(created_at,1,10) AS day, event_name, count(*) AS events,
       count(DISTINCT session_id) AS sessions
FROM product_events
WHERE event_name IN ('page_view','recipe_generated','recipe_intent_recorded','recipe_saved','founder_interest_saved','founder_checkout_started','founder_checkout_returned','kit_page_viewed','kit_checkout_started','kit_app_clicked','kit_downloaded','account_sign_in_requested','account_signed_in','cloud_backup_completed')
GROUP BY day,event_name ORDER BY day DESC,event_name;
```

Recipe-market-fit signal (the boolean `planned` value is the visitor's one-tap answer; no recipe content or identity is stored):

```sql
SELECT substr(created_at,1,10) AS day,
       sum(CASE WHEN json_extract(details,'$.planned')=1 THEN 1 ELSE 0 END) AS would_make,
       sum(CASE WHEN json_extract(details,'$.planned')=0 THEN 1 ELSE 0 END) AS would_not_make,
       count(*) AS responses
FROM product_events
WHERE event_name='recipe_intent_recorded'
GROUP BY day ORDER BY day DESC;
```

Survival Kit funnel by source and creative (the values are fixed allowlists, not arbitrary URLs or ad-platform identifiers):

```sql
SELECT substr(created_at,1,10) AS day,
       json_extract(details,'$.campaign_source') AS source,
       json_extract(details,'$.campaign_creative') AS creative,
       event_name,
       count(DISTINCT session_id) AS sessions
FROM product_events
WHERE event_name IN ('kit_page_viewed','kit_checkout_started','kit_app_clicked','kit_downloaded')
GROUP BY day,source,creative,event_name
ORDER BY day DESC,source,creative,event_name;
```

## Signed orders and campaign attribution (release 2.68.5)

Apply `migrations/0008_paid_orders.sql` to **PURCHASES before deploying** the corresponding webhook code. The migration is additive; do not backfill entitlement rows as sales. A missing table causes the webhook batch to fail atomically with 503 so Stripe can retry after configuration is corrected. This release preparation does not apply a production migration.

`entitlements` is current access by email/plan, not an immutable sales ledger: a repurchase can replace its amount/session. `paid_orders` instead records each verified paid Stripe Checkout session once, preserves first-recorded payment and attribution fields on replay, and marks full refunds by payment intent. Refund-before-payment delivery creates a refunded order when the signed payment arrives. The order's `payment_mode` is `live`, `test`, or `unknown` from Stripe's signed payload; unknown must not be counted as confirmed live sales. It stores no email or recipe data.

Both Kit and Founding checkouts carry allowlisted source/creative via Stripe `client_reference_id`. `fmw1-<source>-<creative>` optionally includes the existing opaque `vz_` reference. Legacy standalone VEYZLO references remain supported. Unknown/malformed input stays unknown; arbitrary query strings and personal metadata are discarded. Source/creative remain customer-controlled attribution context even when received inside a signed payment: they do not prove acquisition, causality, identity or a platform click. A signed successful payment proves payment, not genuine non-owner demand.

For the ten-sale objective, reconcile distinct live Stripe checkout/session records against owner, QA and rehearsal receipts first. **There is no automatic owner/QA classifier.** Exclude those exact sessions in the reporting query; do not infer zero unknown sales or retrospectively assign sources. Existing sales need separate signed-record reconciliation, since this table starts at rollout. Repeated sessions are sales, not necessarily distinct customers; verify distinct non-owner customers separately if that is the target.

Example gross/refund breakdown **before manual owner/QA exclusions** (amount includes tax where charged; it is not recognized/net accounting revenue):

```sql
SELECT date(stripe_event_created,'unixepoch') AS payment_day, plan,
       campaign_source, campaign_creative,
       count(*) AS verified_live_orders,
       sum(amount) / 100.0 AS gross_charged_usd,
       sum(CASE WHEN status='refunded' THEN 1 ELSE 0 END) AS fully_refunded_orders,
       sum(CASE WHEN status='paid' THEN amount ELSE 0 END) / 100.0 AS not_fully_refunded_charged_usd
FROM paid_orders
WHERE payment_mode='live'
-- Add reviewed owner/QA/rehearsal stripe_session_id exclusions here before demand reporting.
GROUP BY payment_day,plan,campaign_source,campaign_creative
ORDER BY payment_day DESC,plan;
```

Partial refunds are not classified as full refunds by this ledger; reconcile Stripe signed refund/payment records before reporting net revenue. The existing entitlement policy remains unchanged for partial refunds. Do not label the last monetary column net revenue.

Compare daily `founder_checkout_started` with Founding orders and `kit_checkout_started` with Kit orders directionally by source/creative, after exclusions. First-party tab sessions, checkout sessions and customers are different denominators. There is intentionally no persistent person-level telemetry join. `account_signed_in` with `{"founding":true}` measures member activation; download-click telemetry is not proof that a PDF transfer completed. Missing/blocked telemetry is unknown, not zero.

Generic client-error rate:

```sql
SELECT substr(created_at,1,10) AS day,
       sum(CASE WHEN event_name='client_error' THEN 1 ELSE 0 END) AS errors,
       count(DISTINCT session_id) AS sessions
FROM product_events GROUP BY day ORDER BY day DESC;
```

Storage and shared-link reliability:

```sql
SELECT substr(created_at,1,10) AS day, event_name, count(*) AS failures,
       count(DISTINCT session_id) AS affected_sessions
FROM product_events
WHERE event_name IN ('storage_write_failed','shared_recipe_invalid')
GROUP BY day,event_name ORDER BY day DESC,event_name;
```
