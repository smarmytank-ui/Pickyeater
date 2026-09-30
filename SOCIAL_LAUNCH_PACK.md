# Food My Way Survival Kit social launch pack

Updated: September 30, 2026

## Brand and accounts

Use **Food My Way** as the brand on every platform. “Picky eater” describes the audience and the $19 Survival Kit; it is not a second app name.

Preferred account names:

- TikTok: `@foodmywayapp`
- Instagram: `@foodmywayapp`
- Facebook Page: `Food My Way`

Fallback handle, used consistently if needed: `@tryfoodmyway`.

Profile bio:

> Start with foods you already like. Flexible recipes, simple swaps, and less mealtime stress. Try the app free ↓

Primary profile link during this campaign:

`https://foodmyway.app/survival-kit?utm_source=PLATFORM&utm_campaign=survival_kit_launch&utm_content=CREATIVE`

Replace `PLATFORM` with `tiktok`, `instagram`, or `facebook`. Replace `CREATIVE` with the code listed below.

## Video 1 - Four familiar foods

File: `output/video/01-four-safe-foods.mp4`

Cover: `output/video/covers/01-four-safe-foods-cover.png`

Creative code: `four_safe_foods`

On-screen hook: **Four familiar foods. One realistic dinner.**

Caption:

> Chicken, potatoes, cheddar, and broccoli do not need to become a complicated recipe. Start with what already works, keep the pieces that matter, and change only what does not. Try Food My Way free or get the two-week Picky Eater Survival Kit at FoodMyWay.app.

CTA: **Try your four familiar foods at FoodMyWay.app.**

Suggested tags: `#PickyEater #EasyDinner #MealPlanning #FoodMyWay`

## Video 2 - Tacos without tomatoes

File: `output/video/02-tacos-without-tomatoes.mp4`

Cover: `output/video/covers/02-tacos-without-tomatoes-cover.png`

Creative code: `taco_swap`

On-screen hook: **Hate tomatoes? The tacos can stay.**

Caption:

> One disliked ingredient does not have to cancel the whole dinner. Keep the tortilla, filling, and cheese. Leave out the tomato. Food My Way helps you swap what does not work without starting over.

CTA: **Build the version that works for you.**

Suggested tags: `#IngredientSwap #TacoNight #PickyEating #FoodMyWay`

## Video 3 - Picky adults

File: `output/video/03-picky-adults.mp4`

Cover: `output/video/covers/03-picky-adults-cover.png`

Creative code: `picky_adults`

On-screen hook: **Picky eating does not magically end at 18.**

Caption:

> Adults deserve private, practical meal ideas without judgment too. Start with foods you actually like, keep textures predictable, and make the meal your way.

CTA: **Try Food My Way free.**

Suggested tags: `#PickyAdult #SensoryFriendly #EasyMeals #FoodMyWay`

## Posting sequence

1. Post Video 1 to TikTok and Instagram Reels on day 1; post the same file to Facebook Reels only after the Food My Way Page is ready.
2. Post Video 2 on day 3.
3. Post Video 3 on day 5.
4. Reply to useful comments during the first 24 hours without making medical claims or promising acceptance.
5. On day 7, compare landing-page views, checkout starts, app clicks, watch time, and comments asking for specific foods.
6. Make the next three videos from the winning hook rather than inventing a new format.

The files contain a silent audio track so each platform can add an appropriate native or licensed sound without copyright risk. Do not add unlicensed music outside the platform.

## Technical validation

Validated locally on September 30, 2026 with FFprobe. All three production files are ready for vertical short-form upload:

| File | Duration | Frame | Video | Audio | Size |
|---|---:|---:|---|---|---:|
| `01-four-safe-foods.mp4` | 20.0 s | 1080×1920 at 30 fps | H.264, yuv420p | AAC stereo, 48 kHz | 4,116,776 bytes |
| `02-tacos-without-tomatoes.mp4` | 20.0 s | 1080×1920 at 30 fps | H.264, yuv420p | AAC stereo, 48 kHz | 4,146,589 bytes |
| `03-picky-adults.mp4` | 20.0 s | 1080×1920 at 30 fps | H.264, yuv420p | AAC stereo, 48 kHz | 3,346,331 bytes |

These files use a 9:16 frame, broadly compatible codecs, and a short duration appropriate for Instagram Reels, Facebook Reels, and TikTok. Platform upload processing remains the final authoritative check.

The three PNG cover frames were extracted at the one-second mark and visually inspected. Use them as the selected cover where the platform permits a custom Reel/video cover; confirm the profile-grid crop before publishing.

## Controlled paid test

Do not boost immediately. First require at least one of these organic signals:

- a video produces 100 or more landing-page visits;
- at least 2% of viewers visit the profile or site;
- at least five viewers ask for a meal, swap, or link;
- at least one non-owner checkout starts.

Then run a **$135 validation test** that respects the platforms' different budget floors:

