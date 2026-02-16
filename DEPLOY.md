# 🚀 Picky Eater – Deployment Guide (GitHub Pages)

This project is intentionally simple.

There are **only three files** that matter:

- `index.html`
- `styles.css`
- `app.js`

No build tools. No frameworks. No servers.

---

## ✅ How to Deploy (Recommended)

1. Open this GitHub repository in your browser
2. Click **Add file → Upload files**
3. Upload:
   - `index.html`
   - `styles.css`
   - `app.js`
4. Commit with a message like:
   ```
   Update Picky Eater Generator
   ```
5. Wait ~30 seconds
6. Refresh your GitHub Pages URL

That’s it.

---

## 🧠 How We Work With ChatGPT

- ChatGPT always generates **full replacement files**
- You never merge code
- You never paste snippets
- You upload → commit → refresh

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
