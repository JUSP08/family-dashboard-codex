from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation

from db import get_connection, log_event, utc_now_iso
from services.notify_service import send_redemption_notification
from services.qustodio_exact import QustodioController
from services.qustodio_service import grant_tablet_time


class RedemptionError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


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


def _response_for_existing(conn, row) -> dict:
    wallet = _load_json(conn, "wallet", {})
    revision_row = conn.execute(
        "SELECT revision FROM state_meta WHERE id = 1"
    ).fetchone()
    return {
        "success": True,
        "status": row["status"],
        "redemption_id": row["id"],
        "notification_status": row["notification_status"],
        "qustodio_status": row["qustodio_status"],
        "wallet": wallet,
        "revision": int(revision_row["revision"]) if revision_row else 0,
        "duplicate": True,
    }


def redeem(
    redemption_id: str,
    child_id: str,
    child_name: str,
    reward_type: str,
    target: str,
    amount,
) -> dict:
    if not redemption_id or len(redemption_id) > 100:
        raise RedemptionError("A valid redemption_id is required")
    if reward_type not in {"time", "money"}:
        raise RedemptionError("type must be time or money")

    try:
        decimal_amount = Decimal(str(amount))
    except (InvalidOperation, ValueError):
        raise RedemptionError("amount must be a number") from None

    maximum = Decimal("480") if reward_type == "time" else Decimal("1000")
    if decimal_amount <= 0 or decimal_amount > maximum:
        raise RedemptionError(f"amount must be between 0 and {maximum}")
    if reward_type == "time" and decimal_amount != decimal_amount.to_integral_value():
        raise RedemptionError("time redemptions must use whole minutes")

    now = utc_now_iso()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        existing = conn.execute(
            "SELECT * FROM redemptions WHERE id = ?", (redemption_id,)
        ).fetchone()
        if existing:
            return _response_for_existing(conn, existing)

        wallet = _load_json(conn, "wallet", {})
        children = _load_json(conn, "childrenData", [])
        child = next(
            (item for item in children if str(item.get("id")) == child_id), None
        )
        resolved_name = str((child or {}).get("name") or child_name).strip()
        if not child_id or not resolved_name:
            raise RedemptionError("A valid child is required")

        child_wallet = wallet.get(child_id, {})
        try:
            current_balance = Decimal(str(child_wallet.get(reward_type, 0)))
        except (InvalidOperation, ValueError):
            raise RedemptionError("The saved wallet balance is invalid", 409) from None

        if decimal_amount > current_balance:
            raise RedemptionError(
                f"Insufficient balance. Available: {current_balance}", 409
            )

        next_balance = current_balance - decimal_amount
        stored_amount = int(decimal_amount) if reward_type == "time" else float(decimal_amount)
        stored_balance = int(next_balance) if reward_type == "time" else float(next_balance)
        wallet[child_id] = {
            **child_wallet,
            reward_type: stored_balance,
        }
        conn.execute(
            """
            INSERT INTO app_state (key, json_value, updated_at)
            VALUES ('wallet', ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                json_value = excluded.json_value,
                updated_at = excluded.updated_at
            """,
            (json.dumps(wallet, ensure_ascii=False), now),
        )
        conn.execute("UPDATE state_meta SET revision = revision + 1 WHERE id = 1")
        revision = int(
            conn.execute("SELECT revision FROM state_meta WHERE id = 1").fetchone()[
                "revision"
            ]
        )
        conn.execute(
            """
            INSERT INTO redemptions (
                id, child_id, child_name, reward_type, target, amount,
                balance_before, balance_after, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?)
            """,
            (
                redemption_id,
                child_id,
                resolved_name,
                reward_type,
                target,
                stored_amount,
                float(current_balance),
                float(next_balance),
                now,
                now,
            ),
        )

    notification = send_redemption_notification(
        child_name=resolved_name,
        amount=stored_amount,
        reward_type="minutes" if reward_type == "time" else reward_type,
        target=target,
    )

    qustodio_status = "not_applicable"
    normalized_target = target.lower()
    if reward_type == "time" and (
        "tablet" in normalized_target or "ipad" in normalized_target
    ):
        controller = QustodioController()
        qustodio_uid = str((child or {}).get("qustodioUid") or "").strip()
        qustodio_uid = qustodio_uid or controller.kids.get(resolved_name.lower(), "")
        if qustodio_uid:
            qustodio = grant_tablet_time(
                uid=qustodio_uid,
                name=resolved_name.lower(),
                minutes=int(decimal_amount),
                child_id=child_id,
                redemption_id=redemption_id,
            )
            qustodio_status = qustodio.get("status", "unknown")
        else:
            qustodio_status = "missing_profile"

    notification_status = notification.get("status", "unknown")
    final_status = (
        "attention_required" if qustodio_status == "missing_profile" else "accepted"
    )
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE redemptions
            SET status = ?, notification_status = ?, qustodio_status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                final_status,
                notification_status,
                qustodio_status,
                utc_now_iso(),
                redemption_id,
            ),
        )

    log_event(
        event_type="redemption_processed",
        payload={
            "redemption_id": redemption_id,
            "child_id": child_id,
            "type": reward_type,
            "amount": stored_amount,
            "notification_status": notification_status,
            "qustodio_status": qustodio_status,
        },
        status=final_status,
        entity_type="redemption",
        entity_id=redemption_id,
    )

    return {
        "success": True,
        "status": final_status,
        "redemption_id": redemption_id,
        "notification_status": notification_status,
        "qustodio_status": qustodio_status,
        "wallet": wallet,
        "revision": revision,
        "duplicate": False,
    }
