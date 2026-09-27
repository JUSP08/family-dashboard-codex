from __future__ import annotations

import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from config import settings
from db import get_connection, log_event, utc_now_iso
from services.notify_service import send_daily_reward_notification


LOOKBACK_DAYS = 7


def _load_json(conn, key: str, default):
    row = conn.execute(
        "SELECT json_value FROM app_state WHERE key = ?", (key,)
    ).fetchone()
    if not row:
        return default
    try:
        return json.loads(row["json_value"])
    except (TypeError, json.JSONDecodeError):
        return default


def _reward_minutes(completion_pct: float) -> int:
    if completion_pct > 90:
        return 75
    if completion_pct >= 61:
        return 60
    if completion_pct >= 31:
        return 40
    if completion_pct >= 10:
        return 20
    return 0


def _task_is_scheduled(task: dict, weekday: int) -> bool:
    days = task.get("days")
    if isinstance(days, list) and days:
        return weekday in days
    recurrence = str(task.get("recurrence", "daily")).lower()
    if recurrence == "schooldays":
        return weekday <= 5
    return True


def process_daily_rewards(now: datetime | None = None) -> list[dict]:
    timezone = ZoneInfo(settings.dashboard_timezone)
    local_now = now.astimezone(timezone) if now else datetime.now(timezone)
    final_date = local_now.date()
    if (local_now.hour, local_now.minute) < (23, 55):
        final_date -= timedelta(days=1)
    first_date = final_date - timedelta(days=LOOKBACK_DAYS - 1)
    payouts: list[dict] = []
    changed = False

    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        children = _load_json(conn, "childrenData", [])
        tasks = _load_json(conn, "masterTasks", [])
        task_manifest = _load_json(conn, "dailyCoachTaskManifest", {})
        completed = _load_json(conn, "completedTasks", {})
        rewards = _load_json(conn, "dailyRewards", {})
        wallet = _load_json(conn, "wallet", {})

        # A brand-new installation is initialized by the first dashboard client.
        # Do not create maintenance-only state before that bootstrap occurs.
        if not children or (not tasks and not task_manifest):
            return []

        process_date = first_date
        while process_date <= final_date:
            date_key = process_date.isoformat()
            maintenance_key = f"{date_key}-maintenance"
            weekday = process_date.isoweekday()
            manifest_tasks = task_manifest.get(date_key)
            tasks_for_date = manifest_tasks if isinstance(manifest_tasks, list) else tasks

            if weekday != 6:
                for child in children:
                    if child.get("role") != "child":
                        continue
                    child_id = str(child.get("id", ""))
                    reward_key = f"{date_key}-{child_id}"
                    if not child_id or reward_key in rewards:
                        continue

                    child_tasks = [
                        task
                        for task in tasks_for_date
                        if (
                            "all" in task.get("assignees", [])
                            or child_id in task.get("assignees", [])
                        )
                        and (
                            isinstance(manifest_tasks, list)
                            or _task_is_scheduled(task, weekday)
                        )
                    ]
                    if not child_tasks:
                        continue

                    completed_count = sum(
                        1
                        for task in child_tasks
                        if completed.get(f"{date_key}-{child_id}-{task.get('id')}")
                    )
                    completion_pct = completed_count / len(child_tasks) * 100
                    rounded_pct = round(completion_pct)
                    minutes = _reward_minutes(completion_pct)

                    child_wallet = wallet.get(child_id, {})
                    if minutes:
                        wallet[child_id] = {
                            **child_wallet,
                            "time": min(
                                settings.max_time_balance_minutes,
                                int(child_wallet.get("time", 0) or 0) + minutes,
                            ),
                            "money": float(child_wallet.get("money", 0) or 0),
                        }
                        payouts.append(
                            {
                                "child_id": child_id,
                                "child_name": child.get("name", "Child"),
                                "amount": minutes,
                                "completion_pct": rounded_pct,
                                "date": date_key,
                            }
                        )

                    rewards[reward_key] = {
                        "paid": True,
                        "pct": rounded_pct,
                        "minutes": minutes,
                        "completed": completed_count,
                        "total": len(child_tasks),
                        "scale": "sliding",
                    }
                    changed = True

            if maintenance_key not in rewards:
                rewards[maintenance_key] = True
                changed = True
            process_date += timedelta(days=1)

        cutoff = first_date.isoformat()
        pruned = {
            key: value
            for key, value in completed.items()
            if len(key) < 10 or key[:10] >= cutoff
        }
        if pruned != completed:
            completed = pruned
            changed = True

        if changed:
            now_iso = utc_now_iso()
            for key, value in (
                ("wallet", wallet),
                ("dailyRewards", rewards),
                ("completedTasks", completed),
            ):
                conn.execute(
                    """
                    INSERT INTO app_state (key, json_value, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(key) DO UPDATE SET
                        json_value = excluded.json_value,
                        updated_at = excluded.updated_at
                    """,
                    (key, json.dumps(value, ensure_ascii=False), now_iso),
                )
            conn.execute("UPDATE state_meta SET revision = revision + 1 WHERE id = 1")

    for payout in payouts:
        send_daily_reward_notification(payout)
        log_event(
            event_type="daily_reward_paid",
            payload=payout,
            status="success",
            entity_type="daily_reward",
            entity_id=f"{payout['date']}-{payout['child_id']}",
        )

    return payouts
