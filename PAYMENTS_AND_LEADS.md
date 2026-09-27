# Payments and founding leads

Updated: September 26, 2026

## Founding checkout

Food My Way is prepared for a Stripe Payment Link priced at **$29 one time**. No secret Stripe key belongs in this repository.

After the owner completes Stripe identity, banking, tax, refund, and business-profile setup:

1. Create a one-time product named `Food My Way Founding Member` for USD $29.
2. Limit public availability to the first 250 purchases operationally or with Stripe inventory/automation.
3. Collect the customer email in Checkout.
4. Link Stripe’s privacy and terms fields to `https://foodmyway.app/privacy.html` and `https://foodmyway.app/terms.html`.
5. Set the success URL to `https://foodmyway.app/?founding=success` and the cancel URL to `https://foodmyway.app/#pricing`.
6. Put the resulting `https://buy.stripe.com/...` URL in `config.js` as `founderCheckoutUrl`.
7. Set Payment Link metadata `offer=food_my_way_founding`. The webhook intentionally ignores any checkout without this exact marker.

Stripe documents that metadata on a Payment Link is copied to the Checkout Sessions it creates: https://docs.stripe.com/api/payment-link/object

The app accepts only `buy.stripe.com` or `checkout.stripe.com` HTTPS URLs, preventing an accidental or malicious arbitrary checkout redirect.

## Payment fulfillment

`POST /api/stripe-webhook` verifies Stripe's signed raw request before recording access. It accepts only a paid, one-time USD $29 Checkout Session carrying the founding-offer metadata above. Duplicate events are safe to replay.

1. Create a D1 database and run `migrations/0002_purchase_entitlements.sql` and `migrations/0006_refund_tombstones.sql` in order.
2. Bind it to the Pages project as `PURCHASES` in production.
3. Add `/api/stripe-webhook` as a Stripe webhook endpoint.
4. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`.
5. Save its signing secret as the encrypted Pages secret `STRIPE_WEBHOOK_SECRET`.
6. Use Stripe test mode to confirm a $29 purchase produces one active `founding` entitlement.

The browser success redirect is never treated as proof of purchase. Stripe recommends server-side webhook fulfillment because customers may not return to the landing page after payment.

A full Stripe refund changes the matching entitlement to `refunded`. Partial refunds do not remove access automatically and must be reviewed by support. The refund is also retained as a payment-intent tombstone so a delayed or replayed checkout event cannot restore access, even if Stripe delivers the refund first. Any legitimate repurchase after a refund requires a new Payment Intent and normal support review.

When cloud accounts are enabled, `GET /api/auth/session` looks up an active entitlement by the normalized signed-in email. The account UI then displays “Founding member,” and the optional premium gate recognizes that access. Customers must sign in using the same email used at Stripe Checkout; support handles legitimate email changes.

## Founding-interest storage

`POST /api/founding-interest` is a Cloudflare Pages Function. It requires a D1 binding named `LEADS`. Until that binding exists, the endpoint fails closed and the browser tells the user that interest is saved only on that device.

Cloudflare setup:

1. Create a D1 database for Food My Way leads.
2. Run `migrations/0001_founding_leads.sql` against it.
3. Bind the database to the Pages project as `LEADS` in preview and production.
4. Deploy, submit a test email with explicit consent, and verify one row.
5. Configure a compliant email provider before sending marketing mail.
6. Save a random secret of at least 32 characters as the encrypted Pages secret `LEADS_UNSUBSCRIBE_SECRET`.
7. Run `migrations/0005_founding_unsubscribe.sql`. For pre-existing active leads, generate the recipient token with `createFoundingUnsubscribeToken(email, secret)` and backfill `unsubscribe_token` before any campaign.
8. For every outgoing marketing message, use the row's opaque token in `https://foodmyway.app/api/founding-unsubscribe?token=TOKEN`.
9. Configure the email provider's `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers to POST to that same signed URL.
10. Test both the confirmation page and one-click POST. Either path must set `consent=0` and `status='unsubscribed'` before the first broadcast.

Unsubscribe links use opaque HMAC tokens bound to normalized email addresses. The email itself never appears in the URL. The secret stays server-side; never put it in `config.js`, a client bundle, or a campaign export.

## Required owner actions

The owner must personally complete Stripe onboarding because it involves legal identity, banking, tax information, and acceptance of financial terms. The owner must also approve the final refund language and identify the legal seller displayed on receipts.

## Founding offer guardrails

- Do not promise that every future Food My Way product is included.
- Define lifetime access as access for the commercial lifetime of the Food My Way premium product.
- State which current and announced premium features are included.
- Honor the price for founding customers even if standard pricing changes.
- Publish support and refund handling before accepting payment.
