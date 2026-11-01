# Food My Way 2.68.8 — production release prepared OFF

Source owner: original Morgan. Coordinator owns Cloudflare configuration, migration and retention deployment. This package is local, not pushed/merged/deployed; no Cloudflare mutation or new grant was made by Morgan. No fabricated Purchase, payment or ad launch. Owner's supplied November1 04:12UTC approval covers the stated consent-only page/data/CSP/retention scope under TikTok terms; it does NOT expand OAuth/deployment permissions.

## Proven source baseline

- Actual main commit `508a8fa97e4f2ea431c5b4c7d55f7ef129e7b70b`, tree `3b5bed7ec4c422a0a9b41a2d6ada4a4eacdaf49f`, fetched read-only via existing GitHub authentication. It matches local reviewed fc6deb7 tree.
- Separate release worktree/branch: `C:/Users/pablo/Documents/Codex/2026-10-31/fmw-release-2.68.8`, `release/fmw-2.68.8-off-20261101`. The initial release commit a6dc3fd has ACTUAL main as its direct parent; subsequent packaging-receipt commits keep that ancestry, not the imported equivalence commit.
- Reviewed candidate `084ff40f69b055594efb20019584aff5caa07eaf`; before packaging, the applied diff reproduced EXACT reviewed tree `dc332251571dcfd8b46780432b054dc2fbedee5c`. The original review worktree/branch and journals remain intact.
- Protected auth, shared account helper, Stripe webhook, paid-order/measurement schema, ad core/retention helper, checkout attribution, app/Kit JS and global _headers are verified LF-canonical identical to the reviewed candidate. Per-file checksums are in ACQUISITION-RELEASE.json. No latest-main overwrite, force push or history rewrite.

## Only release packaging changes after review

1. Final version2.68.8/cache `food-my-way-v2-68-8`; corresponding HTML/module version references updated together. Public config reports releaseVersion2.68.8. No app/auth/payment business behavior changed.
2. Approved exact page-specific CSP mounted at `functions/ad-measurement.js`. It replaces CSP with ONE policy only on exact HTTPS foodmyway.app canonical page or its bounded singlettclid landing. Unrelated paths/origins/queries and global _headers remain strict. No-store/no-referrer and existing security headers are set. Unknown SDK resources remain blocked. Actual Cloudflare headers/routing still need post-deployment checks.
3. `config.js` is approved-but-OFF: enabledfalse; account/data/scope/settings approval metadata true, reflecting supplied approval/Pixel receipts. This is not provider acceptance. No SDK, pending tracking cookie, API call or event occurs through the actual disabled profile in synthetic UI tests.
4. `release/ACTIVATE-TIKTOK-2.68.8.PROPOSED.patch` is UNAPPLIED; it changes only public enabledfalse→true. Initial source MUST remain OFF. Server FMW_AD_ENABLED must also initially be false. Both independent gates must be coordinated before later activation. Turning on server alone leaves public source OFF; do not call that connected. Morgan remains sole source writer for the later one-line source change; coordinate it rather than editing the source concurrently.
5. Tests now invoke the mounted CSP handler instead of asserting a proposal-only file is absent. New release tests cover the actual OFF profile, single-CSP replacement, version/cache identity, dormant retention config and precise unapplied enable diff. Existing syntax checks include release modules.
6. Retention bundle builder normalizes CRLF to LF for reproducible packaging. The helper and Worker logical source remain identical to084ff40. The final bundle is LF-canonical identical to the original reviewed bundle; raw SHA differs only for newline packaging. Coordinator must use/acknowledge the final pinned artifact; Morgan will not duplicate retention deployment.

## Coordinator schema/retention/config gate BEFORE push or merge

The manifest pins raw SHA256s and LF-canonical hashes. Canonical hashes avoid mistaking CRLF/LF differences for a new schema. Important current artifacts:

- `migrations/0009_ad_measurement.sql`: raw SHA256 `07bdb7951038b14a73340c94737967166ba4004d070d52b9c72b895bacb55515`; LF-canonical SHA256 `1fd2e2aca4e2e4d0112960d32ba32af321f3fc0172b0771403087fe8c07fe959`. Same reviewed schema/guards; exactly TWO new tables. Coordinator alone applies/checks; do not reapply if it already succeeded.
- `output/ad-retention-worker.mjs`: SHA256 `5e29099c72841288193f7b1a2f4469577f68e6ce709aeb3e918efaff7001d2e2`. Dependency-free local build output, not a deployment. Source/disabled config/unapplied Cron activation and exact procedure remain in RETENTION-INVOCATION-20261101.md. Coordinator alone owns whole-PURCHASES binding, deployed code/config/cadence and sanitized runtime receipt. The later coordinator Workers-write approval is recorded in COORDINATOR-PACKAGE-20261101.md; Morgan still does not duplicate Cloudflare mutations or request further scopes.
- Initial server profile: FMW_AD_ENABLED=false; exact Pixel DBJA0E3C77U7TR2UDESG. Email exclusion variables come only from the private preparation file OUTSIDE repository/deployment assets. Both normalized owner hashes are ready; no UUID lookup. Require reviewed email/global flags, preserve reviewed actor/payment exclusion arrays, set reviewed eligibility revision (proposed `fmw_2_68_8_release_20261101`) and action-time UTC-ms start cutoff. No hash/address in browser config, payload, audience or release manifest. Missing/unreviewed/malformed config fails closed.
- Recorded backup evidence: `C:/Users/pablo/Documents/Codex/2026-10-26/task/FMW-BACKUP-VERIFIED-20261101.md`. Export04:09:52.320–04:09:56.136UTC, SQL SHA256 `2afb342506b44e9788a3ce057f676f7c615aa838cfad84fe92ecf2129116077e`; isolated restore/reopen/integrity/FK/count match passed. NO repeated export. PURCHASES-only, no ACCOUNTS backup or fresh Time Travel bookmark claimed. Never overwrite newer purchases/fences with this snapshot.

