# Food My Way launch checklist

## Product

- [x] Recipe generation
- [x] Ingredient swaps
- [x] Serving controls
- [x] Estimated nutrition disclosure
- [x] Local Recipe Book
- [x] Recipe sharing
- [x] Local food diary
- [x] Responsive installable web app
- [x] Local household taste profile
- [x] “Never suggest” preferences
- [x] Weekly meal planner
- [x] Consolidated grocery list
- [ ] Real cloud accounts and synchronization
- [x] Account export and atomic account deletion implementation
- [x] Multi-session sign-out isolation and paid-record retention tests
- [x] Passwordless account/session backend and bounded cloud-data API
- [x] Scanner-resistant, explicit-confirmation magic-link consumption
- [x] Feature-flagged account UI and conflict-safe explicit backup/restore
- [x] Server-enforced founding entitlement for cloud backup writes
- [x] Corrupted-backup and account-service-outage safeguards
- [ ] Account email delivery plus live backup, restore, export, and deletion verification

## Commercial

- [x] Positioning and brand hierarchy
- [x] Free and founding plan presentation
- [x] Conversion-event hooks
- [x] Stripe Payment Link configuration and hostname validation
- [x] Consent-based founding-lead endpoint and D1 schema
- [x] Signed founding-list unsubscribe endpoint and consent-state update
- [x] Signed, idempotent Stripe fulfillment endpoint and entitlement schema
- [x] Out-of-order refund protection with payment-intent tombstones
- [x] Tax-tolerant $29 subtotal validation and discount rejection
- [x] Signed-in email entitlement lookup and feature-flagged premium gates
- [ ] Stripe account and verified business identity
- [ ] Stripe $29 founding product and Payment Link
- [ ] Refund and cancellation policy finalized
- [x] Cloudflare D1 `LEADS` database, schema, and preview binding
- [x] Live founding-interest verification
- [x] `LEADS_UNSUBSCRIBE_SECRET` and live unsubscribe verification
- [x] Cloudflare D1 `PURCHASES` database, schema, and preview binding
- [ ] Production webhook secret and test-mode fulfillment verification
- [ ] End-to-end founding purchase, login, premium-access, and refund test

## Trust and operations

- [x] Privacy draft
- [x] Terms draft
- [x] Complete paid-launch terms draft with owner/counsel placeholders
- [x] Support page
- [x] Nutrition and medical disclaimers
- [ ] Legal operator name/address inserted
- [ ] Professional legal review
- [ ] support@foodmyway.app routing verified
- [x] Customer-support response templates
- [x] Incident, refund, and deletion procedures

## Distribution

- [x] Web manifest and offline shell
- [x] Search metadata and structured data
- [x] robots.txt and sitemap.xml
- [x] Focused SEO pages for picky adults, families, sensory preferences, and easy weeknights
- [x] Production security and cache headers
- [x] Monitoring-only DMARC policy published for foodmyway.app
- [x] Continuous integration and public-deployment verification script
- [x] Hourly production availability monitor with deduplicated GitHub incident creation
- [x] Non-mutating paid-launch API readiness gate
- [x] foodmyway.app connected to production
- [x] PickyEaterCookbook.com canonical redirect configured
- [x] Production social-share image
- [x] Privacy-minimized first-party analytics and generic client-error endpoint
- [x] Cloudflare D1 `TELEMETRY` database, schema, and preview binding
- [x] Live event verification and production confirmation of transactional 90-day cleanup
- [x] Search-engine verification and sitemap submission
- [ ] TikTok, Instagram, and YouTube handles reserved
- [ ] Apple/Google store packaging decision after web retention proof

## Grocery commerce

- [x] Instacart selected as first commerce integration
- [x] Server-side shopping-list adapter and validation tests
- [x] Payload QA across 25 representative picky-eater grocery lists
- [x] Consent-based, feature-flagged “Shop ingredients” planner flow
- [x] Cloudflare endpoint fails closed until a secret is configured
- [ ] Instacart development application and API key
- [ ] Live Instacart development-catalog match QA across the 25 fixtures
- [ ] Instacart-approved CTA and production review
- [ ] Impact affiliate enrollment and attribution test

## Human-required items

These steps require the owner because they involve legal identity, banking, taxes, or accepting third-party commercial terms:

1. Confirm the legal person or business that will sell Food My Way.
2. Complete Stripe identity, bank, and tax onboarding.
3. Approve the final refund policy and legal documents.
4. Confirm the inbox that should receive support@foodmyway.app mail.
5. Approve public testimonials and creator partnerships before publication.
6. Approve Resend enrollment, sending-domain verification, and credential creation.

