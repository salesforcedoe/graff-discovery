# Graff Dealership Visit — Discovery App

Static, single-folder web app for capturing notes during the June 9, 2026 Graff visit. Notes save automatically to your browser's localStorage. One-click export to markdown when you're done.

## Run locally

Just open `index.html` in a browser. No build step.

```
open /Users/sam.liang/claude-projects/GM/OEM/Graff/app/index.html
```

## Deploy to GitHub Pages

1. Create a new public repo (e.g. `graff-discovery`):
   ```
   cd /Users/sam.liang/claude-projects/GM/OEM/Graff/app
   git init -b main
   git add .
   git commit -m "Initial Graff discovery app"
   gh repo create graff-discovery --public --source=. --push
   ```
2. Enable Pages on the repo:
   ```
   gh api repos/{owner}/graff-discovery/pages -X POST -f source[branch]=main -f source[path]=/
   ```
   Or in the UI: **Settings → Pages → Source: Deploy from branch → main / (root) → Save**.
3. Public URL will be: `https://{your-github-username}.github.io/graff-discovery/`

Pages takes ~1 min to build the first time. After that, every push to `main` redeploys.

## Notes

- **Privacy:** All data stays in *your* browser. No backend, no tracking. If a teammate visits the same URL, they see a blank slate — their notes are independent.
- **Persistence:** localStorage survives browser restarts but is wiped if you clear site data. Export to markdown before any sketchy moment (running low on iPad battery, switching browsers, etc.).
- **Print:** `Cmd+P` produces a clean printable view (sidebar and buttons hidden, textarea content preserved).
- **Editing questions:** edit `data.js` and redeploy.

## File layout

```
app/
├── index.html    # Page structure + persona sections
├── styles.css    # Layout, typography, print styles
├── app.js        # Render, autosave, export, clear
├── data.js       # Question text (edit here to change questions)
└── README.md     # This file
```
