from __future__ import annotations

import json

from db import get_connection, log_event, utc_now_iso
from models import STATE_KEYS


def default_state() -> dict:
    return {
        "childrenData": [],
        "wallet": {},
        "customEvents": [],
        "hiddenEventIds": [],
        "masterTasks": [],
        "gigs": [],
        "gigTemplates": [],
        "calendarSources": [],
        "calendarFilters": [],
    }


def get_full_state() -> dict:
    """
    Return only keys that actually exist in the database.

    This is important because the frontend currently:
    1. boots from localStorage/defaults
    2. then hydrates from /api/state

    If we return empty arrays for everything before import,
    the frontend will overwrite its useful defaults with empties.
    """
    result = {}

    with get_connection() as conn:
        rows = conn.execute("SELECT key, json_value FROM app_state").fetchall()

    for row in rows:
        key = row["key"]
        if key in STATE_KEYS:
            try:
                result[key] = json.loads(row["json_value"])
            except json.JSONDecodeError:
                pass

    return result


def save_full_state(payload: dict) -> dict:
    """
    Save only the known top-level state keys, but preserve the current
    frontend contract by returning the normalized full snapshot.
    """
    normalized = default_state()

    for key in STATE_KEYS:
        if key in payload:
            normalized[key] = payload[key]

    now = utc_now_iso()

    with get_connection() as conn:
        for key, value in normalized.items():
            conn.execute(
                """
                INSERT INTO app_state (key, json_value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    json_value=excluded.json_value,
                    updated_at=excluded.updated_at
                """,
                (key, json.dumps(value, ensure_ascii=False), now),
            )

    log_event(
        event_type="state_saved",
        payload={"keys": list(normalized.keys())},
        status="success",
        entity_type="app_state",
        entity_id="full_snapshot",
    )

    return normalized