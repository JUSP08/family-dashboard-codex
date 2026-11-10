# Morning briefing (preview, disabled)

Requested schedule: 7:30 AM Monday–Friday, America/New_York. Dashboard plus the exact All Speakers Cast group. Content: Bethel weather, the existing family calendars, calendar-based school reminders, and bus-alert health.

**Scheduled playback is disabled by default. Do not set MORNING_BRIEFING_ENABLED=true until the user approves the preview.** No API or UI button enables it. `/api/morning-briefing` only reads sources and caches the text; it never calls a speaker service.

The preview uses configured calendar feeds and custom events, respecting the dashboard's existing hidden-event, title-filter, school-sports and deduplication code. Calendar titles provide school reminders; Gmail is not scanned. Missing sources produce explicit notices instead of an empty-day claim. Forecast: Open-Meteo, same Bethel coordinates as the existing dashboard. Bus health is a current system check, not a prediction of arrival.

After approval, enable the environment flag and restart only the dashboard. The scheduler runs in the backend (no wall browser needs to remain open). It claims one delivery per Eastern date in a separate `morning_briefing.db` before attempting speech. No replay after an uncertain response, restart, or outside the 7:30–7:35 window. A busy/unavailable speaker group or active bus arrival skips the briefing; bus alerts retain priority. Weather/calendar reads never change events or thermostat settings. Content is generated afresh for the scheduled run; preview caching is five minutes. Speech contains at most five agenda items and three school reminders, with the full list on the dashboard.

Persistence: `morning_briefing.db` next to the configured main database. It contains family schedule titles and generated text, so protect/back it up like the dashboard database. Delivery status records represent software outcomes, never proof of sound in each room.

Tests: `PYTHONPATH=backend python -m unittest backend.tests.test_morning_briefing`; `node --test ops/briefing-calendar-filter.test.mjs`. All speech calls in tests are mocked. `ops/preview-morning-briefing.py` uses live read-only sources and a temporary cache, and asserts scheduled playback is disabled.
