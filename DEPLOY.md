# Food My Way deployment guide

This project is intentionally simple: plain HTML, CSS, and JavaScript with no production build step or framework.

Deploy the complete repository so icons, the web manifest, offline support, and shared-recipe links remain intact. Do not upload only selected files.

---

## ✅ How to Deploy (Recommended)

1. Merge an approved `picky-v2` change into the deployment branch.
2. Configure the host to publish the repository root as a static site.
3. Serve the site over HTTPS; installable PWA features and production clipboard sharing require it.
4. Verify generation, saving, Recipe Book, a shared URL, and one offline reload after each release.
5. Confirm the deployed response includes the security policy in `_headers`; Cloudflare Pages applies it automatically from the publish root.
6. Run `npm run verify:deployment -- https://foodmyway.app` and require every check to pass before publishing marketing links.

That’s it.

---

## 🧠 How We Work With ChatGPT

- Development happens on a feature branch such as `picky-v2`.
- `main` stays deployable and acts as the rollback branch.
- Changes are tested before they are merged.
- Browser data is local until Supabase persistence is introduced.

If something changes, ChatGPT will tell you:
> “Replace styles.css”  
or  
> “Replace app.js”  
or  
> “Upload this ZIP”

---

## 🔒 Rules We Follow

- `index.html` must live at repo root
- All paths are relative (`./styles.css`, `./app.js`)
- No secrets or API keys in the repo
- GitHub Pages serves static files only
- `service-worker.js` must be deployed at the repository root
- Keep `site.webmanifest` and all icon files deployed
- Keep `_headers` in the publish root; it disables framing, unnecessary device permissions, MIME sniffing, and stale caching of runtime configuration
- GitHub Actions runs the complete test and syntax suite on `main` and `picky-v2`; do not deploy a failing commit

## Domains

- Primary/canonical domain: `foodmyway.app`
- Acquisition redirect: `PickyEaterCookbook.com`

The app generates share links from its current origin. Point `foodmyway.app` at the production Cloudflare Pages project, then redirect `PickyEaterCookbook.com` to the primary domain. Do not publish the Cloudflare preview hostname in marketing.

---

## 🧭 Versioning

Each file includes a header like:
```
Version: v1.1.0
Date: YYYY-MM-DD
```

If something breaks, you can always roll back via GitHub history.

---

## 🧑‍🎨 Roles

**You**
- Vision
- Taste
- Decisions

**ChatGPT**
- Coding
- Polish
- Safety

---

If it feels good, ship it.
