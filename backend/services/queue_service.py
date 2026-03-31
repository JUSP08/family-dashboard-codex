from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta, timezone

import requests

from config import settings
from db import get_connection, log_event
from services.qustodio_service import retry_qustodio_queue_once


_WORKER_STARTED = False


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _retry_notification_queue_loop() -> None:
    while True:
        try:
            process_notification_queue()
        except Exception as exc:
            log_event(
                event_type="notification_retry_worker_error",
                payload={"error": str(exc)},
                status="error",
                entity_type="worker",
                entity_id="notification_queue",
            )
        time.sleep(60)


def _retry_qustodio_queue_loop() -> None:
    while True:
        try:
            retry_qustodio_queue_once()
        except Exception as exc:
            log_event(
                event_type="qustodio_retry_worker_error",
                payload={"error": str(exc)},
                status="error",
                entity_type="worker",
                entity_id="qustodio_queue",
            )
        time.sleep(60)


def process_notification_queue() -> None:
    now = _utc_now().isoformat()

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, message, retry_count, next_retry_at, expires_at
            FROM notification_queue
            WHERE status IN ('pending', 'failed')
              AND (next_retry_at IS NULL OR next_retry_at <= ?)
            ORDER BY created_at ASC
            """,
            (now,),
        ).fetchall()

    for row in rows:
        queue_id = row["id"]
        expires_at = row["expires_at"]

        if expires_at and expires_at <= now:
            with get_connection() as conn:
                conn.execute(
                    """
                    UPDATE notification_queue
                    SET status = ?, last_error = ?
                    WHERE id = ?
                    """,
                    ("expired", "Retry window expired", queue_id),
                )
            continue

        try:
            child_name = row["title"].replace("💰 Redemption: ", "", 1)
            message = row["message"]
            left, target = message.split(" for ", 1)
            parts = left.split(" ", 1)
            amount = parts[0]
            reward_type = parts[1] if len(parts) > 1 else ""

            payload = {
                "child_name": child_name,
                "amount": amount,
                "type": reward_type,
                "target": target,
            }

            webhook_url = f"{settings.ha_url}/api/webhook/{settings.ha_redemption_webhook_id}"
            response = requests.post(
                webhook_url,
                json=payload,
                timeout=settings.ha_notify_timeout_seconds,
            )
            response.raise_for_status()

            with get_connection() as conn:
                conn.execute(
                    """
                    UPDATE notification_queue
                    SET status = ?, last_error = ?
                    WHERE id = ?
                    """,
                    ("sent", None, queue_id),
                )

            log_event(
                event_type="notification_retry_sent",
                payload=payload,
                status="success",
                entity_type="notification",
                entity_id=str(queue_id),
            )

        except Exception as exc:
            with get_connection() as conn:
                conn.execute(
                    """
                    UPDATE notification_queue
                    SET status = ?, retry_count = retry_count + 1, next_retry_at = ?, last_error = ?
                    WHERE id = ?
                    """,
                    (
                        "failed",
                        (_utc_now() + timedelta(hours=6)).isoformat(),
                        str(exc),
                        queue_id,
                    ),
                )

            log_event(
                event_type="notification_retry_failed",
                payload={"queue_id": queue_id, "error": str(exc)},
                status="failed",
                entity_type="notification",
                entity_id=str(queue_id),
            )


def start_background_workers() -> None:
    global _WORKER_STARTED

    if _WORKER_STARTED:
        return

    t1 = threading.Thread(target=_retry_notification_queue_loop, daemon=True)
    t1.start()

    t2 = threading.Thread(target=_retry_qustodio_queue_loop, daemon=True)
    t2.start()

    _WORKER_STARTED = True