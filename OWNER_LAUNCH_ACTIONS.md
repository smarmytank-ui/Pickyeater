# Food My Way — actions only the owner can complete

Everything below requires account login, legal identity, banking/tax information, domain control, or acceptance of third-party commercial terms. Product code and operating documentation are handled in the repository.

## 1. Cloudflare and domains

- Sign in to the existing Cloudflare account and leave the dashboard open for the deployment session.
- Authorize moving or connecting `foodmyway.app` and `PickyEaterCookbook.com` from Namecheap.
- If Namecheap requires authentication or a one-time code, complete it personally.

## 2. Seller and support identity

- Provide the legal person or company selling Food My Way, its public business/mailing address, and governing jurisdiction.
- Confirm the inbox that should receive `support@foodmyway.app`.
- Approve the recommended 14-day refund policy and founding-offer definition in `LEGAL_LAUNCH_PACKET.md`.

## 3. Stripe

- Complete identity, bank-account, tax, and seller-profile onboarding.
- Accept Stripe's commercial terms.
- Approve the USD $29 one-time product and the receipt-facing seller name.

## 4. Transactional email

- Create or approve the Resend account.
- Verify the sending domain and create the restricted API credential when prompted.
- Approve `Food My Way <login@foodmyway.app>` or another verified sender.
- Add the server-side `LEADS_UNSUBSCRIBE_SECRET` in Cloudflare and require the signed unsubscribe URL in every founding-list campaign.

## 5. Later grocery-commerce enrollment

- Accept Instacart Developer Platform terms and request production access.
- Enroll in the Impact affiliate program if desired and provide tax/payout details.

No app-store enrollment is recommended until web retention data justifies native packaging.
