# Puspakom Dashboard — Team-Shared Version

The vehicle-inspection scheduling dashboard, backed by a small server so the **whole team
shares one set of records** (instead of each browser keeping its own). Protected by a shared
team passcode.

- **Frontend**: `public/index.html` — the dashboard (same features: pipeline, calendar,
  overdue/expiring alerts, WhatsApp buttons), rewired to read/write the server instead of the
  browser's local storage.
- **Backend**: `server.js` (Express) — passcode login + a shared data store.
- **Data**: stored on the server as `data/store.json`, with version numbers so two people
  saving at once don't silently overwrite each other.

## Run locally (for testing, free)

1. `npm install`
2. Copy `.env.example` to `.env` and set a passcode:
   ```
   ACCESS_CODE=pick-a-team-passcode
   PORT=4000
   ```
3. `npm start`
4. Open `http://localhost:4000`, enter the passcode. On first run it loads demo data — use
   **Clear demo data**, then add/import your real vehicles.

Everyone who opens the same server URL and enters the passcode sees and edits the **same** data.

## Putting it online (go live)

You need two accounts (free to start) — **only you can create these; I can't**:

1. **GitHub** (github.com) — stores the code.
2. **A host that runs Node** — e.g. **Render** (render.com). GitHub Pages will NOT work: it
   only serves static files and can't run the server or hold shared data.

### Step A — push the code to GitHub
After you've created a GitHub account and a new **private** repo called `puspakom-team`:
```
git remote add origin https://github.com/<your-username>/puspakom-team.git
git branch -M main
git push -u origin main
```
(`.env` and `data/store.json` are git-ignored, so your passcode and data never get uploaded.)

### Step B — deploy on Render
1. New → **Web Service** → connect your GitHub repo.
2. Build command: `npm install` · Start command: `npm start`.
3. Add an **Environment Variable**: `ACCESS_CODE` = your team passcode.
4. ⚠️ **Add a Persistent Disk** (Render → your service → Disks), mount it at e.g. `/data`, and
   add env var `DATA_DIR=/data`. **Without a persistent disk, the free tier wipes the data file
   on every restart/redeploy — you would lose your records.** This is the one paid piece
   (a small disk is ~USD 1–7/month).
5. Deploy. Render gives you a URL like `https://puspakom-team.onrender.com` — share it with
   your team along with the passcode.

## Security notes

- The passcode is the only gate — it holds customer names, phone numbers, plates, and your
  charges/profit. Choose a non-obvious passcode and share it only with your team.
- Never commit `.env` (it's git-ignored). Set the real passcode as an env var on the host.
- Any future AI key (DeepSeek) goes in the host's env vars / `.env` — server-side only, never
  in `public/`, which anyone can view.

## Backups

The **Backup** button still works — export a JSON copy regularly and keep it somewhere safe
(OneDrive). That's your safety net if the host has a problem.

## Known limitation (v1)

Saving replaces the whole dataset with version-check protection: if two people save within the
same few seconds, the second is told to reload rather than overwrite. Everyone's view
auto-refreshes every ~7 seconds. For a small team editing mostly different vehicles this is
fine; per-record saving is a future hardening step.
