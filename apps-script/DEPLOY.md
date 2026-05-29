# Deploy the Drive upload endpoint

This is a 5-minute, one-time setup. After this, anyone hitting the **Upload to Drive** button in the app drops their notes file into the Graff folder automatically.

## 1. Create the Apps Script project

1. Go to <https://script.google.com> (signed in as the same Google account that owns the Drive folder)
2. **New project**
3. Delete the default `Code.gs` content
4. Open `Code.gs` from this folder (`/Users/sam.liang/claude-projects/GM/OEM/Graff/app/apps-script/Code.gs`) and paste its full contents
5. Top-left: rename the project to **Graff Discovery Upload**
6. **Save** (⌘S)

## 2. Deploy as a web app

1. Top-right: **Deploy → New deployment**
2. Click the gear icon next to "Select type" → **Web app**
3. Settings:
   - **Description:** `Graff upload v1`
   - **Execute as:** `Me (your email)` — important; this gives the script your write access to Drive
   - **Who has access:** `Anyone` — required so notetakers don't need to sign in
4. **Deploy**
5. Authorize the scopes when prompted (you'll see "Google hasn't verified this app" — click **Advanced → Go to Graff Discovery Upload (unsafe)** because *you* wrote it)
6. Copy the **Web app URL** (ends in `/exec`)

## 3. Wire it into the app

1. Open `/Users/sam.liang/claude-projects/GM/OEM/Graff/app/config.js`
2. Replace `PASTE_APPS_SCRIPT_DEPLOYMENT_URL_HERE` with your `/exec` URL
3. Commit and push:
   ```
   git add config.js
   git commit -m "Wire Drive upload endpoint"
   git push
   ```

## 4. Test

1. Open <https://salesforcedoe.github.io/graff-discovery/>
2. Type a notetaker name + a few characters somewhere
3. Click **Upload to Drive**
4. Open the Drive folder — file should appear within a couple seconds

## Caveats

- `Anyone` access means anyone with the deployment URL can POST to it. The shared secret in `config.js` is a soft guard, not real auth. The blast radius is "stranger drops a markdown file into your folder", which is recoverable. If you want to lock it down further: change `Who has access` to `Anyone with Google account` and tell teammates to sign in once.
- If you redeploy with code changes, **use "Manage deployments" → edit existing deployment → New version**, not New deployment — otherwise the URL changes and the app breaks.
- To rotate the secret: update both `config.js` and `SHARED_SECRET` in `Code.gs`, redeploy.
