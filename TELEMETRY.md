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

## Launch funnel queries

Daily funnel counts:

```sql
SELECT substr(created_at,1,10) AS day, event_name, count(*) AS events,
       count(DISTINCT session_id) AS sessions
FROM product_events
WHERE event_name IN ('page_view','recipe_generated','recipe_saved','founder_checkout_started','founder_checkout_returned')
GROUP BY day,event_name ORDER BY day DESC,event_name;
```

Generic client-error rate:

```sql
SELECT substr(created_at,1,10) AS day,
       sum(CASE WHEN event_name='client_error' THEN 1 ELSE 0 END) AS errors,
       count(DISTINCT session_id) AS sessions
FROM product_events GROUP BY day ORDER BY day DESC;
```
