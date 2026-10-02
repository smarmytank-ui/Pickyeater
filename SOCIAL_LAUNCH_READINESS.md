# Food My Way social launch readiness

Updated: October 2, 2026

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
- [x] Non-secret ownership, account IDs, recovery status, and private vault-reference fields are consolidated in `ACCOUNT_OWNERSHIP_REGISTRY.md`.

## Instagram

- [x] Separate Food My Way Instagram account created and email verified.
- [x] Preferred handle `@foodmywayapp` secured and verified publicly.
- [x] Converted to professional Business account with the `Software Company` category; category display remains hidden.
- [x] Profile photo, display name, bio, and Survival Kit link applied and verified publicly.
- [x] Meta two-factor authentication enabled for the Instagram-based administrator; Meta Business Security Center reports `0 out of 1` people still needing two-factor authentication. The exact method and private recovery-code storage remain to be audited.
- [x] Owned by the TP Biz Op LLC Meta Business Portfolio; account ID `17841419124020938` verified live.

Instagram is connected to the Food My Way Facebook Page. Remaining Instagram work is limited to routine launch-content preparation and final public QA.

Public visitor-view QA on September 30, 2026 confirmed `@foodmywayapp`, display name `Food My Way app`, the round brand PFP, the approved bio, and the clickable `foodmyway.app/survival-kit` link. The profile showed no personal name and no published posts.

## Facebook and Meta

- [x] Food My Way Facebook Page created under TP Biz Op LLC with page ID `1373971672467209`, category `Software Company`, and the approved bio.
- [ ] Page username secured, profile image applied, and public About/contact data verified. Public QA on September 30, 2026 confirmed the approved cover and bio are live, but the profile image is still Facebook's default `F`, the Page URL is still numeric (`61595078755170`), and no public website field was visible.
- [x] TP Biz Op LLC Meta Business Portfolio created and active. Instagram message access and the Page connection are enabled. Meta business verification is optional at this stage and remains intentionally unsubmitted.
- [x] Authentic private human administrator has full control without appearing on the public Food My Way Page.
- [x] Food My Way Page and Instagram `@foodmywayapp` are owned by the TP Biz Op LLC portfolio and connected to each other; Meta confirmed the connection live on September 30, 2026.
- [x] Meta ad account `Food My Way Ads` created under TP Biz Op LLC with account ID `1748503076238751`, Pacific Time, and USD. No payment method is attached and no spend is active.
- [x] Meta two-factor requirement is satisfied for the sole administrator; live Security Center reports `0 out of 1` people still needing two-factor authentication.
- [x] Meta passkey requirement is no longer blocking setup. A live October 1, 2026 Security Center recheck shows the portfolio requirement as `No one`; two-factor authentication remains `Admins only` with `0 out of 1` administrators pending.

Meta asset connection is complete. Meta confirmed that the Food My Way Facebook Page was connected to Instagram `@foodmywayapp`, and the authentic private Facebook administrator remains an internal ownership record that is not exposed on the public Page. On October 1, 2026, the Instagram-authenticated Business Suite session remained unable to access Page Settings and an access request was sent to the full-control portfolio owner. That request is pending. Business verification remains optional for the current connection and launch-preparation work.

Live recheck on October 2, 2026: the public Page still shows the branded cover, approved bio, `Software Company` category, zero followers, and Facebook's default `F` profile image. Meta Business Settings still redirects the Instagram-authenticated identity to `Your request is pending`, citing the October 1 Settings-access request. No public-setting changes are safe from this session until the private Facebook administrator reconciles that request.

## TikTok

- [x] TikTok for Business login created by owner.
- [x] Website, legal business name, country, industry, spend range, phone, and business email populated.
- [x] Time zone corrected to Los Angeles and currency verified as USD.
- [x] Human contact name corrected from the company name.
- [x] Optional Beta Tester Program enrollment removed.
- [x] Advertiser onboarding submitted and success state/account ID verified (`7691373556810366996`).
- [x] TikTok Business Center access restored. Business Center `TP Biz Op LLC_bc_okmb61` (organization ID `7691373835622416405`) opens normally and reports one linked advertiser account.
- [x] Ownership/access audited: one active owner has Admin and Finance Manager roles and one assigned advertiser account; no additional users or partners were observed.
- [x] Food My Way public TikTok profile exists, is correctly linked to TP Biz Op LLC, has the owner-applied PFP, and has a verified live bio that directs visitors to `foodmyway.app`.
- [ ] Rename TikTok display name from `FoodMyWay.app` to `Food My Way app` after TikTok's Oct 7, 2026 cooldown, and request preferred `@foodmywayapp` after the username cooldown ends Oct 30, 2026.
- [ ] Audit the TikTok mobile Business-profile website field and add `https://foodmyway.app/survival-kit` if the field is available.
- [x] Two-step verification enabled with email and text-message methods. An authenticator app and privately stored recovery codes remain recommended hardening.

Advertiser onboarding, two-step verification, Business Center access, the dedicated public profile connection, PFP, and launch bio are complete. The correct profile is `@foodmyway.app`; earlier accidental links to established `@smarmytank` and `@1purpose_oc` accounts were removed without modifying those profiles. TikTok prevents another display-name change until Oct 7, 2026 and another username change until Oct 30, 2026. The campaign builder currently reports that the advertising-account contract is not yet in effect and disables Continue. Its simplified flow also defaults to a seven-day rebate offer at $280; do not accept it because it exceeds the approved $90 TikTok test cap. Remaining TikTok work is the timed rename, mobile website-field audit, first content, and campaign draft after TikTok activates the contract; no campaign or payment method has been created.

