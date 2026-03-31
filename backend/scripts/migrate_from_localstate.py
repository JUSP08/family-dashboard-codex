from __future__ import annotations

import json
import sys
from pathlib import Path

# Make backend imports work when running from backend/scripts/
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db import init_db, log_event  # noqa: E402
from services.state_service import save_full_state  # noqa: E402


LOCAL_TO_STATE_KEY = {
    "familyChildren": "childrenData",
    "familyWallet": "wallet",
    "familyCustomEvents": "customEvents",
    "familyHiddenEvents": "hiddenEventIds",
    "familyMasterTasks": "masterTasks",
    "familyGigs": "gigs",
    "gigTemplates": "gigTemplates",
    "calendarSources": "calendarSources",
    "calendarFilters": "calendarFilters",
}


def parse_nested_json(value):
    """
    The export file stores each localStorage value as a JSON string.
    Example:
      "familyWallet": "{\"c3\":{\"money\":1,\"time\":352}}"
    So we need to json.loads() the outer file, then json.loads() each value.
    """
    if value is None:
        return None

    if isinstance(value, (dict, list)):
        return value

    if isinstance(value, str):
        value = value.strip()
        if value == "":
            return None
        return json.loads(value)

    raise TypeError(f"Unsupported nested JSON value type: {type(value)}")


def build_state_from_export(export_data: dict) -> dict:
    state = {}

    for local_key, state_key in LOCAL_TO_STATE_KEY.items():
        if local_key not in export_data:
            continue

        raw_value = export_data[local_key]
        parsed_value = parse_nested_json(raw_value)
        state[state_key] = parsed_value

    return state


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage:")
        print(r"  python scripts\migrate_from_localstate.py <path-to-localstate-export.json>")
        sys.exit(1)

    input_path = Path(sys.argv[1]).resolve()

    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    print(f"Reading local state export from: {input_path}")

    with input_path.open("r", encoding="utf-8") as f:
        export_data = json.load(f)

    state = build_state_from_export(export_data)

    init_db()
    saved = save_full_state(state)

    summary = {
        key: (len(value) if isinstance(value, list) else ("object" if isinstance(value, dict) else type(value).__name__))
        for key, value in saved.items()
    }

    log_event(
        event_type="state_import",
        payload={
            "source": "localstate_export",
            "input_path": str(input_path),
            "imported_keys": list(saved.keys()),
            "summary": summary,
        },
        status="success",
        entity_type="migration",
        entity_id="localstate",
    )

    print("Import complete.")
    print("Imported keys:")
    for key in saved.keys():
        value = saved[key]
        if isinstance(value, list):
            print(f"  - {key}: list[{len(value)}]")
        elif isinstance(value, dict):
            print(f"  - {key}: object[{len(value)} keys]")
        else:
            print(f"  - {key}: {type(value).__name__}")


if __name__ == "__main__":
    main()