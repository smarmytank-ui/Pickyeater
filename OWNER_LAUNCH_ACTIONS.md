# Food My Way — actions only the owner can complete

Everything below requires your personal account authentication, legal identity, banking/tax information, policy approval, or acceptance of third-party commercial terms. Deployment configuration, database bindings, secrets, verification commands, and product code are handled by the deployment operator once access is available.

## 1. Cloudflare and domains

- [x] Cloudflare and Namecheap authentication completed.
- [x] `foodmyway.app` connected to the production deployment.
- [x] `pickyeatercookbook.com` and its `www` hostname configured as canonical redirects to `https://foodmyway.app`.

No additional domain action is currently required from the owner.

## 2. Seller and support identity

- [x] Legal seller supplied: **TP Biz Op LLC, doing business as Food My Way**.
- [x] Public business/mailing address supplied: **22365 El Toro Road, Unit 2088, Lake Forest, CA 92630**.
- [x] California approved as the governing jurisdiction for the Terms of Use.
- [x] `support@foodmyway.app` routes to the owner's verified Gmail inbox and passed a live delivery test.
- [x] Recommended 14-day refund policy and founding-offer definition approved on September 27, 2026.

## 3. Stripe

- [x] Stripe onboarding submitted for **TP Biz Op LLC** with `support@foodmyway.app`, two-factor authentication, statement descriptor `FOOD MY WAY`, and the supplied business address.
- [x] Stripe's commercial terms accepted during account activation.
- [x] USD $29 one-time **Food My Way Founding Member** product created under the receipt-facing seller name **Food My Way**.
- [x] Payment Link configured for one item per checkout, no promotion codes, metadata `offer=food_my_way_founding`, and exactly 250 completed sessions.
- [x] Stripe Tax automatic collection enabled. The webhook accepts applicable tax above the exact $29 subtotal and rejects discounts or a different subtotal.
- [x] Production webhook created for completed payments, delayed-payment success, and full refunds; its signing secret is stored as an encrypted Cloudflare production secret.
- [x] Checkout requires acceptance of the published Food My Way Terms of Service and links both the Terms and Privacy pages.

## 4. Transactional email

- [x] Resend account creation and its terms approved on September 27, 2026.
- [x] `foodmyway.app` domain ownership and transactional sending verified in Resend.
- [x] `Food My Way <login@foodmyway.app>` approved as the transactional sender.

## 5. Later grocery-commerce enrollment

- Accept Instacart Developer Platform terms and request production access.
- Enroll in the Impact affiliate program if desired and provide tax/payout details.

No app-store enrollment is recommended until web retention data justifies native packaging.

You do **not** need to create D1 databases, bindings, API secrets, DNS records, webhook endpoints, redirect rules, deployment settings, or verification scripts manually. Those are deployment-operator tasks after the corresponding account session and commercial approvals are available.

## Exact paid-launch handoff

On September 27, 2026, the approved legal pages were published, Resend domain authentication and live delivery passed, and the scanner-safe passwordless login completed successfully on `foodmyway.app`. Customer accounts are enabled in production. The live founding checkout is active at USD $29, limited to 250 completed payments, requires acceptance of the published Terms, and links the published Terms and Privacy pages.

No remaining owner-only domain, legal-copy, or transactional-email input blocks technical verification. Premium enforcement stays disabled until a controlled Stripe payment, entitlement lookup, full-refund revocation, and account-recovery lifecycle have all passed.
