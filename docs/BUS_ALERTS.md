# Bus alerts

The Bus monitor icon beside the Home calendar controls opens status and history.
Monitoring remains active on every dashboard view, and an approaching-bus banner
still appears prominently without opening the icon. Warning status is marked on
the icon. The monitor observes the existing Home Assistant automation; it cannot
send speech, change devices, or alter email.

- A matching, fresh weekday-morning email produces a ten-minute arrival banner, timed from the email date.
- Status uses Home Assistant's saved automation traces and a live `imap_content` subscription. A completed TTS service action is labeled **Speech action completed**, never **Heard** or **Delivered to every room**.
- Skipped afternoon, old-message, and duplicate runs appear in history. Morning blocked conditions, action errors, and emails without a completed run after 60 seconds produce a warning.
- Connection failures, disabled automation, unloaded IMAP integration, unavailable speaker group/provider, and stale monitoring produce visible warnings. The browser also reports dashboard connection failures.
- Separate `bus_alerts.db`, beside the main database, persists 30 days of records; the API returns the newest 100. Only first names, dates, run IDs, and sanitized results are stored, not email bodies, stop addresses, or credentials.
- Existing retained HA traces are imported at startup. An outage can leave a history gap. An email that never reaches Home Assistant cannot be detected; the monitor does not infer school days, holidays, cancellations, or absent emails.

## Configuration and operations

Uses the dashboard's existing server-side `HA_URL` / `HA_TOKEN`. The token needs access to trace history; HA requires administrator privileges for that interface. No token is sent to the browser. The observer starts with `backend/app.py`, reconnects after failure, and polls traces and health every ten seconds. `/api/bus-alerts` is read-only and follows the dashboard's existing trusted-home-network access model.

The current automation ID, IMAP entry ID, speaker group, and email match are fixed in `backend/services/bus_alert_service.py`. Update them if you replace the HA integration or automation. The observer's failure explanations map to the existing automation's four conditions, so review them if its condition order changes.

Validate with `PYTHONPATH=backend python -m unittest backend.tests.test_bus_alerts`. The tests use a temporary database and no HA writes. `ops/check-bus-monitor.py` is a server-specific read-only live probe using a temporary database. Do not use test email events on the real HA event bus: they could trigger speech.

The morning briefing is a separate follow-up; this change does not create a briefing schedule.
