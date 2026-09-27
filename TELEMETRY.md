# First-party product telemetry

Food My Way can measure its launch funnel without sending recipes or customer content to an advertising platform.

## Deployment

1. Create a Cloudflare D1 database and run `migrations/0003_product_telemetry.sql`.
2. Bind it to the Pages project as `TELEMETRY` in preview and production.
3. Change `telemetryEnabled` to `true` in `config.js` and deploy.
4. Generate and save a test recipe, then confirm only allowlisted events and fields appear in `product_events`.
5. Schedule the documented 90-day deletion query and verify it periodically.

## Data minimization

The endpoint accepts only named product events. It discards recipe titles, ingredients, diary content, email addresses, URLs containing query strings, error messages, stack traces, IP-derived location, and arbitrary properties. A random identifier lives only for the browser tab session.

## Source of truth

Browser telemetry measures intent and product activation. It must never claim that a purchase occurred: a visitor can forge a success URL or browser event. Paid orders, refunds, and active access are authoritative only in the signed Stripe webhook records and `PURCHASES` database.

## Launch funnel queries

Daily funnel counts:

```sql
SELECT substr(created_at,1,10) AS day, event_name, count(*) AS events,
       count(DISTINCT session_id) AS sessions
FROM product_events
WHERE event_name IN ('page_view','recipe_generated','recipe_saved','founder_interest_saved','founder_checkout_started','founder_checkout_returned','account_sign_in_requested','account_signed_in','cloud_backup_completed')
GROUP BY day,event_name ORDER BY day DESC,event_name;
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
