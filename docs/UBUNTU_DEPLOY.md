# Ubuntu Dashboard Deployment

The Ubuntu dashboard lives at `~/family-dashboard-codex`. Runtime data is kept
outside Git in `backend/data/family_dashboard.db` and `backend/.env`.

## Routine update

### One-click from Windows

Double-click `DeployToUbuntu.bat` in the project folder. The launcher connects
to `sire@192.168.50.242`, pulls the latest `main` branch, runs the guarded
backup/build/restart process, and waits for the dashboard health check. Enter
the Ubuntu password in the terminal window if SSH requests it.

Keep the launcher in the complete project folder beside `ops`, which must
contain `deploy-dashboard-ssh.ps1`. For a Desktop button, create a shortcut to
the original `DeployToUbuntu.bat`; copying only the batch file will not work.
The launcher uses the full script path and reports the expected location if
the script is missing.

To use a different host, user, or remote folder, run the PowerShell wrapper
directly:

```powershell
.\ops\deploy-dashboard-ssh.ps1 `
  -UbuntuHost "192.168.50.242" `
  -SshUser "sire" `
  -RemotePath "~/family-dashboard-codex"
```

### Directly on Ubuntu

Connect to the Ubuntu computer and run:

```bash
ssh sire@192.168.50.242
cd ~/family-dashboard-codex
./ops/update-dashboard.sh
```

The script:

1. Refuses to overwrite tracked local source changes or divergent history.
2. Fetches and fast-forwards to `origin/main`.
3. Stops only the Python dashboard process listening on port 8099.
4. Backs up the newest dashboard database, `.env`, and prior commit ID under
   `~/family-dashboard-backups/<timestamp>/`.
5. Restores the database to the canonical `backend/data` location.
6. Updates Python and Node dependencies and builds the frontend.
7. Starts the backend and waits for a successful health check.

The project pins a Playwright release with Ubuntu 26.04 support so the
Qustodio token-refresh browser can be installed during deployment.

The backend also maintains a persistent weekly pool of up to 100 Daily
Sparkles. It refills the pool in a background worker at the beginning of each
ISO week, so child button presses are fast and do not expose the Gemini API
key. `GEMINI_POOL_TIMEOUT_SECONDS` controls the batch request timeout and
defaults to 90 seconds.

After restart, a separate worker creates at most one original dashboard
background per local date using the existing `GEMINI_API_KEY`, preparing both
today and tomorrow. The header previews tomorrow's theme beside today's;
its name is available before the artwork finishes. The default
image model is `gemini-3.1-flash-image`; optional overrides are
`GEMINI_IMAGE_MODEL`, `GEMINI_THEME_TIMEOUT_SECONDS`, and
`GEMINI_THEME_IMAGE_SIZE`. Images in `backend/data/themes` are a regenerable
cache and do not need to be restored with the database. If generation fails,
the dashboard keeps its built-in daily gradient and retries later.

After it succeeds, open `http://192.168.50.242:8099/` and use `Ctrl+F5` if the
browser still shows an older bundle.

## Verify manually

```bash
cd ~/family-dashboard-codex
git rev-parse --short HEAD
curl -fsS http://127.0.0.1:8099/health
tail -n 30 backend/dashboard.log
```

## One-time recovery from pre-rewrite history

If the script reports that the checkout cannot fast-forward, first protect the
runtime data. Stop the dashboard, copy the newest database and `backend/.env`
outside the repository, then update the rewritten branch:

```bash
cd ~/family-dashboard-codex
git fetch --prune origin
git reset --hard origin/main
```

Restore the database to `backend/data/family_dashboard.db`, restore
`backend/.env`, and run `./ops/update-dashboard.sh`. The hard reset is only for
this one-time transition; routine deployments use the guarded fast-forward
workflow above.

## Private configuration

Keep installation-specific values in `backend/.env`. At minimum, verify the
settings needed by the enabled integrations:

```text
DASHBOARD_ADMIN_PIN
GOOGLE_API_KEY
HA_TOKEN
TOKEN or QUSTODIO_TOKEN
QUSTODIO_ACCOUNT_UID
QUSTODIO_PROFILES_JSON
```

Never paste these values into chat, commit them, or include them in screenshots.

## Backups and rollback

Every routine update prints its backup directory. To restore data, stop the
dashboard and copy that directory's `family_dashboard.db` and `.env` back into
`backend/data/family_dashboard.db` and `backend/.env`, then restart the backend.
