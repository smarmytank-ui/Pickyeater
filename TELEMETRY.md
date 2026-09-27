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
WHERE event_name IN ('page_view','recipe_generated','recipe_intent_recorded','recipe_saved','founder_interest_saved','founder_checkout_started','founder_checkout_returned','account_sign_in_requested','account_signed_in','cloud_backup_completed')
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

Count paid founding orders and current recognized revenue from the authoritative purchase ledger:

```sql
SELECT substr(created_at,1,10) AS purchase_day,
       count(*) AS paid_orders,
       sum(amount) / 100.0 AS gross_sales_usd,
       sum(CASE WHEN status='active' THEN amount ELSE 0 END) / 100.0 AS currently_active_sales_usd,
       sum(CASE WHEN status='refunded' THEN 1 ELSE 0 END) AS refunded_orders
FROM entitlements
GROUP BY purchase_day ORDER BY purchase_day DESC;
```

Compare daily `founder_checkout_started` sessions with `paid_orders` for directional checkout conversion. They live in separate privacy-minimized databases and are intentionally not joined by email or another persistent person-level identifier. `account_signed_in` with `{"founding":true}` measures paid-member activation after purchase.

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
