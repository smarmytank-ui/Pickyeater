# Owner email exclusion gate — implemented locally, not activated

This supersedes the requirement to resolve UUIDs for the TWO owner-confirmed email identities. Existing actor/payment exclusions remain supported; no customer inclusion roster is introduced. Owner addresses and actual deployment hashes are not included in this repository/report/manifest or browser assets.

## Protected configuration and matching

`functions/_shared/ad-measurement.mjs` derives the internal key only from server-authenticated `account.email`: existing `normalizeAccountEmail` trims outer whitespace and lowercases; `exclusionEmailKey` computes SHA256 of `fmw:ad-exclusion:email:v1:` plus that normalized email. No plus/dot alias guessing. Invalid/missing/non-string email fails closed. Client body/email/actor/config overrides do not supply identity. This is an internal exclusion key, not TikTok Advanced Matching or an audience identifier.

Required server-only configuration:

- `FMW_AD_EXCLUDED_EMAIL_HASHES_JSON`: exactly TWO distinct lowercase64hex hashes for the confirmed pair. Missing, empty, duplicate, wrong count/type/case or malformed JSON fails closed.
- `FMW_AD_EMAIL_EXCLUSIONS_REVIEWED`: exact string `true`, in addition to existing full `FMW_AD_EXCLUSIONS_REVIEWED`, start/revision and actor/payment-list validation.

Any matching email OR actor OR payment excludes measurement. A nonmatching ordinary new customer still qualifies automatically if authenticated ownership/consent/payment checks pass. This is a negative owner/test list, never a positive customer roster. Grant and SDK preflight deny excluded/unknown configuration; Purchase reservation performs early email/actor eligibility before order lookup and rechecks payment eligibility afterward. Withdrawal remains available when exclusion configuration is missing/unreviewed. Signed paid entitlement fulfillment does not call this gate and remains successful for owner/test purchases; exclusion affects reporting only.

Environment is a request snapshot. No claim of atomic revocation across deployments or recall of already transmitted SDK data. Fresh preflight and reservation use current request configuration; local withdrawal still revokes/stops the SDK path. Tracking remains disabled pending release/data-sharing gates.

## Actual owner pair prepared privately

The owner-confirmed literals were read ONLY from the private local fact record outside the repository/deployment root. Two keys were computed offline with the actual implementation and saved to `owner-email-exclusions.private.json` in that same external preparation directory. They were not printed, committed, placed in public config or applied to Cloudflare. No UUID inferred, user created, live account/customer row queried, credential created or provider request made.

Offline actual-pair check used fresh random synthetic user IDs and exact/uppercase-whitespace email variants against grant, preflight and claim with a DB spy that throws on ANY query. All12 gate checks denied and DB access remained zero. A scoped scan confirmed neither private literal nor hash appears in the acquisition browser/config/current release assets. Independent code review uses synthetic identities rather than opening the private pair/configuration. This proves local exclusion logic/preparation, not live deployed protection.

The private draft supplies only reviewed EMAIL exclusion variables. Preserve other reviewed actor/payment exclusions; do not silently mark the entire global configuration reviewed or activate tracking merely because these two facts are resolved. At later authorized release, copy the values only through the supported private server configuration mechanism, never browser `config.js`, HTML, cookies, URLs, receipts, provider payloads, logs, chat or audience upload. Verify names/count/flags without echoing values.

## Evidence and remaining gates

Seven dedicated synthetic tests cover normalization; both configured owner identities with unknown/new user IDs; missing/malformed/unreviewed lists; prior-consent suppression; authenticated-only identity despite forged input; ordinary new customer and no configured hashes in returned authorization/Purchase/SDK queue; and successful signed fulfillment even when owner/malformed measurement configuration suppresses reporting. Existing actor/payment, consent, ownership and replay suites remain.

Actual pair hashes are prepared but configuration is NOT applied. No UUID lookup is required for this pair anymore. Explicit deployment/configuration/data-sharing approval, fresh drift/recovery gates, provider/browser acceptance and the proposed $200 launch approval remain. No new table, credentials, migration or live activation was performed.

Final evidence: full local suite PASS340tests/52files; independent read-only review PASS26focusedtests and all9sourcechecksums, no local blocker. Separate actual-pair offline check passed12gatecases with zero DB/provider access; independent reviewer did not inspect private values. Final changed-file scan found no actual owner literals/hashes. No live configuration or protection is claimed.
