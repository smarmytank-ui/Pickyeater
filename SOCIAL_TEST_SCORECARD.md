# Food My Way controlled social test scorecard

Use this sheet only after the organic-signal gate in `SOCIAL_LAUNCH_PACK.md` is satisfied and the owner approves the exact payment methods and campaign publication. Stripe is authoritative for purchases and refunds; platform dashboards are directional.

## Preflight record

| Item | Value |
|---|---|
| Decision date | |
| Organic signal that unlocked the test | |
| Meta payment method approved by owner | No |
| TikTok payment method approved by owner | No |
| Meta scheduled maximum | $45 |
| TikTok scheduled maximum | $90 |
| Combined scheduled maximum | $135 |
| Stripe live checkout reverified | No |
| Survival Kit fulfillment reverified | No |
| Pixel/SDK/customer-list targeting absent | No |

## Creative results

Enter cumulative totals from the platform dashboards and Food My Way's first-party events. Use one row per platform and creative.

| Platform | Creative | Spend | Impressions | Video views | Link clicks | Landing-page views | Checkout starts | Stripe purchases | Refunds | Support failures | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Meta | Four familiar foods | | | | | | | | | | |
| Meta | Taco swap | | | | | | | | | | |
| Meta | Picky adults | | | | | | | | | | |
| TikTok | Four familiar foods | | | | | | | | | | |
| TikTok | Taco swap | | | | | | | | | | |
| TikTok | Picky adults | | | | | | | | | | |

## Calculations

- Click-through rate = link clicks ÷ impressions.
- Landing-page rate = landing-page views ÷ link clicks.
- Checkout-start rate = checkout starts ÷ landing-page views.
- Purchase conversion rate = Stripe purchases ÷ landing-page views.
- Cost per checkout start = spend ÷ checkout starts.
- Cost per confirmed purchase = spend ÷ Stripe purchases.
- Refund rate = refunds ÷ Stripe purchases.
- Blended cost per purchase = combined Meta and TikTok spend ÷ combined Stripe purchases.

Treat any division by zero as “not enough evidence,” not as zero performance.

## Daily control log

| Date/time PT | Platform | Spend to date | What was checked | Action | Owner approval required? |
|---|---|---:|---|---|---|
| | | | | | |

## Stop and decision rules

1. Pause a creative only after at least 1,000 impressions if it has no meaningful clicks.
2. Do not increase budgets automatically or accept platform budget/rebate recommendations.
3. Do not exceed $45 on Meta, $90 on TikTok, or $135 combined without a new owner approval.
4. Stop immediately for a broken checkout, failed paid download, unexpected personal-data collection, or material support issue.
5. After three complete days, do not extend automatically.
6. If Stripe shows no confirmed purchases, stop and revise the offer or landing page before purchasing more traffic.
7. If at least one purchase and fulfillment both succeed, calculate blended cost per purchase and review qualitative comments before proposing test two.

## Final decision

| Question | Answer |
|---|---|
| Did Stripe confirm at least one non-owner purchase? | |
| Did every buyer receive the protected download? | |
| Was blended cost per purchase acceptable relative to the $19 price? | |
| Were refunds or support failures material? | |
| Which hook won, and on what evidence? | |
| Decision: stop, revise, or propose test two | |

