# Food My Way operations runbook

Updated: September 26, 2026

## Support standard

- Acknowledge ordinary support within one business day.
- Prioritize payment, account access, privacy, and safety reports.
- Never ask customers to email card numbers, passwords, medical records, or API keys.
- Record the date, customer email, issue category, action, and resolution without copying unnecessary sensitive data.

## Purchase not recognized

1. Ask for the Stripe receipt email and approximate purchase time, not card information.
2. Search Stripe for the Checkout Session and confirm it is paid, USD $29, and tagged `offer=food_my_way_founding`.
3. Check `stripe_events` for the event ID and `entitlements` for the normalized customer email.
4. If the webhook failed, correct the configuration and use Stripe's event resend feature. Do not create access solely from a screenshot.
5. Confirm access after the replay has produced an active entitlement.

## Refund procedure

1. Verify the requester controls the purchase email.
2. Check the published refund policy and document the reason and decision.
3. Issue the refund in Stripe; never collect bank or card details over email.
4. Confirm the signed `charge.refunded` event changed the entitlement to `refunded`.
5. Send the refund confirmation and expected bank-processing timeframe shown by Stripe.
6. Review partial refunds manually because they do not revoke access automatically.

## Privacy and deletion request

1. Confirm whether the request concerns device-local data, the founding list, purchase records, or a future cloud account.
2. Explain that device-local data can be exported or erased from the app's preferences controls.
3. Verify control of the relevant email before changing server-held records.
4. Remove or anonymize data that is not legally or operationally required; retain transaction records only for the required accounting or dispute period.
5. Record completion without retaining a copy of the deleted content.
6. Send a concise completion notice.

## Security or privacy incident

1. Preserve relevant logs and stop the exposure without deleting evidence.
2. Rotate affected secrets and disable compromised integrations.
3. Determine the data, users, dates, and vendors involved.
4. Contact qualified legal counsel to assess notification duties and deadlines.
5. Notify affected people with confirmed facts, protective steps, and a support channel when required.
6. Document the cause, response, and preventive change.

## Service rollback

1. Confirm the failure in production and capture the deployed commit.
2. Roll Cloudflare Pages back to the last verified deployment.
3. Verify the home page, recipe creation, saved recipes, legal pages, and API fail-closed behavior.
4. Keep payments disabled if fulfillment or entitlement storage is unhealthy.
5. Publish a status message only with verified information.

## Required records

- Deployment commit and time
- Stripe webhook delivery status
- D1 migration and backup dates
- Support and refund decisions
- Security incidents and secret rotations
- Changes to privacy, terms, pricing, or included benefits