See `OWNER_LAUNCH_ACTIONS.md` for the minimal owner-only sequence and `LEGAL_LAUNCH_PACKET.md` for recommended approval-ready language.

## Latest local browser evidence

Release `2.63.0` passes all 114 automated tests plus direct syntax checks across the browser application, service worker, and every Cloudflare Function. Coverage includes transaction-level account deletion, payment-record retention, multi-device sign-out isolation, corrupted-backup handling, account and entitlement outages, cross-tab checkout recovery, tax-tolerant one-time Founding pricing, grocery handoff authorization, legacy-route cleanup, canonical SEO signals, and the privacy-minimized telemetry contract. These checks prove the local implementation; live email and payment flows still require the end-to-end verification listed above.

On September 27, 2026, the protected Cloudflare preview was revalidated before the pending source push:

- an unauthenticated HTTPS request returned a Cloudflare Access `302` challenge with private/no-store cache policy;
- an approved email login reached the Food My Way preview successfully;
- the deployed UI still showed the earlier private-beta pricing copy, “limited saved recipes,” and no account control, proving that it predates the local `2.61.0` release;
- `git push --dry-run origin picky-v2` authenticated successfully and reported the exact pending range `ee8b258..ddc2a44` without modifying the remote.

Use those visible pricing and account-control differences as the immediate post-deploy smoke check; do not accept a deployment that still serves the pre-push shell from a stale service-worker cache.

The authorized September 27 deployment then passed that comparison at pushed commit `6b760fb`:

- GitHub Actions run `36336065999` completed successfully for the exact pushed head;
- a cache-busted authenticated preview showed the new “Up to 3 saved recipes” allowance, the complete Founding feature list, cloud backup copy, five-question FAQ, and SEO guide links;
- the deployed service worker reported cache `food-my-way-v2-61-0` and asset version `2.61.0`;
- the deployed configuration kept checkout, commerce, telemetry, accounts, and premium enforcement disabled pending their live external bindings;
- the live app generated a four-ingredient chicken recipe with six steps and 165°F thermometer guidance, saved it, reopened it from the Recipe Book, and displayed the weekly-planner entry point.

This proves the current private preview shell and local-first core flow. It does not satisfy the separately listed production-domain, Resend, Stripe, or live paid-flow gates.

Later on September 27, 2026, Cloudflare infrastructure was advanced at pushed commit `67b71a7`:

- created `food-my-way-leads`, `food-my-way-purchases`, `food-my-way-telemetry`, and `food-my-way-accounts` on the Cloudflare free tier;
- applied migrations `0001` through `0006` to their documented databases;
- committed the four binding IDs in `wrangler.toml`, deployed the commit through the existing Git integration, and verified `LEADS`, `PURCHASES`, `TELEMETRY`, and `ACCOUNTS` on the preview environment;
- added `foodmyway.app` to Cloudflare DNS while preserving the discovered Namecheap email-forwarding MX and SPF records;
- received the assigned nameservers `alex.ns.cloudflare.com` and `lilyana.ns.cloudflare.com`.

The same day, the public domain rollout was completed and independently verified:

- Namecheap now delegates both `foodmyway.app` and `pickyeatercookbook.com` to the assigned Cloudflare nameservers;
- `https://foodmyway.app` serves production release `2.61.0` from commit `1329299`, and the deployment verifier passed all 26 checks;
- Cloudflare reports active Universal SSL for `pickyeatercookbook.com` and `*.pickyeatercookbook.com`;
- the imported Private Email MX, SPF, DMARC, SRV, and mail-discovery records were preserved, with mail-related CNAME records corrected to DNS-only;
- apex and `www` requests for `pickyeatercookbook.com`, over both HTTP and HTTPS, return permanent redirects to `https://foodmyway.app` while preserving the path and query string;
- `www.foodmyway.app` also permanently redirects to the canonical apex while preserving the path and query string.

Database presence and binding do not by themselves enable customer-facing accounts, payments, commerce, or email. Keep those public flags off until their separately listed secrets and end-to-end checks pass; telemetry is the only production feature enabled independently after its privacy and retention checks passed.

Production telemetry was enabled in release `2.62.0` at commit `1273d9e` after its binding and privacy controls were verified. Two allowlisted `page_view` events returned `201 Created` from `https://foodmyway.app/api/events` and were visible in the production `food-my-way-telemetry` database. A disposable event dated January 1, 2025 was inserted before the second request; the following database query returned only the two current verification paths and no expired test path, proving the production transaction performed its 90-day cleanup. The production verifier then passed all 26 core checks.

