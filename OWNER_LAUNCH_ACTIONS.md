# Food My Way — actions only the owner can complete

Everything below requires your personal account authentication, legal identity, banking/tax information, policy approval, or acceptance of third-party commercial terms. Deployment configuration, database bindings, secrets, verification commands, and product code are handled by the deployment operator once access is available.

## 1. Cloudflare and domains

- Sign in to Cloudflare and Namecheap when prompted and complete any personal authentication or one-time-code challenge.
- Approve a registrar or DNS ownership confirmation if either provider explicitly requires the domain owner to do so.

## 2. Seller and support identity

- Provide the legal person or company selling Food My Way, its public business/mailing address, and governing jurisdiction.
- Name the existing inbox that should receive mail sent to `support@foodmyway.app`.
- Approve the recommended 14-day refund policy and founding-offer definition in `LEGAL_LAUNCH_PACKET.md`.

## 3. Stripe

- Complete identity, bank-account, tax, and seller-profile onboarding.
- Accept Stripe's commercial terms.
- Approve the USD $29 one-time product and the receipt-facing seller name.

## 4. Transactional email

- Create or approve the Resend account and accept its terms.
- Complete any account-ownership or domain-ownership confirmation that Resend requires personally.
- Approve `Food My Way <login@foodmyway.app>` or another verified sender.

## 5. Later grocery-commerce enrollment

- Accept Instacart Developer Platform terms and request production access.
- Enroll in the Impact affiliate program if desired and provide tax/payout details.

No app-store enrollment is recommended until web retention data justifies native packaging.

You do **not** need to create D1 databases, bindings, API secrets, DNS records, webhook endpoints, redirect rules, deployment settings, or verification scripts manually. Those are deployment-operator tasks after the corresponding account session and commercial approvals are available.
