CURRENT STATUS: see COORDINATOR-GATES-20261101.md. Historical blanket HOLD below is superseded; OFF push/PR/CI authorized, MERGE holds for coordinator private Pages configuration receipt.

# Coordinator package checkpoint — local only

Updates the a6dc3fd handoff without changing runtime code or authorizing a push/merge. Coordinator owns ALL Cloudflare variables, migration and retention deployment. Morgan did not duplicate them.

## Accepted receipts, not repeated operations

Owner separately approved Workers-write and coordinator reports normal keyring OAuth/whoami now shows exactly `account:read`, `d1:write`, `workers:write`, `offline_access`. No further grants needed or authorized. Morgan did not inspect keyring credentials or request OAuth. This supersedes the prior missing Workers-deployment-scope note; it is not proof of any deployment.

Coordinator migration rehearsal at November1 04:16UTC against restored purchases SQL passed: existing business schema/counts unchanged, integrity/FK pass, exactly TWO new tables and ELEVEN triggers. Migration current bytes SHA256 `07bdb7951038b14a73340c94737967166ba4004d070d52b9c72b895bacb55515`; canonical LF `1fd2e2aca4e2e4d0112960d32ba32af321f3fc0172b0771403087fe8c07fe959`. Morgan did not reopen backup SQL, repeat export or run live migration. A successful rehearsal is not production migration acceptance. Push/merge still waits for explicit coordinator migration AND retention gate confirmation.

## Generated retention delivery, no secrets

Local artifacts:

- `output/ad-retention-worker.mjs`, compiled dependency-free Worker. SHA256 `5e29099c72841288193f7b1a2f4469577f68e6ce709aeb3e918efaff7001d2e2`.
- `output/fmw-retention-2.68.8-disabled.zip`, SHA256 `52a7e5380e1a5c657b299f54eb5036cb8bbc42271568fd5db501a9eed5b045e7`.
- Archive contains ONLY `worker.mjs`, `wrangler.json`, `README.txt`, `SHA256SUMS.json`. It contains no owner hashes/addresses, tokens, keyring, .env/.dev.vars, accounts, backups or customer rows. Worker checksum matches the standalone bundle. Config is disabled, no Cron, no public URL/route. Fixed archive entry timestamps make this local package reproducible from the same files.

Use an already-authorized coordinator deployment route only. After approved extraction, existing installed Wrangler can deploy `--config <extracted-folder>/wrangler.json`; do not run here or acquire grants. Entry is worker.mjs, avoiding the source-template relative path. Read back exact PURCHASES binding and disabled settings before enabling. The data-sharing approval includes cleanup scope but this message does not confirm either gate passed.

Exact retention settings: Worker `food-my-way-ad-retention`; binding `PURCHASES` -> `food-my-way-purchases`, ID `fe02092f-41c3-4ac4-b4b5-2b5e8c22fc23`. Initial `FMW_AD_RETENTION_ENABLED=false`, `FMW_AD_RETENTION_APPROVED_REVISION` empty, `FMW_AD_RETENTION_EXPECTED_DATABASE_ID` that ID; `workers_dev=false`, `preview_urls=false`, routes empty, crons empty. Approved future operational settings: enabled `true`, approved revision `retention-v2-consent-delete-20261101`, same expected database ID and Cron `*/15 * * * *` UTC. Coordinator verifies deployed binding, aggregate receipt and platform outcome. The variable label does not itself prove actual binding identity. No activation was performed by packaging.

## Exact Pages server configuration

`release/SERVER-CONFIGURATION-2.68.8.json` lists ALL nine names, exact safe initial values, merge rules and activation conditions. Set initially:

| Server variable | Initial value / source |
|---|---|
| FMW_AD_ENABLED | `false` |
| FMW_AD_PIXEL_ID | `DBJA0E3C77U7TR2UDESG` |
| FMW_AD_EMAIL_EXCLUSIONS_REVIEWED | `true` for confirmed owner pair only |
| FMW_AD_EXCLUDED_EMAIL_HASHES_JSON | EXACT private external file value; never print/copy to public source |
| FMW_AD_EXCLUDED_ACTORS_JSON | Preserve existing reviewed list; absent default `[]` |
| FMW_AD_EXCLUDED_PAYMENTS_JSON | Preserve existing reviewed list; absent default `[]` |
| FMW_AD_EXCLUSIONS_REVIEWED | Preserve existing reviewed state; absent/default `false`; mark `true` only after full review |
| FMW_AD_ELIGIBILITY_REVISION | Preserve reviewed existing value or `fmw_2_68_8_release_20261101` |
| FMW_AD_START_MS | Preserve existing safe cutoff; absent/default `0` deliberately fails closed. Set actual action-time UTC-ms string before activation |

No UUID lookup is needed. Two owner hashes were prepared offline outside the repository; a private initial-OFF merge profile is also prepared there, containing actual hash value but no authentication credential. Review/merge via secure coordinator interface only, never blind bulk overwrite. Do not put that private profile into the ZIP/repository/chat/browser config. Existing actor/payment exclusions and other auth/Stripe settings remain intact. Global review false or cutoff0 blocks activation even if someone prematurely flips the measurement flag. Public config also stays OFF until the coordinated source patch.

## Refreshed package pins and readiness

All existing pins were checked before refresh: zero mismatches. They are recomputed along with new package/config artifacts in ACQUISITION-RELEASE.json; raw working bytes and canonical LF source are distinct. The prior handoff manifest digest is superseded by this commit's final digest, not evidence of source drift. Runtime code remains the reviewed a6dc3fd OFF release.

No source push/PR/merge, Cloudflare mutation, live SDK call, payment, fabricated Purchase, new credential or ad launch. No remaining local engineering blocker; coordinator must explicitly close the live migration and retention gates and private config review before source publication. Local tests are not live acceptance.

Final local validation: CI-equivalent npmtest349passed, syntaxcheckpass. Independent review verified27rawpins,34LF/canonicalpins (17runtime+3canonical+14protected), ZIPouterhash and3embeddedchecksums;9relevant packaging/retentiontests passed. Runtime unchanged froma6dc3fd. No remaining local blocker. Private external configuration was not opened by independent reviewer. Live coordinator gates remain unconfirmed; no sourcepush/merge or CFmutation.

## Superseding critical HOLD

See RELEASE-HOLD-20261101.md. Coordinator first dormant deployment failedexit1 at the Worker deployments GET with No access to specified resource, despite the exact approved scope receipt. Rootcause and remote state remain unresolved. No retry, browser bypass or further grant. Productionmigration/sourcepushPRmerge/retentiondeploy/activation remain HOLD until coordinator reconciliation and explicit gate clearance. Runtime/package unchanged; local completion is not production acceptance.

## Superseding verified coordinator update

See COORDINATOR-GATES-20261101.md. Owner-approved fifthscope workers_scripts:write and coordinator readback/successful single retry resolved prior access/unknown-state gate. Migration applied ONCE and retention schedule configured; firstscheduledreceipt remains pending. Source PUSH/PR/CI is explicitly authorized now; MERGE remains HOLD until private Pages initialOFF configreceipt. No tracking activation or extra Cloudflare operation authorized to Morgan. Historical failed attempt remains preserved.
