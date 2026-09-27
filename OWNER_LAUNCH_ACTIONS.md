# Food My Way — actions only the owner can complete

Everything below requires your personal account authentication, legal identity, banking/tax information, policy approval, or acceptance of third-party commercial terms. Deployment configuration, database bindings, secrets, verification commands, and product code are handled by the deployment operator once access is available.

## 1. Cloudflare and domains

- [x] Cloudflare and Namecheap authentication completed.
- [x] `foodmyway.app` connected to the production deployment.
- [x] `pickyeatercookbook.com` and its `www` hostname configured as canonical redirects to `https://foodmyway.app`.

No additional domain action is currently required from the owner.

## 2. Seller and support identity

- Provide the legal person or company selling Food My Way, its public business/mailing address, and governing jurisdiction.
- Name the existing inbox that should receive mail sent to `support@foodmyway.app`.
- Approve the recommended 14-day refund policy and founding-offer definition in `LEGAL_LAUNCH_PACKET.md`.

## 3. Stripe

- Complete identity, bank-account, tax, and seller-profile onboarding.
- Accept Stripe's commercial terms.
- Approve the USD $29 one-time product and the receipt-facing seller name.
- Configure one item per checkout, no promotion codes, metadata `offer=food_my_way_founding`, and Stripe's `completed_sessions.limit` restriction at exactly `250`.
- Decide whether to enable Stripe Tax. The webhook now accepts applicable tax above the exact $29 subtotal and rejects discounts or a different subtotal.

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

The strict production gate currently passes 33 checks and fails 10. Those failures require only these four owner inputs:

1. Seller identity, mailing address, governing jurisdiction, and approval of the 14-day refund/founding terms.
2. Completed Stripe onboarding and approval of the $29 one-time offer described above.
3. Resend enrollment plus approval of `Food My Way <login@foodmyway.app>` as the account-email sender.
4. The destination inbox that should receive `support@foodmyway.app` mail.

After those inputs, the deployment operator can publish the approved legal pages, add the Stripe and Resend secrets, configure the webhook and Payment Link, enable accounts and premium enforcement, and run the purchase/refund/account lifecycle without further domain or infrastructure work from the owner.
