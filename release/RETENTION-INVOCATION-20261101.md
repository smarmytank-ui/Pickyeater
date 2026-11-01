# Exact retention operation — prepared locally, not deployed

## Minimum retained data

Random consent-ID/redaction-time stubs are NOT necessary for replay protection and are no longer retained. The atomic helper first redacts eligible attempts, leaving only hashed payment `event_id` and `state`, then DELETEs expired grants at least30days old with no remaining attempt link. Guards use the database clock, not request/controller timestamps. The permanent event primary key rejects the same signed payment even with a fresh grant, a reused old grant request, or a recreated old grant ID. Missing old grants cannot validate or reserve anything. New grants cannot backfill an earlier paid order. Permanent uncertainty cannot be turned into a fresh dispatch.

The unused `redacted_at` column remains constrained to NULL solely for compatibility with current consent-reading code. No new stub can be inserted or transitioned into existence; no consent row remains after successful eligible retention. Exactly TWO tables remain. The revised `0009` is still unapplied: if a target already has any prior ad-table/trigger version, STOP for separate migration review instead of overwriting it. No legacy-stub conversion is silently assumed.

## Implemented callable, not future code

- `redactMeasurementDetails({db})` in `functions/_shared/ad-retention.mjs` is the atomic D1 batch; exported statements are `RETENTION_REDACT_ATTEMPTS_SQL` and `RETENTION_DELETE_CONSENTS_SQL`. It accepts no cutoff or customer input and never reads account/payment business rows.
- `runRetentionOnce(env)` in `operations/ad-retention-worker.mjs` calls that SAME helper only with exact enabled/revision/binding-label checks. It returns aggregate counts `attemptsRedacted`, `consentsDeleted` and permanent-fence status. No record IDs, click IDs, email or event IDs enter the receipt/log.
- Default exported `scheduled(controller, env)` accepts ONLY `*/15 * * * *`, uses the same callable, logs the aggregate result and signals a sanitized failure to the platform. `noRetry()` is requested on failure; code contains no retry loop. A later specifically configured cron is a separate idempotent maintenance run. The database-clock guard remains authoritative regardless of a supplied scheduled timestamp.
- `fetch()` always returns404 without touching the DB. No public maintenance/admin endpoint, auth token, caller command, new table, secret or sending integration exists.

## Build and local invocation

From the existing review working directory, with the existing Node installation:

```powershell
& 'C:\Program Files\nodejs\node.exe' scripts/build-ad-retention-worker.mjs --emit
& 'C:\Program Files\nodejs\node.exe' --check output/ad-retention-worker.mjs
& 'C:\Program Files\nodejs\node.exe' test/ad-retention-worker.test.mjs
& 'C:\Program Files\nodejs\node.exe' test/ad-retention.test.mjs
```

The dependency-free generated `output/ad-retention-worker.mjs` is local build output, not an installed service. Tests call the real exported callable, scheduled entry and generated bundle with synthetic SQLite/D1 only, including rollback when the second batch statement fails. No new package, Wrangler installation, local server, provider call or database credential is needed for this proof. Bundle/source/config hashes are pinned in the release manifest. These tests do NOT prove Cloudflare runtime deployment or Cron delivery.

## Exact disabled deployment configuration

Prepared `operations/ad-retention.wrangler.PROPOSED.json`:

- Worker name: `food-my-way-ad-retention`; generated entry: `../output/ad-retention-worker.mjs` relative to that config.
- `workers_dev=false`, `preview_urls=false`, `routes=[]`, `triggers.crons=[]`.
- `FMW_AD_RETENTION_ENABLED=false`, empty `FMW_AD_RETENTION_APPROVED_REVISION`.
- Only one D1 binding, `PURCHASES`, recorded existing name `food-my-way-purchases`, ID `fe02092f-41c3-4ac4-b4b5-2b5e8c22fc23`, copied from LOCAL existing wrangler.toml. This is not a fresh remote mapping assertion. Neither ACCOUNTS, telemetry nor R2 is bound to this Worker.

The binding grants access to that whole D1 resource, not table-level security. Code uses only the two ad tables; the required binding permission must be explicitly approved. The configured expected-ID variable is an approval/configuration check, NOT proof of actual remote binding identity. Release owner must inspect and record that mapping before enabling. No existing site route/auth/payment configuration changes.

