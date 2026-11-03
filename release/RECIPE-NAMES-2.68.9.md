# Recipe naming release 2.68.9 — review only

Prepared from production-branch commit `74c98925a3b50ceafcc03fe811153922b8474a89`.
This is not evidence of the currently deployed revision. Merge and deployment remain unauthorized.

Generated names use ingredient-grounded wordplay. Explicit custom/imported titles are preserved.
Existing saved titles are not migrated: their provenance is insufficient to safely distinguish a
custom title from an older generated title.

Literal spaghetti uses starch/package cooking guidance; spaghetti sauce and squash do not.
Casserole is a naming cue only, not a blanket prepared-food classification. Chicken ingredients
retain protein temperature guidance. Already cooked pasta is not treated as dry noodles.

The package version, homepage asset URLs and service-worker cache move together to 2.68.9.
The config-identity helper derives its cache prefix from the package version. The immutable
OFF config bytes and all privacy settings are unchanged. The existing unapplied activation
proposal is regenerated for the new cache context only; it must not be applied as part of this release.
Historical acquisition verification records are retained as historical records, not current deployment approval.

Before release: independent review; recheck remote main/concurrent changes; run verify:release;
obtain merge/deployment authorization. After an authorized deployment, verify actual deployed
revision and test an existing installed client plus fresh client, including an offline reload,
generated naming, swaps, explicit titles and unchanged measurement-OFF behavior. Respect
existing site-access restrictions; obtain the required access before production verification.
