# School email reminders

Current deployment (2026-11-10): Hermes owns scanning, OpenRouter interpretation, and restricted calendar/reminder updates under explicit user approval. See [HERMES_SCHOOL_EMAIL.md](HERMES_SCHOOL_EMAIL.md). The dashboard scanner is disabled with SCHOOL_EMAIL_OWNER=hermes. The description below documents the retained local fallback only.

Server-only extraction for the existing weekday 07:30 America/New_York briefing. No AI provider or third-party summarizer receives email text. The prior external summarization prototype was replaced at the user's request.

The reader checks Gmail INBOX every 15 minutes using EXAMINE and BODY.PEEK, searching the last 14 days for parentsquare.com, bethel.k12.ct.us and sportsyou.com. It validates From domains and bounds each pull to 60 messages. It never sends, deletes, marks read or edits calendar entries. Attachments, HTML-only/login-only content and known private-report subjects/sections are excluded.

Conservative local rules select short actionable lines with one explicit month/day. Dates are anchored to the message year (December-to-January rollover supported). Ambiguous ranges, relative weekday schedules and long prose are omitted. Events are included on their date, deadlines up to seven days ahead. Optional club/registration notices are conditional. Links on the dashboard lead to original emails. This cannot extract every reminder; consult source notices for details.

Credentials and feed reside in ~/.config/family-dashboard-school-email (directory 0700, files 0600). No raw-mail archive is saved. Minimal reminders, excerpts and source links are cached. Failed refreshes omit email reminders with a visible/spoken warning. Feeds older than six hours or for another briefing day are rejected. Existing briefing caches retain up to 30 days of generated payloads. Secrets are not committed.

Bus-priority, once-only delivery, fixed All Speakers routing, thermostat safeguards and the existing morning schedule remain unchanged.