Return source/manifest pins to coordinator BEFORE remote branch push/PR/merge. Wait for exact schema readiness and retention/binding/config receipt. Existing GitHub push/admin access and Pages auto-production-on-main are coordinator-verified; no migration workflow exists. Keep main drift check at action time. After coordinator gate, the supported source route is push this reviewed local release branch through existing authentication, open/review PR, let CI pass, and deliberately merge the approved OFF source. Do not force main, bypass branch protection or accidentally reuse [CF-Pages-Skip] on the deliberate final production publication. No push/PR/merge was performed during preparation.

## Post-OFF-deployment, then activation

Coordinator/Morgan must verify actual release2.68.8, canonical page/header behavior, one effective CSP, cache identity, OFF consent inactivity, existing app/signup/access/checkout-cancellation/recovery paths without a new purchase. Mark local passes and live checks separately. Unknown script subresources stay blocked; do not silently widen CSP.

Only after actual schema/retention/protected configuration readiness and coordinated activation may Morgan apply the one-line public enable patch and publish it deliberately while coordinator enables the server gate. Keep Advanced Matching OFF, Enhanced postback OFF; first-party cookies ON receipt is retained with normal action-time recheck. Validate visitor consent/refusal/withdrawal, clean scope and actual SDK behavior under approved sharing scope. Stop/disable if a check fails. Do not evade owner/test exclusions to generate validation revenue; no test/fabricated conversion, new payment or ad launch is included. Existing owner purchases do not prove a new eligible signed paid Purchase; backup records paid_orders zero as of export, not a continuing revenue claim.

Rollback: public enabledfalse plus server flag false, coordinator stops retention Cron as required; use reviewed source rollback while PRESERVING database/journals/permanent event fences and newer business data. Stale cached public flags still cannot load SDK without current authenticated server validation. A code rollback is not permission to restore old D1 over newer payments. Acquisition-ad readiness remains separate from release preparation.

## Local verification

Direct-file suite PASS344tests/53files (four release-packaging tests added to the340 reviewed source tests). CI-equivalent `npm test` PASS349, including five automatically discovered helper-module entries; zero failures/skips. `npm run check` passes. Initial npm wrapper hit sandbox child-process EPERM; the identical local-only wrapper passed through approved scoped execution, with no Cloudflare/network permission expansion. Retention bundle build/syntax and synthetic invocation pass. No real SDK/email/Stripe request or hosted acceptance test occurred. Independent final release review and final commit/manifest hash are reported in the coordinator handoff.

Final independent local signoff:344tests/53files;22raw artifact hashes,17runtime LF hashes,3canonical artifact hashes and14protected-file equality checks pass. MountedCSP/OFF/cache/syntax/unapplied activation checks pass. Originalreview084 tree stays clean; no local blocker found. This is NOT schema,Cloudflare,retention,privateconfiguration or activation acceptance. Await coordinator readiness before sourcepush/merge.

## Current coordinator packaging checkpoint

See COORDINATOR-PACKAGE-20261101.md and SERVER-CONFIGURATION-2.68.8.json. The separately approved Workers-write scope now exists per coordinator whoami receipt; no further grant is needed/authorized. Restored-SQL migration rehearsal passed04:16UTC (2tables/11triggers, businessschema/counts unchanged, integrity/FKpass). This is not live gate confirmation. The generated disabled4fileZIP and private external initial-OFF profile are ready; no push/merge until coordinator explicitly confirms migration and retention gates.

## Superseding critical HOLD

See RELEASE-HOLD-20261101.md. Coordinator first dormant deployment failedexit1 at the Worker deployments GET with No access to specified resource, despite the exact approved scope receipt. Rootcause and remote state remain unresolved. No retry, browser bypass or further grant. Productionmigration/sourcepushPRmerge/retentiondeploy/activation remain HOLD until coordinator reconciliation and explicit gate clearance. Runtime/package unchanged; local completion is not production acceptance.