Public visitor-view QA on September 30, 2026 confirmed the round brand PFP, display name `FoodMyWay.app`, handle `@foodmyway.app`, approved bio, zero published videos, and no personal-name exposure. No clickable website link was visible, so the mobile Business-profile website-field audit remains open.

Live recheck on October 2, 2026 confirmed the same public branding and zero published videos. The active desktop TikTok session is authenticated as the separate `@1purpose_oc` account, not the Food My Way account. Do not upload, edit, or publish from that session; first switch or authenticate the dedicated `@foodmyway.app` account.

## Launch content

- [x] Three 20-second vertical launch videos rendered, plus three separate narrated review masters.
- [x] 1080×1920, 30 fps, H.264 video, AAC stereo audio verified with FFprobe.
- [x] Three custom vertical cover images extracted and visually inspected.
- [x] Exact narrated upload allowlist recorded in `SOCIAL_ASSET_MANIFEST.json` with byte sizes, SHA-256 hashes, publication disabled, and owner audio approval pending; silent source files are explicitly excluded.
- [x] Hooks, captions, calls to action, hashtags, posting order, and UTM creative codes documented in `SOCIAL_LAUNCH_PACK.md`.
- [x] A single owner-facing watch/listen/sign-off packet for all three narrated masters is available in `SOCIAL_CONTENT_APPROVAL_PACKET.md`.
- [ ] Launch videos uploaded as drafts to each completed platform. Video 1 is staged in the live TikTok and Instagram composers, but its source contains an intentionally silent audio track and must be replaced with an audible launch master before publication; Facebook and Videos 2–3 remain to be staged.
- [ ] Owner approves each first public post at action time.

Video 1 staging was verified on September 30, 2026. TikTok has the 1080×1920 source, final caption, public visibility, comments enabled, reuse disabled, brand disclosure enabled, AI disclosure enabled, and a clean content-check result. Instagram has the same 9:16 source, custom cover, final caption, AI label enabled, like/view counts visible, and comments enabled. Neither composer has been submitted. The owner correctly identified that the staged source is inaudible; `scripts/render-social-videos.ps1` confirms it was deliberately built with `anullsrc`. Both drafts are therefore held. Three audible review masters were rendered locally with original narration at `output/video/*-voiced.mp4`; FFprobe verifies 20-second H.264/AAC files with 48 kHz stereo audio, and volume analysis reports approximately -20.5 dB mean / -4.5 dB peak. Listening approval and replacement of the staged drafts remain required.

## Controlled first paid test

- [x] Current application test suite passes: 140/140 tests on October 2, 2026, including the narrated-asset integrity checks, first-test budget gates, every approved Meta/TikTok campaign source-and-creative combination, and rejection of arbitrary attribution/query data.
- [x] Live paid-launch verifier passes: 54/54 production checks against `https://foodmyway.app` on September 30, 2026, reverified after the paid-social attribution tests; coverage includes the $19 Survival Kit page, Stripe configuration, authentication, protected download, refund/legal copy, telemetry, and public/API routes.
- [x] Meta and TikTok campaign names, budgets, targeting, placements, links, and stop rules documented.
- [x] Machine-readable paid-test controls in `SOCIAL_AD_TEST_MANIFEST.json` lock the three-day $45 Meta / $90 TikTok / $135 combined caps, disable tracking and automation, bind the narrated creative allowlist, and keep dates, payment methods, and publication unapproved.
- [x] A consolidated, approval-gated build and monitoring sequence is documented in `SOCIAL_PAID_TEST_RUNBOOK.md`.
- [x] A privacy-minimized results and decision tracker is ready in `SOCIAL_TEST_SCORECARD.md`.
- [x] Representative Meta and TikTok production URLs returned HTTP 200 with the Food My Way app shell and Survival Kit route.
- [x] Maximum planned test is $135: Meta $45 plus TikTok $90.
- [x] Third-party pixels, customer lists, child information, and food-preference targeting are excluded from test one.
- [ ] Organic-signal gate satisfied.
- [ ] Campaign drafts built in both platforms and review screens audited. TikTok currently blocks draft creation until its advertising-account contract takes effect.
- [ ] Owner approves the exact payment methods and publication at action time.

## Go/no-go decision

**NOT YET READY FOR THE CONTROLLED ORGANIC SOFT LAUNCH OR PAID CAMPAIGN PUBLICATION.** The product funnel, $19 Survival Kit, fulfillment, analytics, three visual creatives, Instagram identity, Meta ownership, and TikTok identity/security are verified. The staged Video 1 source is silent and cannot be approved for launch in its current form. Remaining organic-launch gates are audible launch masters, replacement/re-staging on TikTok and Instagram, Facebook PFP/username/website/About QA, TikTok's mobile website-field audit, staging Facebook plus Videos 2–3, and owner approval immediately before the first public posts.

Paid launch remains gated by real organic response, campaign review screens, exact payment-method approval, and TikTok's advertiser-contract activation. Business verification is optional at this stage. Do not attach payment methods, publish campaigns, accept TikTok's $280 rebate offer, or spend any money without the owner's action-time approval.
