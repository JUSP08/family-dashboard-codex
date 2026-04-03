from __future__ import annotations

import datetime
import io
from contextlib import redirect_stdout, redirect_stderr
from datetime import timedelta, timezone

from db import get_connection, log_event, utc_now_iso
from services.qustodio_exact import QustodioController


def enqueue_qustodio_request(
    child_id: str,
    child_name: str,
    minutes: int,
    last_error: str,
) -> None:
    now = datetime.datetime.now(timezone.utc)
    next_retry_at = now + timedelta(hours=6)

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO qustodio_queue (
                child_id,
                child_name,
                qustodio_uid,
                minutes,
                status,
                retry_count,
                next_retry_at,
                created_at,
                last_error,
                related_redemption_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                child_id,
                child_name,
                "",
                minutes,
                "pending",
                0,
                next_retry_at.isoformat(),
                utc_now_iso(),
                last_error,
                None,
            ),
        )


def _run_exact_add_time(name: str, minutes: int, uid: str | None = None) -> tuple[bool, str, str]:
    controller = QustodioController()

    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()

    try:
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            result = controller.add_time(name=name, minutes=minutes, uid=uid)
    except Exception as exc:
        return (
            False,
            f"{type(exc).__name__}: {exc}",
            stdout_buffer.getvalue() + stderr_buffer.getvalue(),
        )

    captured = stdout_buffer.getvalue() + stderr_buffer.getvalue()

    if result is True:
        return True, "Qustodio exact script returned True", captured

    return False, "Qustodio exact script returned False", captured


def grant_tablet_time(
    uid: str,
    name: str,
    minutes: int,
    child_id: str | None = None,
) -> dict:
    success, detail, captured_output = _run_exact_add_time(
        name=name,
        minutes=minutes,
        uid=uid,
    )

    payload = {
        "uid": uid,
        "name": name,
        "minutes": minutes,
        "child_id": child_id,
        "captured_output": captured_output,
    }

    if success:
        log_event(
            event_type="qustodio_request",
            payload=payload,
            status="success",
            entity_type="qustodio",
            entity_id=child_id or name,
        )
        return {
            "success": True,
            "status": "sent",
            "uid": uid,
            "name": name,
            "minutes": minutes,
            "detail": detail,
            "captured_output": captured_output,
        }

    enqueue_qustodio_request(
        child_id=child_id or "",
        child_name=name,
        minutes=minutes,
        last_error=detail,
    )

    log_event(
        event_type="qustodio_request",
        payload={**payload, "error": detail},
        status="queued",
        entity_type="qustodio",
        entity_id=child_id or name,
    )

    return {
        "success": True,
        "status": "queued",
        "uid": uid,
        "name": name,
        "minutes": minutes,
        "detail": detail,
        "captured_output": captured_output,
    }


def retry_qustodio_queue_once() -> None:
    now = datetime.datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, child_id, child_name, minutes
            FROM qustodio_queue
            WHERE status IN ('pending', 'failed')
              AND (next_retry_at IS NULL OR next_retry_at <= ?)
            ORDER BY created_at ASC
            """,
            (now,),
        ).fetchall()

    for row in rows:
        queue_id = row["id"]
        child_id = row["child_id"]
        child_name = row["child_name"]
        minutes = row["minutes"]

        success, detail, captured_output = _run_exact_add_time(
            name=child_name,
            minutes=minutes,
            uid=None,
        )

        with get_connection() as conn:
            if success:
                conn.execute(
                    """
                    UPDATE qustodio_queue
                    SET status = ?, last_error = ?
                    WHERE id = ?
                    """,
                    ("sent", None, queue_id),
                )
            else:
                next_retry_at = (
                    datetime.datetime.now(timezone.utc) + timedelta(hours=6)
                ).isoformat()
                conn.execute(
                    """
                    UPDATE qustodio_queue
                    SET status = ?, retry_count = retry_count + 1, next_retry_at = ?, last_error = ?
                    WHERE id = ?
                    """,
                    ("failed", next_retry_at, detail, queue_id),
                )

        log_event(
            event_type="qustodio_retry",
            payload={
                "queue_id": queue_id,
                "child_name": child_name,
                "minutes": minutes,
                "child_id": child_id,
                "error": detail,
                "captured_output": captured_output,
            },
            status="success" if success else "failed",
            entity_type="qustodio",
            entity_id=str(queue_id),
        )