from __future__ import annotations

import requests
from urllib.parse import quote

from config import settings


def fetch_calendar_events(calendar_id: str, time_min: str, time_max: str) -> tuple[dict, int]:
    if not settings.google_api_key:
        return {"success": False, "error": "GOOGLE_API_KEY is not configured"}, 503
    if not calendar_id or not time_min or not time_max:
        return {"success": False, "error": "calendarId, timeMin, and timeMax are required"}, 400

    url = f"https://www.googleapis.com/calendar/v3/calendars/{quote(calendar_id, safe='')}/events"
    try:
        response = requests.get(
            url,
            params={
                "key": settings.google_api_key,
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": "true",
                "orderBy": "startTime",
            },
            timeout=settings.google_timeout_seconds,
        )
        data = response.json()
    except requests.RequestException as exc:
        return {"success": False, "error": str(exc)}, 502
    except ValueError:
        return {"success": False, "error": "Google Calendar returned invalid data"}, 502

    if not response.ok:
        message = data.get("error", {}).get("message") or "Google Calendar request failed"
        return {"success": False, "error": message}, response.status_code
    return data, 200
