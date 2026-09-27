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
- Provide the governing jurisdiction for the Terms of Use.
- [x] `support@foodmyway.app` routes to the owner's verified Gmail inbox and passed a live delivery test.
- Approve the recommended 14-day refund policy and founding-offer definition in `LEGAL_LAUNCH_PACKET.md`.

## 3. Stripe

- [x] Stripe onboarding submitted for **TP Biz Op LLC** with `support@foodmyway.app`, two-factor authentication, statement descriptor `FOOD MY WAY`, and the supplied business address.
- [x] Stripe's commercial terms accepted during account activation.
- [x] USD $29 one-time **Food My Way Founding Member** product created under the receipt-facing seller name **Food My Way**.
- [x] Payment Link configured for one item per checkout, no promotion codes, metadata `offer=food_my_way_founding`, and exactly 250 completed sessions.
- [x] Stripe Tax automatic collection enabled. The webhook accepts applicable tax above the exact $29 subtotal and rejects discounts or a different subtotal.
- [x] Production webhook created for completed payments, delayed-payment success, and full refunds; its signing secret is stored as an encrypted Cloudflare production secret.

## 4. Transactional email

- Create or approve the Resend account and accept its terms.
- Complete any account-ownership or domain-ownership confirmation that Resend requires personally.
- Approve `Food My Way <login@foodmyway.app>` or another verified sender.

## 5. Later grocery-commerce enrollment

- Accept Instacart Developer Platform terms and request production access.
- Enroll in the Impact affiliate program if desired and provide tax/payout details.

No app-store enrollment is recommended until web retention data justifies native packaging.

You do **not** need to create D1 databases, bindings, API secrets, DNS records, webhook endpoints, redirect rules, deployment settings, or verification scripts manually. Those are deployment-operator tasks after the corresponding account session and commercial approvals are available.

## Exact paid-launch handoff

The remaining owner-only inputs are:

1. Governing jurisdiction and approval of the 14-day refund/founding terms.
2. Resend enrollment plus approval of `Food My Way <login@foodmyway.app>` as the account-email sender.

After those inputs, the deployment operator can publish the approved legal pages, add the Resend secret, enable accounts and premium enforcement, and run the purchase/refund/account lifecycle without further domain or infrastructure work from the owner.
