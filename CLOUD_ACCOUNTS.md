# Food My Way cloud accounts

The account backend uses passwordless email links, Cloudflare D1, and Resend. It fails closed until every required binding and secret is configured.

## Security model

- Login links expire after 15 minutes and can be consumed once.
- Raw login and session tokens are never stored; D1 receives SHA-256 hashes.
- Sessions use `HttpOnly`, `Secure`, `SameSite=Lax` cookies and expire after 30 days.
- A unique database constraint prevents concurrent reuse of one login challenge.
- Sign-in requests are limited to five per email per hour.
- Cloud snapshots accept only known Food My Way storage keys and are limited to 250 KB.
- Account deletion requires an authenticated session and an explicit `X-Confirm-Delete: DELETE` header.

## Cloudflare configuration

1. Create a D1 database for accounts and run `migrations/0004_cloud_accounts.sql`.
2. Bind the database to the Pages project as `ACCOUNTS` in preview and production.
3. Set encrypted secret `RESEND_API_KEY`.
4. Set `AUTH_FROM_EMAIL` to the verified sender, such as `Food My Way <login@foodmyway.app>`.
5. Set `AUTH_ORIGIN` to the exact HTTPS origin. Use the private Pages URL for preview and `https://foodmyway.app` for production.
6. Redeploy after bindings or secrets change.

## API surface

- `POST /api/auth/request` — send a one-time sign-in link.
- `GET /api/auth/consume?token=...` — consume the link, set the session cookie, and redirect home.
- `GET /api/auth/session` — return current authentication state.
- `POST /api/auth/session` — sign out and clear the cookie.
- `GET /api/account/data` — export the signed-in user's cloud snapshot.
- `PUT /api/account/data` — replace the bounded cloud snapshot.
- `DELETE /api/account/data` — delete account data, sessions, challenges, and the user record.

## Operations

Delete expired challenges and sessions periodically:

```sql
DELETE FROM login_challenges WHERE expires_epoch < unixepoch('now');
DELETE FROM sessions WHERE expires_epoch < unixepoch('now');
```

Before enabling the UI, test request, consume, session, sync, export, sign-out, expired-link, replayed-link, rate-limit, and deletion flows in preview.
