# Local OFF cache follow-up

Base: deployed main 0e79d54c85e22ef17bb425b55f898a3781f5aa75. NOT PUSHED OR DEPLOYED. Tracking remains OFF. ACQUISITION-RELEASE.json is the historical deployed package; this follow-up changes its source hashes.

All four HTML config consumers and SW precache use a canonical-LF content-addressed assets/config/<SHA256>.js PATH. SW cache identity includes the same hash. Distinct paths avoid relying on query-string cache keys or the observed max-age14400. Immutable assets are never overwritten. The unapplied activation patch adds a distinct ON artifact and updates all consumers/cache identity together. Current config and assets remain OFF. Cached HTML/SW can delay adoption: acceptance requires a fresh/revalidated document, not a promise of instant activation for open tabs. Server current-state validation remains mandatory before SDK load, including rollback with stale public ON config.

## Proposed live owner acceptance

The read-only owner-status action is LOCAL ONLY until separately reviewed/deployed with the OFF follow-up. For EACH confirmed existing owner account, sign in normally on production. Coordinator makes one same-origin JSON POST /api/tracking/measurement with exact body {"action":"owner-exclusion-status"}. No email, actor, order or payment identifier is supplied. No advertising consent, grant, claim, SDK, purchase-store read or mutation occurs.

PASS: HTTP200 and exactly {"state":"owner-excluded"}, private/no-store and Vary Cookie. HTTP401 requires normal sign-in; HTTP403 not-authorized means no exclusion match; HTTP503 unavailable means missing/malformed/unreviewed protected config or unavailable identity. All block activation. Never fabricate an eligible customer. Record revision/time/status/enum only, no cookies, identity or hashes. Repeat for the second existing owner account. This verifies the real exclusion rather than mistaking global OFF for an exclusion success.

Production coordinator reports an existing signed-in, paid-access session whose visible account matches neither confirmed exclusion. Its identity remains withheld and classification UNKNOWN. Paid access is not customer classification. A not-authorized result proves only that this account does not match the reviewed email pair; it does not establish eligibility, customer status or provider-validation authority. Do not grant consent or use this session for provider testing without explicit owner classification. currentAccount performs one sessions/users SELECT only; the check neither refreshes cookies nor writes auth data. No purchase rows are read. Existing protected exclusions remain unchanged.

## Evidence and gates

Local full suite 367/367 runner entries passed (includes helper modules); syntax checks, immutable-identity check and git apply --check of the UNAPPLIED activation patch passed. Fixtures prove path collision refusal, OFF zero calls, authenticated subject-free enum isolation, bad-config refusal and no purchase-store access. They do not prove live provider delivery/attribution or a customer purchase.

Coordinator independently verified live OFF rendering, decline/unavailable states and zero TikTok script tags. Existing Cloudflare beacon remains: no all-network-quiet claim. Visual OFF-page acceptance is complete; isolated Node browser failure is not a remaining visual blocker. Runtime owner exclusions remain pending. No CSP/global-auth/Stripe/schema/retention changes in this follow-up.

Coordinator supplied first scheduled production retention receipt: version 93cb1f84-e114-4f4b-b248-ea3da75f699b at 2026-11-01 04:45 UTC, outcome ok, exceptions empty, revision retention-v2-consent-delete-20261101, attemptsRedacted 0, consentsDeleted 0, permanentFencesRetained true. Temporary tail stopped and exit verified. This clears the scheduled-execution gate, not live aged-data deletion proof.

Next: reviewed OFF follow-up source staging/deployment; verify new live source/config identity and both owner results; only then clear activation gates. No activation, fake Purchase, new payment or ad launch here.

Privacy follow-up: November 1 material-change date; optional measurement disclosure aligned with dedicated-page consent, SDK browser/network context, verified-purchase fields, refusal/withdrawal, 30-day local redaction and permanent minimal event/state fences. Privacy HTML remains static with no SDK/loader. No expanded data use.

## Supported browser owner-check control (pending release)

Cache/privacy deployed at main69e36364a36afbe8bb69493f47ecd9dd2376d5f3. This new UI is not yet deployed. Open the clean /ad-measurement page and click Check signed-in account exclusion under Read-only account exclusion check. Read the status element only; no automation fetch or cookie extraction is needed. The page sends the exact same-origin owner-exclusion-status action through its ordinary authenticated fetch. No account identifier is accepted. No automatic check, consent, SDK, claim or purchase action occurs. Button stays disabled after one click; 8-second deadline yields uncertain with no automatic retry. A missing session directs normal Kit sign-in; nonmatch remains unclassified. Existing two protected hashes are unchanged. Test each approved existing owner account separately after deployment; do not use the currently unclassified account for provider acceptance.
