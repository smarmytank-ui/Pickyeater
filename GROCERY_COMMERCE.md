# Grocery commerce integration

Updated: September 27, 2026

## Decision

Instacart Developer Platform is the first integration target. Its shopping-list and recipe APIs fit Food My Way directly: the app sends ingredient names and measurements, receives a hosted Instacart Marketplace URL, and the customer chooses a local store before adding matched products to a cart for pickup or delivery.

The customer promise is retailer-neutral: **turn this recipe or this week into a grocery cart for pickup or delivery**. Instacart is the first fulfillment adapter, not the product identity. Keep normalized grocery items inside Food My Way and isolate provider-specific payloads in server modules so another approved retailer, aggregator, or regional partner can be added without rebuilding recipes or the planner.

Primary documentation:

- https://docs.instacart.com/developer_platform_api
- https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page
- https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/pre-launch_checklist
- https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/conversions_and_payments/

## Architecture

The browser must never receive the Instacart API key. `POST /api/shop` is a Cloudflare Pages Function that:

1. validates the Food My Way grocery list;
2. converts recipe units to Instacart-supported measurements;
3. calls Instacart from the server;
4. returns only the hosted shopping-list URL;
5. verifies that the returned URL is on an Instacart domain.

The endpoint safely returns HTTP 503 until `INSTACART_API_KEY` is configured. `INSTACART_ENV` must remain non-production during development and be set to `production` only after Instacart approval.

The endpoint also authenticates the Food My Way session and verifies an active Founding entitlement against `PURCHASES` before reading or transmitting a grocery list. The browser premium gate is conversion UI, not authorization; direct anonymous, free-account, and refunded-account requests fail closed on the server.

## Launch order

1. Complete subscription and retention validation with the existing grocery list.
2. Apply for Instacart Developer Platform access.
3. Configure a development key as a Cloudflare secret.
4. Run the 25-list local payload suite, then test those same fixtures against Instacart's development catalog and manually review product matches.
5. Add the exact approved Instacart CTA design and wording.
6. Verify that the generated cart preserves quantities, lets the customer choose a local store, and clearly hands final substitutions and checkout to the provider.
7. Record the integration demonstration required for production approval.
8. Request a production key.
9. Apply separately to the Impact affiliate program and verify attribution.
10. After demand is proven, evaluate a second provider against coverage, pickup support, attribution, API stability, and brand restrictions before adding another adapter.

## Product behavior

The feature-flagged action is **Shop ingredients**, placed at the top of the generated grocery list. It is visible only when `commerceEnabled` is true. Checked-off items are treated as already handled and are excluded from the provider handoff; when every item is checked, the action is disabled. Before transmission, the customer confirms that the remaining grocery list will be sent to Instacart. The customer must review product matches, quantities, prices, substitutions, pickup/delivery availability, and the final cart on Instacart. Food My Way does not imply that it sells groceries or guarantees availability or delivery speed.

`SHOP_LINKBACK_ORIGIN` is a required server setting. The API ignores browser-supplied linkbacks so an attacker cannot use the Food My Way credential to generate Instacart pages that link to an arbitrary site. Set it to the private preview origin during development and `https://foodmyway.app` in production.

Instacart documents pantry-item controls only for recipe links, so Food My Way does not send `enable_pantry_items` on its shopping-list payload.

Do not change `commerceEnabled` to true until the CTA wording/brand treatment is approved and all 25 fixtures have passed live development-catalog review.

## Revenue model

Grocery commissions are supplemental revenue, not the core business. Subscription revenue pays for the product; attributed grocery orders can improve revenue per active household without putting ads inside recipe decisions.

The commerce feature itself is a premium retention benefit: a free customer can discover a useful meal, while a paid household can move from saved recipes and a weekly plan to one consolidated shopping handoff. Do not promise commission income until an affiliate agreement is approved and tracked conversions have been reconciled with provider reporting.

## Paid-product rollout

The customer outcome is **recipe to local cart**, not merely a grocery-list export. Build it in three measured stages:

1. **Recipe cart:** the feature-flagged **Shop this recipe** action sends the currently open recipe at its selected serving count to the grocery provider after explicit confirmation.
2. **Weekly cart:** consolidate planned recipes, combine duplicate ingredients, and let the customer remove pantry items before the handoff.
3. **Household convenience:** remember non-sensitive shopping preferences locally, surface pickup or delivery as choices on the provider page, and add another approved provider only where coverage materially improves.

The provider remains responsible for retailer selection, product matching, availability, pricing, substitutions, fulfillment windows, checkout, payment, pickup, and delivery. Food My Way must never imply that a generated recipe has already been purchased or that every ingredient is available locally.

Measure `grocery_shop_started`, successful link creation, provider click-through, and—only when contractually available—attributed orders and commission. Compare paid retention for households that use commerce with those that do not. Keep the feature only if it improves retention or produces meaningful, reconciled contribution margin after support costs.

## Do not do

- Do not expose the API key in `app.js` or any browser-visible file.
- Do not automatically place or purchase an order.
- Do not claim “free delivery” or a delivery time.
- Do not describe Instacart as a Food My Way partner unless contract language permits it.
- Do not enable the CTA until ingredient matching and required brand treatment pass review.
