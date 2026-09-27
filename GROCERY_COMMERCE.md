# Grocery commerce integration

Updated: September 26, 2026

## Decision

Instacart Developer Platform is the first integration target. Its shopping-list and recipe APIs fit Food My Way directly: the app sends ingredient names and measurements, receives a hosted Instacart Marketplace URL, and the customer chooses a local store before adding matched products to a cart for pickup or delivery.

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

## Launch order

1. Complete subscription and retention validation with the existing grocery list.
2. Apply for Instacart Developer Platform access.
3. Configure a development key as a Cloudflare secret.
4. Test at least 25 representative lists, especially user-entered ingredient names.
5. Add the exact approved Instacart CTA design and wording.
6. Record the integration demonstration required for production approval.
7. Request a production key.
8. Apply separately to the Impact affiliate program and verify attribution.

## Product behavior

The future action is **Shop ingredients**, placed at the top of the generated grocery list. The customer must review product matches, quantities, prices, substitutions, pickup/delivery availability, and the final cart on Instacart. Food My Way must not imply that it sells groceries or guarantees availability or delivery speed.

## Revenue model

Grocery commissions are supplemental revenue, not the core business. Subscription revenue pays for the product; attributed grocery orders can improve revenue per active household without putting ads inside recipe decisions.

## Do not do

- Do not expose the API key in `app.js` or any browser-visible file.
- Do not automatically place or purchase an order.
- Do not claim “free delivery” or a delivery time.
- Do not describe Instacart as a Food My Way partner unless contract language permits it.
- Do not enable the CTA until ingredient matching and required brand treatment pass review.
