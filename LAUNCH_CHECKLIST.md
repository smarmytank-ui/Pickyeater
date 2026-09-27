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
- [x] Signed-in email entitlement lookup and feature-flagged premium gates
- [ ] Stripe account and verified business identity
- [ ] Stripe $29 founding product and Payment Link
- [ ] Refund and cancellation policy finalized
- [ ] Cloudflare D1 `LEADS` binding and live founding-interest verification
- [ ] `LEADS_UNSUBSCRIBE_SECRET` and live unsubscribe verification
- [ ] Production webhook secret, D1 `PURCHASES` binding, and test-mode fulfillment verification
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
- [x] Continuous integration and public-deployment verification script
- [x] Non-mutating paid-launch API readiness gate
- [ ] foodmyway.app connected to production
- [ ] PickyEaterCookbook.com redirect configured
- [x] Production social-share image
- [x] Privacy-minimized first-party analytics and generic client-error endpoint
- [ ] Cloudflare D1 `TELEMETRY` binding, live event verification, and production confirmation of transactional 90-day cleanup
- [ ] Search-engine verification and sitemap submission
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

Release `2.55.0` passes all 98 automated tests, including transaction-level account deletion, payment-record retention, multi-device sign-out isolation, corrupted-backup handling, and account-service-outage behavior. These checks prove the local implementation; the production Cloudflare bindings and live email flow still require the end-to-end verification listed above.

On September 26, 2026, release `2.47.0` passed the automated suite and a rendered in-app-browser smoke test against the local HTTP build:

- loaded a starter while honoring the saved “leave out” preference;
- generated a complete recipe with ingredient controls, sensory preferences, and thermometer-based chicken guidance;
- saved the exact recipe and opened it from the Recipe Book;
- verified dialog focus entry, backward focus wrapping, Escape dismissal, and focus restoration to the opener;
- verified screen-reader tab state and right-arrow navigation from Breakfast to Lunch in the diary;
- visually inspected the diary at desktop width with no obvious clipping, overlap, or broken layout.

This is evidence for the local release, not a substitute for the outstanding production-domain tests on mobile Safari, mobile Chrome, desktop Chrome, and desktop Edge.
