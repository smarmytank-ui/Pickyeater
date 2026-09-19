# 🚀 Picky Eater – Deployment Guide (GitHub Pages)

This project is intentionally simple: plain HTML, CSS, and JavaScript with no production build step or framework.

Deploy the complete repository so icons, the web manifest, offline support, and shared-recipe links remain intact. Do not upload only selected files.

---

## ✅ How to Deploy (Recommended)

1. Merge an approved `picky-v2` change into the deployment branch.
2. Configure the host to publish the repository root as a static site.
3. Serve the site over HTTPS; installable PWA features and production clipboard sharing require it.
4. Verify generation, saving, Recipe Book, a shared URL, and one offline reload after each release.

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

## Domains

- Primary/canonical domain: `PickyEaterCookbook.com`
- Short redirect or future installed-app landing domain: `foodmyway.app`

The app generates share links from its current origin. Configure the primary domain only after selecting the production host, then redirect the secondary domain to it.

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
