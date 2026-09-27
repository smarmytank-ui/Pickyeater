# Food My Way cloud accounts

The account backend uses passwordless email links, Cloudflare D1, and Resend. It fails closed until every required binding and secret is configured.

## Security model

- Login links expire after 15 minutes and can be consumed once.
- Raw login and session tokens are never stored; D1 receives SHA-256 hashes.
- Sessions use `HttpOnly`, `Secure`, `SameSite=Lax` cookies and expire after 30 days.
- A unique database constraint prevents concurrent reuse of one login challenge.
- Sign-in requests are limited to five per email per hour.
- Cloud snapshots accept only known Food My Way storage keys and are limited to 250 KB.
- Cloud backup writes require an active founding entitlement and fail closed when purchase verification is unavailable.
- Every cloud snapshot has an optimistic-lock revision; conflicting device writes return HTTP 409 instead of silently overwriting data.
- Account deletion requires an authenticated session and an explicit `X-Confirm-Delete: DELETE` header.

## Cloudflare configuration

1. Create a D1 database for accounts and run `migrations/0004_cloud_accounts.sql`.
2. Bind the database to the Pages project as `ACCOUNTS` in preview and production.
3. Set encrypted secret `RESEND_API_KEY`.
4. Set `AUTH_FROM_EMAIL` to the verified sender, such as `Food My Way <login@foodmyway.app>`.
5. Set `AUTH_ORIGIN` to the exact HTTPS origin. Use the private Pages URL for preview and `https://foodmyway.app` for production.
6. Redeploy after bindings or secrets change and complete the preview test matrix below.
7. Change `accountsEnabled` to `true` in `config.js` only after preview verification, then redeploy.
8. Verify that a Stripe test purchase made with the same email returns the `founding` entitlement in the account session.
9. Change `premiumEnforced` to `true` only after login, entitlement, refund, and account-recovery tests pass.

## API surface

- `POST /api/auth/request` — send a one-time sign-in link.
- `GET /api/auth/consume?token=...` — consume the link, set the session cookie, and redirect home.
- `GET /api/auth/session` — return current authentication state.
- `POST /api/auth/session` — sign out and clear the cookie.
- `GET /api/account/data` — export the signed-in user's cloud snapshot.
- `PUT /api/account/data` — replace the bounded cloud snapshot for an active founding member.
- `DELETE /api/account/data` — delete account data, sessions, challenges, and the user record.

## Operations

Delete expired challenges and sessions periodically:

```sql
DELETE FROM login_challenges WHERE expires_epoch < unixepoch('now');
DELETE FROM sessions WHERE expires_epoch < unixepoch('now');
```

Before enabling the UI, test request, consume, session, backup, restore, revision conflict, export, sign-out, expired-link, replayed-link, rate-limit, and deletion flows in preview.

The session endpoint checks the `PURCHASES` binding for an active founding entitlement. The backup endpoint independently repeats that authorization server-side; hiding a browser button is never treated as access control. Authenticated customers without an active entitlement may still retrieve/export an existing snapshot and delete their account, but cannot create or update cloud storage. Premium enforcement is a separate public flag so account testing never accidentally locks free beta users out of planning or taste-profile features.
