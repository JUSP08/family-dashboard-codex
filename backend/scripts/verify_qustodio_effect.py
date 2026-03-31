from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.qustodio_exact import QustodioController  # noqa: E402


def pretty(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


def fetch_usage(controller: QustodioController, uid: str):
    today = __import__("datetime").date.today().isoformat()
    url = f"{controller.base_url}/accounts/{controller.account_uid}/profiles/{uid}/summary_hourly?date={today}"
    res = __import__("requests").get(url, headers=controller.get_auth_header())
    try:
        body = res.json()
    except Exception:
        body = res.text
    return res.status_code, body


def fetch_rules(controller: QustodioController, uid: str):
    url = f"{controller.base_url}/accounts/{controller.account_uid}/profiles/{uid}/rules/calendar_restrictions"
    res = __import__("requests").get(url, headers=controller.get_auth_header())
    try:
        body = res.json()
    except Exception:
        body = res.text
    return res.status_code, body


def main():
    child_name = "tristan"
    minutes = 5

    controller = QustodioController()
    uid = controller.kids.get(child_name)

    if not uid:
        print(f"No UID found for {child_name}")
        sys.exit(1)

    print("=== BEFORE ===")
    usage_status_before, usage_before = fetch_usage(controller, uid)
    rules_status_before, rules_before = fetch_rules(controller, uid)

    print(f"Usage status: {usage_status_before}")
    print(pretty(usage_before))
    print(f"Rules status: {rules_status_before}")
    print(pretty(rules_before))

    print("\n=== RUNNING EXACT SCRIPT ===")
    result = controller.add_time(child_name, minutes)
    print(f"add_time returned: {result}")

    print("\n=== AFTER ===")
    usage_status_after, usage_after = fetch_usage(controller, uid)
    rules_status_after, rules_after = fetch_rules(controller, uid)

    print(f"Usage status: {usage_status_after}")
    print(pretty(usage_after))
    print(f"Rules status: {rules_status_after}")
    print(pretty(rules_after))


if __name__ == "__main__":
    main()