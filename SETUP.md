# Setup

Two one-time steps: connect the Sheet, then put the site online.

## 1. Connect the Google Sheet (Bi-Weekly Review)

1. Open the "Life and Present Goals" Google Sheet.
2. **Extensions → Apps Script**.
3. Delete anything in the editor, then paste in the contents of `Code.gs` from this folder.
4. **Deploy → New deployment**.
5. Click the gear next to "Select type" → **Web app**.
6. Set "Execute as" = **Me**, "Who has access" = **Anyone**.
7. Click **Deploy**, authorize when prompted (it's your own script on your own Sheet).
8. Copy the **Web app URL** it gives you.
9. Open `js/config.js` in this folder and paste it in:
   ```js
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/xxxxxxx/exec';
   ```

That's it — Bi-Weekly Review will now read and write directly to your Sheet, into a new "Goal Reviews" tab it creates automatically (your Dream Board and Effort tables are left untouched). Every time you edit `Code.gs` in the Apps Script editor, use **Deploy → Manage deployments → edit (pencil) → New version** to push the change live (the URL stays the same).

If you skip this step, the site still works — reviews just save to that browser's local storage instead of the Sheet.

## 2. Put it online with GitHub Pages (free)

This is a one-time setup. The push needs your own GitHub login, so it has to happen from your Terminal, not from Claude.

1. Go to **https://github.com/new** and create a repo (e.g. `goals-hub`). Leave it **public** (GitHub Pages needs that on a free account) and don't add a README/gitignore/license — keep it empty.
2. Open **Terminal** and run, replacing `YOUR-USERNAME` with your GitHub username:
   ```bash
   cd "/Users/randymcfarland/Documents/Claude/goals-hub"
   git init
   git config user.name "Your Name"
   git config user.email "you@example.com"
   git add .
   git commit -m "Initial goals hub site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/goals-hub.git
   git push -u origin main
   ```
   The first push will pop up a browser window to log in to GitHub — that's expected and normal.
3. On GitHub, go to the repo's **Settings → Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. Wait about a minute, then your site is live at `https://YOUR-USERNAME.github.io/goals-hub/`.

**Future edits:** once this is set up, tell Claude what to change. Claude can edit the files and commit locally; you (or Claude, if `git push` is already authenticated on this machine after step 2) run `git push` to publish the update — GitHub Pages picks it up automatically within a minute or two.

## Editing goals

The vision (dream board) and present-focus efforts live in `js/data.js` as plain JS objects — open it and edit directly, or ask Claude to re-sync it from the Sheet after you change the Dream Board / Effort tables there. Category colors are defined at the top of `css/styles.css`.

## Review cadence

Your first bi-weekly review is set for **2026-08-15**, then every 14 days after. Change `REVIEW_ANCHOR_DATE` / `REVIEW_INTERVAL_DAYS` at the top of `js/data.js` if you want a different cadence.
