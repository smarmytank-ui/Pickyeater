# Food My Way customer-readiness release, 2026-11-08

Base: production main 74c98925a3b50ceafcc03fe811153922b8474a89.
Existing corrections integrated from 5cf3125 and d62f3ff without changing the original review worktrees.

## Included
- Corrected digital Kit safety: ground poultry 165 F; species-specific ground meat guidance; canned/fully cooked bean requirements.
- Reconciled four-serving dinner grocery totals and visible household/substitution assumptions; saved notes and day progress preserved.
- Generated-legume preparation guidance, including mixed animal-protein temperature checks and conservative mixed-preparation handling.
- Finite guest-checkout recovery with explicit prior-buyer warning; existing owners still open their Kit.
- Repaired Kit landing symbols and refreshed module references.
- Portable release tests that do not depend on Windows Git paths or old commits in shallow CI.
- Public /products/* requests denied with no-store 404; paid authoring source is not a downloadable public asset.
- Printable PDF fail-closed SHA256 check. Only the reviewed corrected PDF is served; mismatched or old files get a temporary-unavailable response with digital-Kit recovery. Entitlements are unchanged.

## Corrected PDF
Expected SHA256: 0520c57dfe01588f27cc0d0913f292fefbccff9fa324cbf80b15c6acdfe3be68.
Expected size: 332898 bytes. Expected length: 36 pages.
Exact object: existing KIT_FILES / FoodMyWay-Picky-Eater-Survival-Kit.pdf.
Strict local parity: all 16 recipe records match the builder and PDF, including four corrected bean substitutions. Actual PDF bytes pass the deployed hash guard.
No paid PDF bytes are added to Git or public static assets.

## Verification
Local syntax and full behavioral suite: 424 tests passed, zero failures/skips.
Synthetic sign-in/webhook/entitlement/download tests remain synthetic, not real payments.
Verify remote CI and deployment independently for the published commit.
The PDF remains unavailable until the approved object is replaced and the buyer download is verified. A source release alone does not replace the R2 object.

## Release and recovery
Keep tracking OFF, ads paused, existing offers and prices, permissions, databases and entitlements unchanged.
After deployment verify private source routes return 404, public pages and modules load, existing account/digital Kit access remains unchanged, and mismatched PDF returns a useful 503.
Replace only the existing private PDF object after preserving its audit copy and metadata. Verify download checksum, 36 pages and corrected content using an existing entitled account without a new purchase.
Do not roll back to known unsafe Kit text/PDF or remove the PDF hash guard. If a release issue occurs, preserve safety corrections and unavailable-download containment while correcting the affected code.
Old offline PDF copies are not changed by this release. Buyer notification requires separately reviewed recipients and message approval.
