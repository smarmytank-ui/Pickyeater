# Food My Way account ownership registry

Updated: October 2, 2026

This is an ownership and recovery index, not a password file. Never enter passwords, one-time codes, passkeys, recovery codes, API keys, webhook secrets, card data, bank information, identity-document numbers, or security-question answers here.

## How to use this registry

- `Login identity` may contain a business email or public username, but never a secret.
- `Private owner` identifies the legal or administrative owner without publishing the private administrator on a brand profile.
- `Recovery status` records only the method type and whether it was verified.
- `Vault reference` is the label of the matching item in the approved password manager. It is not the password itself.
- Update `Last audited` only after directly opening the account or its authoritative settings screen.
- Any ownership transfer, permission change, new administrator, recovery-method change, API key, payment method, public post, or ad launch requires the appropriate owner approval.

## Core business services

| Service | Public identity | Login identity | Private owner | Account / tenant identifier | Recovery status | Vault reference | Last audited | Open action |
|---|---|---|---|---|---|---|---|---|
| Google Workspace | `support@foodmyway.app` | Workspace administrator identity requires private owner audit | TP Biz Op LLC | `foodmyway.app` tenant | Support mailbox live; administrator recovery not recorded here | Owner to record privately | 2026-09-30 | Confirm primary administrator and recovery methods without copying secrets |
| Namecheap | Domain registrar only | Private owner account; exact login intentionally omitted pending audit | TP Biz Op LLC | `foodmyway.app`, `pickyeatercookbook.com` | Authenticated session previously verified; recovery audit pending | Owner to record privately | 2026-09-30 | Confirm registrar recovery email and 2FA method |
| Cloudflare | Food My Way infrastructure | Existing account session; exact login identity pending owner audit | TP Biz Op LLC | Account `4aea17af632a4607a8a0974c3729553e` | Session and billing method verified; recovery audit pending | Owner to record privately | 2026-09-30 | Record login identity, 2FA type, and private vault label |
| Stripe | Food My Way | `support@foodmyway.app` | TP Biz Op LLC | `acct_1UKOU3FKY5YgNIrM` | Two-factor authentication verified; private recovery details excluded | Owner to record privately | 2026-09-30 | Add payout bank account personally; never record banking data here |
| Resend | Food My Way transactional email | `support@foodmyway.app` | TP Biz Op LLC | Verified `foodmyway.app` sending domain | Account active; private recovery audit pending | Owner to record privately | 2026-09-30 | Record recovery method and vault label privately |
| FatSecret Platform | Food My Way food data | `support@foodmyway.app` | TP Biz Op LLC | Client/Consumer ID recorded in owner credential manager | Premier Free active with unlimited US-dataset access; OAuth 1.0 and OAuth 2.0 credentials active; restaurant/branded-food search and barcode lookup verified | Provider credential plus platform 2FA | 2026-10-02 | Consumer secret remains only in the encrypted Cloudflare secret store; never record it here. |

## Social and advertising services

| Service | Public identity | Login identity | Private owner | Account / tenant identifier | Recovery status | Vault reference | Last audited | Open action |
|---|---|---|---|---|---|---|---|---|
| Instagram | `@foodmywayapp` / Food My Way app | Durable business email; exact login method is private | TP Biz Op LLC through authentic human administrator | `17841419124020938` | Meta 2FA satisfied; private codes excluded | Owner to record privately | 2026-09-30 | Approve narrated launch content before Share |
| Facebook Page | Food My Way app | Private Facebook administrator | TP Biz Op LLC Meta portfolio | Public profile `61595078755170`; Page ID recorded by Meta as `1373971672467209` | Administrator login required; Instagram Settings-access request still pending | Owner to record privately | 2026-10-02 | Authenticate private Facebook administrator, reconcile the request, then replace the default PFP and finish username, website, and About |
| Meta Business Portfolio | TP Biz Op LLC | Private Facebook/Instagram administrator | TP Biz Op LLC | Business `2317309182358374` | 2FA satisfied; passkey requirement currently `No one`; Settings-access request pending since 2026-10-01 | Owner to record privately | 2026-10-02 | Approve or otherwise reconcile the pending Instagram Settings-access request from the private Facebook administrator session |
| Meta Ads | Food My Way Ads | Same private Meta administrator | TP Biz Op LLC | `1748503076238751` | Inherits Meta administrator security | Same Meta vault item | 2026-09-30 | No payment method or spend; build only after organic gate |
| TikTok | `@foodmyway.app` / FoodMyWay.app | `support@foodmyway.app` | TP Biz Op LLC | Public profile `@foodmyway.app` | Email and SMS two-step verification verified; current desktop browser session is `@1purpose_oc`, not Food My Way | Owner to record privately | 2026-10-02 | Switch/authenticate the dedicated Food My Way account before any upload; then audit website field, timed renames, and narrated first post |
| TikTok Business Center | Food My Way / TP Biz Op LLC | `support@foodmyway.app` | TP Biz Op LLC | Organization `7691373835622416405`; advertiser `7691373556810366996` | Email and SMS two-step verification verified | Same TikTok vault item unless provider separates credentials | 2026-09-30 | Wait for advertiser contract; no payment or spend |

## Quarterly ownership audit

Perform this audit every quarter and after any staff, phone, email, or device change:

- [ ] Every service is owned by TP Biz Op LLC or has a documented transfer plan.
- [ ] Every public profile displays only the correct brand identity.
- [ ] Every login uses a durable business-controlled address where the provider permits it.
- [ ] Every account has at least one verified recovery method and preferably two independent methods.
- [ ] At least two trusted administrators exist only where the owner has explicitly selected the second person.
- [ ] Former users, partners, agencies, and accidental brand-account connections have been removed.
- [ ] Password-manager vault labels match the current accounts, without copying secrets into this registry.
- [ ] API keys and webhook secrets exist only in encrypted provider/deployment secret stores.
- [ ] Billing profiles and payment methods belong to the intended business and have no unauthorized spend.
- [ ] The public links, support email, legal seller, and privacy/terms URLs still match the active product.

## Incident procedure

If ownership or security is uncertain, stop public posting and paid spend for that service. Use the provider's official recovery flow, rotate affected secrets in the provider and deployment secret store, revoke unknown sessions/users, preserve audit evidence, and update only the non-secret status here. Never paste a recovered secret into chat, source control, a shared document, or a support ticket.
