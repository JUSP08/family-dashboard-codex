from __future__ import annotations

import json

from db import get_connection, log_event, utc_now_iso
from models import STATE_KEYS


class StateConflictError(Exception):
    def __init__(self, current_revision: int):
        super().__init__("Dashboard state changed on another device")
        self.current_revision = current_revision


PROTECTED_STATE_KEYS = {
    "childrenData",
    "masterTasks",
    "gigTemplates",
    "calendarSources",
    "calendarFilters",
}


def has_protected_state_changes(payload: dict) -> bool:
    with get_connection() as conn:
        for key in PROTECTED_STATE_KEYS:
            if key not in payload:
                continue
            row = conn.execute(
                "SELECT json_value FROM app_state WHERE key = ?", (key,)
            ).fetchone()
            if row is None:
                continue
            try:
                saved_value = json.loads(row["json_value"])
            except json.JSONDecodeError:
                return True
            if saved_value != payload[key]:
                return True
    return False


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
        "dailyRewards": {},
        "completedTasks": {},
        "dailyCoachTaskManifest": {},
        "gigRequests": [],
        "householdSuggestions": [],
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
        revision_row = conn.execute(
            "SELECT revision FROM state_meta WHERE id = 1"
        ).fetchone()

    for row in rows:
        key = row["key"]
        if key in STATE_KEYS:
            try:
                result[key] = json.loads(row["json_value"])
            except json.JSONDecodeError:
                pass

    result["_revision"] = int(revision_row["revision"]) if revision_row else 0
    return result


def save_full_state(payload: dict, expected_revision: int | None = None) -> dict:
    """
    Save only the known top-level state keys, but preserve the current
    frontend contract by returning the normalized full snapshot.
    """
    updates = {key: payload[key] for key in STATE_KEYS if key in payload}

    now = utc_now_iso()

    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        revision_row = conn.execute(
            "SELECT revision FROM state_meta WHERE id = 1"
        ).fetchone()
        current_revision = int(revision_row["revision"]) if revision_row else 0

        if expected_revision is not None and expected_revision != current_revision:
            raise StateConflictError(current_revision)

        for key, value in updates.items():
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

        next_revision = current_revision
        if updates:
            next_revision += 1
            conn.execute(
                "UPDATE state_meta SET revision = ? WHERE id = 1",
                (next_revision,),
            )

    log_event(
        event_type="state_saved",
        payload={"keys": list(updates.keys()), "revision": next_revision},
        status="success",
        entity_type="app_state",
        entity_id="full_snapshot",
    )

    return get_full_state()