The production founding-interest lifecycle was verified after encrypted secret deployment `45c4c40`. A consented `example.com` QA submission returned `201 Created`; D1 showed `consent=1`, `status='active'`, and a 43-character opaque unsubscribe token. The signed GET rendered the confirmation form, the POST changed the record to `consent=0` and `status='unsubscribed'`, and a repeated POST returned the same successful unsubscribed response without another state transition. The disposable QA row was then removed and a zero-row query confirmed cleanup.

A fresh public desktop-Chrome journey against release `2.62.0` then verified the complete pre-payment conversion path on `https://foodmyway.app`: the visitor saw the Free and $29 one-time Founding offers, generated a four-ingredient chicken dinner with six steps and 165°F thermometer guidance, saved it, opened the Recipe Book, and reopened the intact recipe. The founding modal required explicit consent and displayed its success state after submission. Production D1 recorded the disposable lead as consented, active, sourced from `founding-modal`, and assigned a 43-character opaque unsubscribe token. The matching telemetry trail contained `page_view`, `recipe_generated`, `recipe_saved`, `recipe_book_opened`, `saved_recipe_opened`, `founder_interest_opened`, and `founder_interest_saved`; event details contained only allowlisted counts and sync state, never the recipe or email. The disposable lead was deleted afterward, and a zero-row query confirmed cleanup.

Release `2.63.0` added a one-tap “Would you make this?” signal to generated recipes so launch traffic measures recipe usefulness, not only generation. The response is stored as the single boolean `planned` field on the allowlisted `recipe_intent_recorded` event; the UI explicitly states that recipe and ingredient content are never sent. The production interaction rendered and confirmed correctly in desktop Chrome, D1 received exactly `{"planned":true}` with path `/`, and the disposable QA event was then deleted with a zero-row confirmation. The deployment verifier passed all 26 production checks after rollout.

The hourly GitHub production monitor was manually dispatched from `main` at commit `6c59b6a`; run `36342740969` completed successfully in 13 seconds, with the 26-check production verifier finishing in 7 seconds. The workflow has read-only repository access plus issue-write access solely to open or update one deduplicated production incident. Its pinned GitHub actions were then advanced to their Node 24-compatible major versions after the first run exposed runtime-deprecation warnings. Validation run `36342801615` on commit `ce7640d` completed successfully in 10 seconds with no action-runtime warning.

The monetization audit corrected fulfillment before Stripe activation: checkout verification now requires an exact USD $29 subtotal and no discount while accepting applicable tax above the subtotal. A dedicated test proves a $31.54 taxed total grants access and a discounted total fails closed. Stripe's native `restrictions.completed_sessions.limit=250` is now the required Founding-cap control. Cloudflare shows production and preview both deployed exact commit `1b2cbc4`, and the core production verifier passed all 26 checks afterward. The strict paid-launch verifier passed 33 checks and left 10 expected failures, all attributable to the four owner-controlled gates documented in `OWNER_LAUNCH_ACTIONS.md`: approved seller/legal terms, Stripe, Resend, and support routing.

Google Search Console domain ownership for `foodmyway.app` was verified through a DNS TXT record on September 27, 2026. Google accepted `https://foodmyway.app/sitemap.xml` with status **Success**, reported eight discovered pages, and added the canonical homepage to its priority crawl queue. The verification TXT record must remain in Cloudflare DNS.

Cloudflare DNS now also publishes `_dmarc.foodmyway.app` as `v=DMARC1; p=none;`. Public resolution through `1.1.1.1` was verified. This monitoring-only policy improves spoofing visibility without rejecting mail while support routing and the future Resend sender are finalized.

On September 26, 2026, release `2.47.0` passed the automated suite and a rendered in-app-browser smoke test against the local HTTP build:

- loaded a starter while honoring the saved “leave out” preference;
- generated a complete recipe with ingredient controls, sensory preferences, and thermometer-based chicken guidance;
- saved the exact recipe and opened it from the Recipe Book;
- verified dialog focus entry, backward focus wrapping, Escape dismissal, and focus restoration to the opener;
- verified screen-reader tab state and right-arrow navigation from Breakfast to Lunch in the diary;
- visually inspected the diary at desktop width with no obvious clipping, overlap, or broken layout.

This is evidence for the local release, not a substitute for the outstanding production-domain tests on mobile Safari, mobile Chrome, desktop Chrome, and desktop Edge.
