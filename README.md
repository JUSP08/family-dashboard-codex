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

## Private configuration

Copy `backend/.env.example` to `backend/.env` and configure:

- A private four-digit `DASHBOARD_ADMIN_PIN` and long random `DASHBOARD_SECRET_KEY`
- Qustodio email, password, token, account UID, and child profile UID map
- `GOOGLE_API_KEY` for Google Calendar; the key remains on the backend
- Home Assistant URL, token, webhook IDs, and optional entity allowlist

Normal family interactions remain available on the trusted home network. Admin
configuration, direct notification/Qustodio calls, and token refresh require a
server-validated admin session. The Qustodio token is never returned to the
browser.

Redemptions use unique transaction IDs. Qustodio retries retain that ID, stop
after five attempts or 48 hours, and then require manual review. Daily rewards
are calculated once by the backend and catch up after downtime.

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

Daily Sparkles are served from a persistent weekly pool. A background worker
generates up to 100 varied, schema-validated Sparkles at the start of each ISO
week. Any child can press the Sparkle refresh button to consume the next item;
the Gemini key remains private on the backend.

## Data, backups, and deployment

Runtime data is stored only in `backend/data/family_dashboard.db`. Database and
environment files are excluded from Git. Before updating, stop the dashboard
and copy the database plus `backend/.env` to encrypted storage.

On Ubuntu, routine updates are handled by the guarded deployment script:

```bash
cd ~/family-dashboard-codex
./ops/update-dashboard.sh
```

From Windows, double-click `DeployToUbuntu.bat` to perform the same guarded
update, build, restart, and health check over SSH.

See [`docs/UBUNTU_DEPLOY.md`](docs/UBUNTU_DEPLOY.md) for the full update,
verification, one-time history migration, and rollback instructions.

On Windows, `RunScript.bat` rebuilds the latest frontend and starts the backend.
Restoring consists of replacing the stopped dashboard's database and `.env`
with the backed-up copies before restarting.

## Smart Home validation status

The Smart Home implementation was checked with:

- Vite production build
- Python bytecode compilation
- Flask endpoint setup-state test
- Browser navigation and visual verification

Live entity discovery and device actions require a valid `HA_TOKEN` on the
deployment host.
