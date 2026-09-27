# Food My Way legal launch packet

Status: recommended owner-review draft — do not open paid checkout until bracketed fields are completed and approved.

This is operational drafting, not legal advice. A qualified attorney should review the final documents for the seller's location and target markets.

## Required identity fields

- Legal seller: **TP Biz Op LLC, doing business as Food My Way**
- Public business or mailing address: **22365 El Toro Road, Unit 2088, Lake Forest, CA 92630**
- Governing jurisdiction: `[[JURISDICTION]]`
- Effective date: `[[EFFECTIVE_DATE]]`
- Support email: `support@foodmyway.app`

## Recommended founding-offer definition

“Food My Way Founding Member” is a one-time USD $29 purchase providing access to the premium features identified at checkout for the commercial lifetime of the Food My Way premium product. It does not mean the purchaser's lifetime, guarantee perpetual operation, or include every future product or materially different service. Materially different future products may be priced separately. Applicable taxes may be added.

Do not describe unspecified “future perks” as guaranteed. Identify any guaranteed feature at checkout; describe everything else as discretionary.

## Recommended refund policy

Food My Way offers a full refund when the purchaser requests one within 14 calendar days after the original founding purchase. Requests must be sent to `support@foodmyway.app` from the checkout email and include the Stripe receipt number when available; customers should never send card details. Approved refunds are returned to the original payment method through Stripe, and premium access ends when the full-refund event is processed. Partial refunds and requests outside 14 days are reviewed individually. This policy does not limit non-waivable rights under applicable law.

## Terms language to publish before checkout

`PAID_TERMS_DRAFT.md` now contains the complete recommended publication draft. Counsel should edit that draft rather than reconstructing the terms from this checklist. Before replacing `terms.html`, confirm that it:

1. names **TP Biz Op LLC, doing business as Food My Way** as the seller and identifies its address;
2. incorporates the founding-offer definition above;
3. states the exact price, one-time billing basis, included features, taxes, and 14-day refund process;
4. explains suspension for misuse and what happens if Food My Way is discontinued;
5. preserves non-waivable consumer rights;
6. identifies `[[JURISDICTION]]` and any dispute process reviewed by counsel;
7. avoids claiming that all future products are included.

The paid-launch deployment verifier intentionally fails while the public beta terms remain in place. It passes only after the published page names the Food My Way Founding Member offer, $29 price, and 14-calendar-day refund window and removes the beta-only notice.

## Privacy language to publish when accounts are enabled

The final policy must identify:

- Cloudflare as hosting, security, serverless-function, and database infrastructure;
- Resend as the passwordless login-email processor;
- Stripe as payment and transaction processor;
- Instacart only after grocery-commerce links are enabled;
- local browser data and optional cloud snapshots;
- login email, hashed authentication/session credentials, entitlement and transaction records;
- first-party product events and the 90-day intended retention period;
- account export, deletion, support contact, and legally required transaction retention;
- the completed legal operator identity and applicable privacy rights.

## Owner approval record

- [x] Legal identity and address completed
- [ ] Fourteen-day refund policy approved
- [ ] Founding “lifetime” definition approved
- [ ] Included premium features approved
- [ ] Privacy processors and retention approved
- [ ] Governing jurisdiction completed
- [ ] Professional review completed or knowingly deferred
- [ ] Published Terms and Privacy pages match the approved text
- [ ] Stripe Checkout links to the published pages
