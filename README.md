# Family Dashboard

A React/Vite family command center with a Flask/Waitress backend. The dashboard
includes calendars, Daily Coach activities, gigs, balances, school menus,
suggestions, rewards, and Home Assistant smart-home controls.

## Runtime layout

- `frontend/` - React user interface built with Vite
- `backend/` - Flask API and Waitress production server
- `backend/data/family_dashboard.db` - default SQLite state database
- Backend port: `8099`

## Smart Home tab

The Smart Home tab connects to Home Assistant through the Flask backend. The
Home Assistant token stays on the server and is never sent to the browser.

Supported dashboard controls:

- Lights: on/off and 25%, 60%, or 100% brightness
- Switches, fans, and input booleans
- Media players and Google Cast speakers: play/pause, stop, volume, and mute
- Home Assistant scenes
- Google Assistant speaker announcements
- Climate status display
- Automatic state refresh every 15 seconds

The backend intentionally limits commands to a whitelist of supported entity
domains and actions.

### Home Assistant configuration

Create `backend/.env` from `backend/.env.example`, then configure:

```env
HA_URL=http://192.168.50.50:8123
HA_TOKEN=your-home-assistant-long-lived-access-token
```

Create the token in Home Assistant under **User profile > Security > Long-Lived
Access Tokens**. Home Assistant only displays the token once.

Never commit `backend/.env` or paste its token into chat, issues, logs, or
screenshots.

To display only selected devices, add a comma-separated allowlist:

```env
HA_ENTITY_ALLOWLIST=light.kitchen,light.living_room,media_player.kitchen_speaker
```

Leave `HA_ENTITY_ALLOWLIST` blank to show every supported Home Assistant entity.

Speaker announcements require Home Assistant's Google Assistant SDK integration
and its `notify.google_assistant_sdk` action. Speaker media controls require the
Google Cast or another compatible media-player integration.

### Smart Home API routes

- `GET /api/smart-home/entities` - sanitized supported entity states
- `POST /api/smart-home/action` - validated device actions
- `POST /api/smart-home/broadcast` - Google Assistant announcements

## Build and run

Build the frontend:

```bash
cd frontend
npm ci
npm run build
```

Run the backend from the repository root on Linux:

```bash
./backend/.venv/bin/python backend/app.py
```

Run it on Windows PowerShell:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\app.py
```

The backend serves the production frontend from `frontend/dist`.

## Ubuntu deployment notes

Before pulling an update, protect runtime database and lockfile changes:

```bash
cd ~/family-dashboard-codex
cp backend/backend/data/family_dashboard.db \
  "$HOME/family_dashboard.db.backup-$(date +%Y%m%d-%H%M%S)"
git stash push -m "Ubuntu runtime files before update" -- \
  backend/backend/data/family_dashboard.db \
  frontend/package-lock.json
git pull --ff-only origin main
```

Restore only the live runtime database after pulling:

```bash
git restore --source='stash@{0}' -- \
  backend/backend/data/family_dashboard.db
```

Keep the stash until the rebuilt dashboard has been verified. Then rebuild the
frontend and restart the backend using the host's existing service or startup
method.

## Smart Home validation status

The Smart Home implementation was checked with:

- Vite production build
- Python bytecode compilation
- Flask endpoint setup-state test
- Browser navigation and visual verification

Live entity discovery and device actions require a valid `HA_TOKEN` on the
deployment host.
