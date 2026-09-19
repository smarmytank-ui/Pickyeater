# Picky Eater technical audit

Audit date: 2026-09-19  
Baseline: `main` at `9f29f81`  
Development branch: `picky-v2`

## Baseline application

Picky Eater is a static, mobile-first site made from `index.html`, `styles.css`, and `app.js`. It has no build step, framework, package dependencies, server, service worker, automated tests, or deployment workflow. `DEPLOY.md` describes manual GitHub Pages deployment.

### Working

- Ingredient input accepts lines or comma-separated values.
- Recipe generation classifies ingredients into fixed roles and creates a deterministic title, quantities, instructions, and estimated nutrition.
- The swapper provides role-specific replacements plus a custom ingredient option.
- Swaps update quantity defaults, title, instructions, and nutrition. Ingredient amount and serving controls also recalculate nutrition.
- Saving writes the exact current ingredient/step state to browser storage.
- Diary entries can be created from a recipe and removed.
- PWA icons and a web manifest exist, although the app is not install/offline complete without a service worker.

### Partial, broken, or obsolete

- Recipe generation is a rules engine, not AI. Unknown foods default to the vegetable role and generic nutrition, so output can be inaccurate or nonsensical.
- Instructions only consider the first ingredient in several roles and always include a vegetable cooking step, even when there is no vegetable.
- Nutrition uses a small embedded lookup table and generic fallbacks. It is an estimate, not suitable for allergy or medical decisions.
- Saved recipes had no list, open, search, delete, duplicate, or share interface.
- Two incompatible legacy save keys existed: `pickyFavorites` and the unused `picky_saved_recipes` from `save-addon.js`.
- The diary's Quick Add and Today/Yesterday controls existed in HTML but were not wired. The baseline used UTC for the diary date, which could select the wrong local day.
- The "create account" modal only stored an email locally; it did not create an account or sync data. Its wording was misleading.
- `generator.html` called a nonexistent global `generateRecipe()` and was broken. It is now retained only as a legacy entry point to the current app.
- `save-addon.js` is not loaded by the application and belongs to an older callback design.

## Data and integrations

Baseline local storage keys:

- `pickyFavorites`: saved recipe snapshots.
- `pickyDiaryMeals`: diary data keyed by date and meal.
- `pickyAuth`: an email string and creation timestamp; not real authentication.
- `picky_saved_recipes`: only used by the unloaded legacy add-on.

Milestone 1 introduces `pickyRecipesV2`. On first use it non-destructively imports recipes from both legacy save keys. Legacy keys are left intact for rollback.

There are no backend, API, OpenAI, Supabase, Stripe, analytics, or other remote integrations. There are no secrets in the repository.

## Security and architecture risks

- All data is device/browser-specific and can be lost when site data is cleared.
- Share links contain the recipe payload in the URL fragment. This is acceptable for a no-backend milestone, but links can be long and are not revocable or editable.
- The baseline inserted diary content with `innerHTML`; Milestone 1 renders user text with `textContent` to remove that injection path.
- Browser storage is unencrypted and must not hold secrets or sensitive health information.
- Allergy avoidance cannot be guaranteed by the current rules engine or nutrition fallback data.
- The single large JavaScript file mixes domain rules, persistence, and UI rendering, making future changes harder to test.

## Preserve versus replace

Preserve the visual identity, mobile-first layout, no-build deployment, deterministic generator, swap catalog, quantity controls, nutrition disclaimer, and local-first behavior while the product is validated.

Replace incrementally: consolidate persistence behind a versioned data layer; split domain/UI modules when a build system becomes justified; replace fake auth with Supabase Auth; move durable recipes and public shares to Supabase; and put OpenAI calls behind a server-side Edge Function so API keys never reach the browser.

## Minimum Milestone 1 architecture

Milestone 1 stays static and adds one versioned recipe schema, a Recipe Book interface, and portable public share links. This avoids a premature backend while completing Generate → Swap → Save → Recipe Book → Share.

The next backend step should be additive:

1. Supabase Auth with email magic links.
2. `recipes` and `shared_recipes` tables protected by row-level security.
3. Anonymous read-only share slugs generated server-side.
4. Optional Supabase Edge Function for OpenAI generation and substitutions.
5. Local-to-cloud migration after sign-in, retaining offline-friendly local caching.

## External inputs needed later

None are required for this local-first Milestone 1. Cloud persistence will need a Supabase project URL and public anon key plus approved auth redirect URLs. AI generation will need an OpenAI project/API key stored only as an Edge Function secret. Production sharing will need the final hosting URL/domain. Stripe is not needed yet.

## Domain direction

Use `PickyEaterCookbook.com` as the primary public and canonical recipe-sharing domain because it communicates the product immediately and reinforces the Picky Eater name. Keep `foodmyway.app` as a short redirect/marketing domain or reserve it for a future installed-app landing page. The application currently derives share links from its active origin, so either domain can host it without code changes. DNS redirects and canonical metadata should be configured only after the production host is selected.
