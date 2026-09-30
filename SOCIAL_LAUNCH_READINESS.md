# Food My Way social launch readiness

Updated: September 30, 2026

This is the authoritative go/no-go ledger for the first Food My Way social launch. A checked box requires direct evidence; plans and intended actions do not count.

## Brand system

- [x] Public brand name is Food My Way.
- [x] Legal owner is TP Biz Op LLC.
- [x] Durable business email is `support@foodmyway.app`.
- [x] Primary website is `https://foodmyway.app`.
- [x] Profile image is ready: `food-my-way-pfp-512.png`.
- [x] Facebook cover is ready: `food-my-way-facebook-cover-v1.png`.
- [x] Cross-platform bio and primary profile link are documented in `SOCIAL_ACCOUNT_REGISTRY.md`.
- [x] Passwords, OTPs, recovery codes, card data, and API secrets are excluded from the repository.

## Instagram

- [x] Separate Food My Way Instagram account created and email verified.
- [x] Exact fallback handle `@food_my_way_app` secured and documented.
- [x] Converted to professional Business account with the `Software Company` category; category display remains hidden.
- [ ] Profile photo, name, bio, and Survival Kit link applied and verified publicly. The round PFP, display name `Food My Way app`, and bio are verified live; only the link remains.
- [x] Meta two-factor authentication enabled for the Instagram-based administrator; Meta Business Security Center reports `0 out of 1` people still needing two-factor authentication. The exact method and private recovery-code storage remain to be audited.
- [x] Owned by the TP Biz Op LLC Meta Business Portfolio; account ID `17841419124020938` verified live.

Current blocker: add `https://foodmyway.app/survival-kit` in the Instagram mobile app and cross-connect the profile with the Food My Way Facebook Page.

## Facebook and Meta

- [x] Food My Way Facebook Page created under TP Biz Op LLC with page ID `1373971672467209`, category `Software Company`, and the approved bio.
- [ ] Page username secured, branding applied, and public About/contact data verified.
- [ ] TP Biz Op LLC Meta Business Portfolio created and fully verified. Business Suite is active, Instagram message access is enabled, and Meta reports the portfolio is eligible for verification; legal name, address, phone, website, primary Page/location, and verification remain.
- [x] Authentic private human administrator has full control without appearing on the public Food My Way Page.
- [x] Food My Way Page and Instagram account are owned by the TP Biz Op LLC portfolio; their cross-connection remains.
- [x] Meta ad account `Food My Way Ads` created under TP Biz Op LLC with account ID `1748503076238751`, Pacific Time, and USD. No payment method is attached and no spend is active.
- [x] Meta two-factor requirement is satisfied for the sole administrator; live Security Center reports `0 out of 1` people still needing two-factor authentication.
- [ ] Meta passkey requirement has synchronized. A Windows Hello passkey for `support@foodmyway.app` was verified in Accounts Center on September 30, 2026, but Business Security Center still reports `1 out of 1` people needing a passkey.

Current blocker: connect the Facebook Page and Instagram profile, replace the Page's default profile image and blank cover, secure its username/link, and finish Meta legal verification/security. The authentic private Facebook administrator remains an internal ownership record and is not exposed on the public Page.

## TikTok

- [x] TikTok for Business login created by owner.
- [x] Website, legal business name, country, industry, spend range, phone, and business email populated.
- [x] Time zone corrected to Los Angeles and currency verified as USD.
- [x] Human contact name corrected from the company name.
- [x] Optional Beta Tester Program enrollment removed.
- [x] Advertiser onboarding submitted and success state/account ID verified (`7691373556810366996`).
- [x] TikTok Business Center access restored. Business Center `TP Biz Op LLC_bc_okmb61` (organization ID `7691373835622416405`) opens normally and reports one linked advertiser account.
- [x] Ownership/access audited: one active owner has Admin and Finance Manager roles and one assigned advertiser account; no additional users or partners were observed.
- [ ] Food My Way public TikTok identity/handle, profile image, bio, and link configured.
- [x] Two-step verification enabled with email and text-message methods. An authenticator app and privately stored recovery codes remain recommended hardening.

Advertiser onboarding, two-step verification, and Business Center access are complete. Live inventory reports 0 connected TikTok profiles, 0 ad-delivery assets, 0 shops, and 0 pixels. Remaining TikTok work is linking/configuring the public profile and preparing the campaign draft; no campaign or payment method has been created.

## Launch content

- [x] Three 20-second vertical launch videos rendered.
- [x] 1080×1920, 30 fps, H.264 video, AAC stereo audio verified with FFprobe.
- [x] Three custom vertical cover images extracted and visually inspected.
- [x] Hooks, captions, calls to action, hashtags, posting order, and UTM creative codes documented in `SOCIAL_LAUNCH_PACK.md`.
- [ ] Launch videos uploaded as drafts to each completed platform.
- [ ] Owner approves each first public post at action time.

## Controlled first paid test

- [x] Current application test suite passes: 126/126 tests on September 30, 2026.
- [x] Live paid-launch verifier passes: 54/54 production checks against `https://foodmyway.app` on September 30, 2026, including the $19 Survival Kit page, Stripe configuration, authentication, protected download, refund/legal copy, and public/API routes.
- [x] Meta and TikTok campaign names, budgets, targeting, placements, links, and stop rules documented.
- [x] Representative Meta and TikTok production URLs returned HTTP 200 with the Food My Way app shell and Survival Kit route.
- [x] Maximum planned test is $135: Meta $45 plus TikTok $90.
- [x] Third-party pixels, customer lists, child information, and food-preference targeting are excluded from test one.
- [ ] Organic-signal gate satisfied.
- [ ] Campaign drafts built in both platforms and review screens audited.
- [ ] Owner approves the exact payment methods and publication at action time.

## Go/no-go decision

**NO-GO for public launch today.** Creative, campaign preparation, and the TikTok advertiser account are ready, but the public social identities, security controls, and business ownership links are not yet fully completed and verified.

The next two owner actions, in order:

1. In the Instagram mobile app, add `https://foodmyway.app/survival-kit` to the public profile.
2. Report `Instagram link done` so the profile can be connected to Meta and secured with two-factor authentication.
