# Food My Way deployment guide

This project is intentionally simple: plain HTML, CSS, and JavaScript with no production build step or framework.

Deploy the complete repository so icons, the web manifest, offline support, and shared-recipe links remain intact. Do not upload only selected files.

---

## How to deploy

1. Push an approved commit and let the existing Cloudflare Pages project deploy the repository root. Pages Functions under `functions/` must be included; this is not a static-only GitHub Pages deployment.
2. Keep the preview hostname protected with Cloudflare Access while testing. Connect `foodmyway.app` only when production launch gates pass.
3. Apply every numbered migration in `migrations/` to its documented D1 database and configure the `LEADS`, `PURCHASES`, `TELEMETRY`, and `ACCOUNTS` bindings. Follow `CLOUD_ACCOUNTS.md`, `PAYMENTS_AND_LEADS.md`, and `TELEMETRY.md` for the binding-to-migration mapping.
4. Configure secrets only in Cloudflare: Resend credentials and sender, the Stripe webhook secret, and the founding-list unsubscribe secret. Never put secrets in `config.js` or Git.
5. Run `npm run verify:release` before deployment. CI runs the same syntax and behavioral checks on `main` and `picky-v2`.
6. Run `node scripts/verify-deployment.mjs https://foodmyway.app` after every deployment. This checks the public funnel, security headers, assets, and fail-closed APIs without creating customer data.
7. Before accepting money, run `node scripts/verify-deployment.mjs https://foodmyway.app --launch`. Launch mode requires enabled account, premium, and telemetry flags; a valid Stripe URL; configured live APIs; and published launch-ready legal copy.
8. Complete the manual production matrix in `LAUNCH_CHECKLIST.md`: recipe creation, save/edit/share, install/offline reload, account email, backup/restore/export/deletion, purchase/activation/refund, and supported mobile/desktop browsers.

That’s it.

---

## Release ownership

- Product and code work stays on a reviewed feature branch such as `picky-v2`; `main` remains the production rollback point.
- Browser data is local-first. Optional cloud backup uses Cloudflare Pages Functions and D1 passwordless accounts; Supabase is not part of the current architecture.
- The owner-only identity, banking, legal approval, DNS, and third-party terms steps are isolated in `OWNER_LAUNCH_ACTIONS.md`.
- Runtime feature flags remain false until their live dependencies pass the launch verifier and manual end-to-end test.

## Deployment rules

- `index.html` must live at repo root
- All paths are relative (`./styles.css`, `./app.js`)
- No secrets or API keys in the repo
- Cloudflare Pages serves static assets and the Pages Functions API
- `service-worker.js` must be deployed at the repository root
- Keep `site.webmanifest` and all icon files deployed
- Keep `_headers` in the publish root; it disables framing, unnecessary device permissions, MIME sniffing, and stale caching of runtime configuration
- GitHub Actions runs the complete test and syntax suites on `main` and `picky-v2`; do not deploy a failing commit

## Domains

- Primary/canonical domain: `foodmyway.app`
- Acquisition redirect: `PickyEaterCookbook.com`

The app generates share links from its current origin. Point `foodmyway.app` at the production Cloudflare Pages project, then redirect `PickyEaterCookbook.com` to the primary domain. Do not publish the Cloudflare preview hostname in marketing.

---

## Versioning

`package.json`, the `app.js`/`styles.css` query strings in `index.html`, and the service-worker cache name must carry the same release number. The automated asset test enforces this. If production breaks, roll Cloudflare Pages back to the last deployment whose commit passed both automated suites and the deployment verifier.

---

## Roles

**Owner:** legal identity, banking/tax onboarding, domain authorization, support inbox, refund/legal approval, and acceptance of third-party commercial terms.

**Product engineering:** code, migrations, tests, product polish, configuration validation, operational documentation, and deployment verification.

---

If it feels good, ship it.