- **Meta: $45 total** — one broad ad set at $15 per day for three days, with all three creatives rotating across Instagram and Facebook placements;
- **TikTok: $90 total** — one broad ad group at $30 per day for three days, with all three creatives rotating in the ad group;
- United States only;
- adults 25-54 with broad targeting rather than sensitive health or diagnostic interests;
- traffic objective for the first privacy-minimized validation run, using the matching UTM link for each platform and creative;
- do not install Meta or TikTok tracking pixels for this first test; use Food My Way's first-party events and Stripe's authoritative purchase ledger;
- do not use customer food preferences or child information for ad targeting.

Pause a creative after at least 1,000 impressions if it has no meaningful clicks. Do not scale the campaign until the funnel records a real purchase and the buyer can successfully download the kit.

Primary decision metrics:

1. Purchase conversion rate from landing-page view.
2. Cost per confirmed purchase.
3. Checkout-start rate.
4. Food My Way app clicks from the kit page.
5. Refunds and support issues.

The $19 price leaves limited room for paid acquisition after Stripe fees and refunds. Treat the first spend as validation, not as a revenue forecast. Adding third-party conversion pixels is a separate privacy decision that requires consent controls and updated disclosures before scaling.

## Exact paid-test build sheet

Nothing in this section authorizes spend. Build the campaigns in draft, verify the review screen, and obtain the owner's confirmation immediately before publishing.

### Meta draft

- Campaign: `FMW_SK_TEST1_TRAFFIC_YYYYMMDD`
- Objective: Traffic
- Buying type: Auction
- Campaign budget: off; use the ad-set budget below
- Special Ad Categories: none
- Ad set: `US_25-54_BROAD_3D`
- Geography: United States
- Age: 25–54
- Gender: all
- Detailed targeting: none
- Placements: Advantage+ placements, limited to Facebook and Instagram surfaces; exclude Audience Network if it is offered
- Optimization: landing-page views when available; otherwise link clicks
- Schedule: three complete 24-hour periods
- Budget: $15/day; expected maximum scheduled budget $45
- Ads:
  - `FMW_FOUR_SAFE_FOODS` → `https://foodmyway.app/survival-kit?utm_source=meta&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=four_safe_foods`
  - `FMW_TACO_SWAP` → `https://foodmyway.app/survival-kit?utm_source=meta&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=taco_swap`
  - `FMW_PICKY_ADULTS` → `https://foodmyway.app/survival-kit?utm_source=meta&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=picky_adults`

### TikTok draft

- Campaign: `FMW_SK_TEST1_TRAFFIC_YYYYMMDD`
- Objective: Traffic
- Campaign budget optimization: off; use the ad-group budget below
- Ad group: `US_25-54_BROAD_3D`
- Geography: United States
- Age: use the available adult bands that most closely cover 25–54
- Gender: all
- Interests/behaviors: none
- Placement: TikTok only
- Optimization: landing-page view when available; otherwise click
- Schedule: three complete 24-hour periods
- Budget: $30/day; expected maximum scheduled budget $90
- Ads:
  - `FMW_FOUR_SAFE_FOODS` → `https://foodmyway.app/survival-kit?utm_source=tiktok&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=four_safe_foods`
  - `FMW_TACO_SWAP` → `https://foodmyway.app/survival-kit?utm_source=tiktok&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=taco_swap`
  - `FMW_PICKY_ADULTS` → `https://foodmyway.app/survival-kit?utm_source=tiktok&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=picky_adults`

### Pre-publish gate

- [ ] Organic-signal gate above has been satisfied and recorded.
- [ ] Every ad previews correctly in all enabled placements with no cropped headline or CTA.
- [ ] Each destination opens the live Survival Kit page and retains all UTM parameters.
- [ ] Stripe live mode, fulfillment, receipt, download link, and 14-day refund copy have been rechecked.
- [ ] No pixel, SDK, customer list, child information, or food-preference data is attached to targeting.
- [ ] Automated creative, targeting, audience expansion, and budget-increase options are disabled unless explicitly documented.
- [ ] Start/end dates, time zone, daily budgets, and the combined $135 expected maximum are visible on the review screens.
- [ ] Owner confirms the exact payment method and publication of both campaigns at action time.

Link validation performed September 30, 2026: representative Meta and TikTok URLs above each returned HTTP 200 from production with the Food My Way application shell and Survival Kit route present. Neither request encountered a server-side redirect, so its UTM query was not stripped in transit. Recheck in a real browser immediately before publication because client-side behavior and deployment state can change.

### Decision rule after three days

- Do not extend the test automatically.
- Record spend, impressions, video views, landing-page views, checkout starts, confirmed purchases, refunds, and support failures by platform and creative.
- A purchase must be confirmed in Stripe; platform-reported conversions are not authoritative.
- If there are no purchases, stop and revise the offer or landing page before buying more traffic.
- If there is at least one verified purchase and fulfillment succeeds, calculate blended cost per purchase and review qualitative comments before deciding on a second test.
