# School email reminders

Prepared extension to the existing weekday 07:30 America/New_York briefing. Requires explicit user approval for external email summarization before setting `SCHOOL_EMAIL_OPENROUTER_APPROVED=true` in the private backend environment. Until then the reader cannot run. Morning playback and bus monitoring keep their existing configuration.

The read-only Gmail reader checks INBOX every 15 minutes using EXAMINE and BODY.PEEK. It searches the last 14 days for parentsquare.com, bethel.k12.ct.us and sportsyou.com, validates the actual From domain and bounds each pull to 60 messages. It never sends, deletes, marks read or edits calendar entries. Attachments and HTML-only/login-only notices are not processed.

Known private-report subjects and digest sections are excluded; URLs and addresses are stripped. This is a best-effort privacy filter, not a guarantee that no names or personal details remain. With explicit consent, remaining selected text goes to the existing OpenRouter provider/model for a tool-free JSON summary. The reader verifies source identifiers, verbatim supporting excerpts, date bounds, output size and completion status. AI summaries can still be wrong; dashboard links let the family inspect originals. Optional activities should retain conditional wording.

Private credential and feed files reside in ~/.config/family-dashboard-school-email, directory 0700 and files 0600. No raw-mail archive is saved by this reader. Minimal reminders, supporting excerpts and source links are cached; unchanged mail reuses summaries. Failed refreshes omit email reminders and produce a visible/spoken warning; results older than six hours or for a different briefing date are rejected. Existing briefing caches retain up to 30 days of generated payloads. No new credential is committed to source.

Deployment status: prepared, not deployed. Live extraction is pending permission and successful verification. Tests cover read-only fetches, stale feeds, source/evidence rejection and approval gating. Existing bus-priority and once-only speaker delivery logic is unchanged.