## Bounded deployment/activation sequence for approval

1. Recheck parent-verified main at action time. Verify target D1 mapping and schema metadata, fresh scoped backup/recovery/bookmark and restore evidence through the already-authorized route. No customer purchase-row inspection. Stop on unknown/mismatched mapping, missing backup or existing conflicting ad schema. Obtain specific source/migration/deployment approval; no current broad approval is inferred.
2. Apply reviewed additive0009 ONLY after those gates and approval. Its changed trigger contract must travel with this revision; do not run the new helper against old triggers. Keep browser measurement disabled while verifying.
3. Approve this small scheduled Worker, binding and actual Workers/D1 usage. Reuse existing Cloudflare account/access; no new key is required by runtime. Cron deployment uses existing supported `scheduled()` Worker interface; Food My Way Pages routes do not need a public cleanup endpoint. The maintenance component is separate from the application and has no replacement dashboard.
4. Build/review the self-contained bundle and manifest SHA. Using an EXISTING approved Wrangler installation/authentication if available, the exact later deployment command is `wrangler deploy --config operations/ad-retention.wrangler.PROPOSED.json`. It is NOT run now. If no approved CLI exists, an authorized existing Cloudflare dashboard deployment can use the same single bundled module and exact settings above; do not install a CLI or create credentials silently. Stop if neither existing deployment route is available. First deploy stays DISABLED with NO Cron.
5. Read back deployed code revision/hash, no public URL/route, only exact PURCHASES binding and disabled flags/no trigger. Record that deployment as dormant, not operating retention.
6. With separate operational activation approval, apply ONLY `operations/ad-retention.ACTIVATION.PROPOSED.patch` (currently unapplied), then deploy the reviewed config. Exact flags: enabled `true`, approved revision `retention-v2-consent-delete-20261101`; Cron `*/15 * * * *` UTC. No external scheduler/service token is necessary. This is96 scheduled invocations/day; actual existing-plan compute/D1 usage and limits require review, not a promise of zero cost or a new subscription approval.
7. Observe the first scheduled platform event in existing authenticated Cloudflare Workers & Pages -> this Worker -> Settings/Triggers and Cron Events/logs. Require completed platform outcome PLUS sanitized aggregate operation receipt. Empty new ad tables legitimately return zero counts; that is not proof of a real aged-data deletion. Actual eligibility deletion remains locally proven until time/real events establish it. Do not seed production test customer/order data. Release owner checks first event, then daily until automated monitoring is separately authorized; no automated alert channel is claimed here.
8. Normal cadence processes data once DB age reaches30days, on the next15minute trigger. That is up to15minutes scheduling delay, plus failures/outages; NOT exact-to-the-second30day erasure. Any missing/failed event is a retention incident requiring owner review. Confirm the owner accepts this operational bound before promising it publicly. No health/claim data is collected for monitoring.

## Disable/recovery

Set enabled `false` and remove all Cron triggers, deploy/read back, then verify no further active triggers/events after platform propagation. Worker HTTP remains404. Cron changes can take up to15minutes to propagate; configuration rollback is not instantaneous. Keep browser tracking off if retention health is uncertain. Never drop/reset permanent attempt fences to undo this operation. Do not automatically restore deleted consent detail merely to rebuild history. A broad D1 restore can overwrite later purchases AND remove newer fences; recovery needs a separately approved reconciliation preserving the latest permanent fences and business data. No automatic restore/cleanup retry exists.

## Primary interfaces checked

- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) documents scheduled handlers, UTC cadence and propagation delays.
- [Scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/) documents the runtime entry interface.
- [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) documents executing prepared statements in one batch. Local rollback is regression-tested; production behavior still needs approved verification.

Everything above is a prepared implementation/approval plan, not permission to deploy, bind, schedule, clean records or spend. Owner exclusions/privacy/browser/provider acceptance and the $200 acquisition launch gates remain unchanged.

## Final local evidence

Full direct-file suite PASS333tests/51files. Independent read-only review PASS25focusedtests (retention7, invocation5, ownership13); activation-patch check and diffcheck passed without application. Dependency-free bundle built locally and syntax checked; tests execute the generated module against synthetic SQLite. No remaining local blocker in this bounded scope; actual Cloudflare binding/runtime/cron/cost/recovery acceptance is NOT established.
