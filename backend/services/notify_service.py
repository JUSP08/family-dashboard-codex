from __future__ import annotations

from datetime import datetime, timedelta, timezone

import requests

from config import settings
from db import get_connection, log_event, utc_now_iso


def enqueue_notification(title: str, message: str, payload: dict, last_error: str) -> None:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=1)
    next_retry_at = now + timedelta(hours=6)

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO notification_queue (
                title,
                message,
                status,
                retry_count,
                next_retry_at,
                expires_at,
                created_at,
                last_error
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                title,
                message,
                "pending",
                0,
                next_retry_at.isoformat(),
                expires_at.isoformat(),
                utc_now_iso(),
                last_error,
            ),
        )

    log_event(
        event_type="notification_queued",
        payload=payload,
        status="pending",
        entity_type="notification",
        entity_id="ha_redemption_webhook",
    )


def send_redemption_notification(
    child_name: str,
    amount,
    reward_type: str,
    target: str,
) -> dict:
    payload = {
        "child_name": child_name,
        "amount": amount,
        "type": reward_type,
        "target": target,
    }

    title = f"💰 Redemption: {child_name}"
    message = f"{amount} {reward_type} for {target}"

    webhook_url = f"{settings.ha_url}/api/webhook/{settings.ha_redemption_webhook_id}"

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            timeout=settings.ha_notify_timeout_seconds,
        )
        response.raise_for_status()

        log_event(
            event_type="notification_sent",
            payload=payload,
            status="success",
            entity_type="notification",
            entity_id="ha_redemption_webhook",
        )

        return {
            "success": True,
            "status": "sent",
            "title": title,
            "message": message,
            "webhook_id": settings.ha_redemption_webhook_id,
        }

    except Exception as exc:
        enqueue_notification(
            title=title,
            message=message,
            payload=payload,
            last_error=str(exc),
        )

        log_event(
            event_type="notification_failed",
            payload={**payload, "error": str(exc)},
            status="queued",
            entity_type="notification",
            entity_id="ha_redemption_webhook",
        )

        return {
            "success": True,
            "status": "queued",
            "title": title,
            "message": message,
            "webhook_id": settings.ha_redemption_webhook_id,
            "error": str(exc),
        }