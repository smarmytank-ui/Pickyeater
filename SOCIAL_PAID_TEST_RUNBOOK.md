# Food My Way controlled paid-test runbook

Updated: September 30, 2026

This runbook prepares the first Meta and TikTok advertising test. It does not authorize adding a payment method, accepting a promotional offer, publishing a campaign, or spending money. Those actions require the owner's explicit confirmation at the final review screen.

## Launch gate

Do not build or publish the paid test until all of the following are true:

- [ ] At least one approved narrated organic video is public.
- [ ] The organic test produces at least one approved signal: 100 landing-page visits, a 2% profile/site visit rate, or five relevant meal/swap/link requests.
- [ ] The live Survival Kit page, $19 Stripe checkout, protected fulfillment, support address, terms, privacy notice, and 14-day refund policy are reverified.
- [ ] Meta Page profile image, username, website, About information, administrator access, and passkey status are reconciled.
- [ ] TikTok advertising-account contract is active.
- [ ] Every destination URL has been opened in a real browser and retains its UTM parameters.
- [ ] The owner has reviewed the exact campaign review screens.

## Privacy and automation boundaries

- Do not install a Meta Pixel, TikTok Pixel, SDK, or conversion API for test one.
- Do not upload customer lists or use lookalike audiences.
- Do not use child information, food preferences, medical conditions, diagnoses, or other sensitive interests for targeting.
- Do not enable automated audience expansion, automated creative modification, automatic placements outside the listed surfaces, budget increases, or campaign extensions.
- Use Food My Way's privacy-minimized first-party events for landing-page and checkout-start direction; use Stripe as the authoritative purchase and refund source.
- Never paste passwords, one-time codes, recovery codes, API keys, card data, or banking data into this file.

## Meta draft specification

| Field | Exact value |
|---|---|
| Ad account | Food My Way Ads (`1748503076238751`) |
| Campaign | `FMW_SURVIVAL_KIT_TEST1_META` |
| Objective | Traffic |
| Buying type | Auction |
| Campaign budget | Off |
| Ad set | `FMW_BROAD_US_25_54_3DAY` |
| Location | United States |
| Age | 25–54 |
| Gender | All |
| Detailed targeting | None |
| Custom/lookalike audiences | None |
| Placements | Facebook Feed, Facebook Reels, Instagram Feed, Instagram Reels |
| Optimization | Landing-page views when available; otherwise link clicks |
| Budget | $15/day for exactly 3 days; expected maximum $45 |
| Automatic expansion | Off |
| Payment method | Do not add until owner approves the exact method |

Ads and destinations:

| Ad | Creative | Destination |
|---|---|---|
| `FMW_FOUR_SAFE_FOODS` | Approved narrated Four Familiar Foods master | `https://foodmyway.app/survival-kit?utm_source=meta&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=four_safe_foods` |
| `FMW_TACO_SWAP` | Approved narrated Taco Swap master | `https://foodmyway.app/survival-kit?utm_source=meta&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=taco_swap` |
| `FMW_PICKY_ADULTS` | Approved narrated Picky Adults master | `https://foodmyway.app/survival-kit?utm_source=meta&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=picky_adults` |

## TikTok draft specification

| Field | Exact value |
|---|---|
| Advertiser | `7691373556810366996` |
| Campaign | `FMW_SURVIVAL_KIT_TEST1_TIKTOK` |
| Objective | Traffic |
| Campaign budget optimization | Off |
| Ad group | `FMW_BROAD_US_25_54_3DAY` |
| Location | United States |
| Age | 25–54 using the closest non-minor ranges TikTok offers |
| Gender | All |
| Interests/behaviors | None |
| Custom/lookalike audiences | None |
| Placement | TikTok only |
| Optimization | Landing-page views when available; otherwise clicks |
| Budget | $30/day for exactly 3 days; expected maximum $90 |
| Automated targeting/creative | Off |
| Promotional rebate | Decline the observed $280 offer |
| Payment method | Do not add until owner approves the exact method |

Ads and destinations:

| Ad | Creative | Destination |
|---|---|---|
| `FMW_FOUR_SAFE_FOODS` | Approved narrated Four Familiar Foods master | `https://foodmyway.app/survival-kit?utm_source=tiktok&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=four_safe_foods` |
| `FMW_TACO_SWAP` | Approved narrated Taco Swap master | `https://foodmyway.app/survival-kit?utm_source=tiktok&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=taco_swap` |
| `FMW_PICKY_ADULTS` | Approved narrated Picky Adults master | `https://foodmyway.app/survival-kit?utm_source=tiktok&utm_medium=paid_social&utm_campaign=survival_kit_test1&utm_content=picky_adults` |

## Final review protocol

At each platform's final review screen, capture evidence showing:

- account and campaign names;
- objective and optimization event;
- location, age, gender, and absence of detailed/custom targeting;
- placements;
- all three creatives and destination URLs;
- start/end dates and account time zone;
- daily and scheduled maximum budgets;
- every automation/expansion setting;
- payment method, if one has been entered by the owner;
- final publish control.

Then stop. Ask the owner to approve the named platform, exact payment method, dates, and maximum amount. Meta and TikTok require separate approvals. Never treat approval of one platform as approval of the other.

## Monitoring protocol

1. Record launch time and owner approval in `SOCIAL_TEST_SCORECARD.md`.
2. Check the landing page, checkout, protected download, and support inbox immediately after launch.
3. Record platform spend and first-party/Stripe results at least once per day without collecting customer content or identity.
4. Pause a creative only after 1,000 impressions if it has no meaningful clicks.
5. Stop immediately for broken checkout, failed fulfillment, unexpected personal-data collection, or a material support issue.
6. Do not exceed $45 Meta, $90 TikTok, or $135 combined.
7. Stop after three complete days. Do not extend or raise budgets automatically.
8. If there is no confirmed Stripe purchase, revise the offer or landing page before buying more traffic.
9. If there is a confirmed non-owner purchase and successful fulfillment, calculate blended cost per purchase and propose—but do not launch—test two.

