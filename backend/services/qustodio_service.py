from __future__ import annotations

import datetime
import io
import threading
from contextlib import redirect_stdout, redirect_stderr
from datetime import timedelta, timezone

from db import get_connection, log_event, utc_now_iso
from services.qustodio_exact import QustodioController

TOKEN_REFRESH_INTERVAL_DAYS = 30
_TOKEN_REFRESH_LOCK = threading.Lock()


def enqueue_qustodio_request(
    child_id: str,
    child_name: str,
    qustodio_uid: str,
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
                qustodio_uid,
                minutes,
                "pending",
                0,
                next_retry_at.isoformat(),
                utc_now_iso(),
                last_error,
                None,
            ),
        )


def _mask_token(token: str | None, keep: int = 10) -> str:
    if not token:
        return "(missing)"
    if len(token) <= keep:
        return token
    return f"{token[:keep]}..."


def refresh_qustodio_token(reason: str) -> tuple[bool, str, str]:
    if not _TOKEN_REFRESH_LOCK.acquire(blocking=False):
        return False, "Qustodio token refresh is already running", ""

    controller = QustodioController()
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()

    try:
        try:
            with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                token = controller.refresh_token()
        except Exception as exc:
            detail = f"{type(exc).__name__}: {exc}"
            captured = stdout_buffer.getvalue() + stderr_buffer.getvalue()
            log_event(
                event_type="qustodio_token_refresh",
                payload={"reason": reason, "error": detail, "captured_output": captured},
                status="failed",
                entity_type="qustodio",
                entity_id="token",
            )
            return False, detail, captured

        captured = stdout_buffer.getvalue() + stderr_buffer.getvalue()
        if token:
            detail = f"Qustodio token refreshed ({_mask_token(token)})"
            log_event(
                event_type="qustodio_token_refresh",
                payload={"reason": reason, "detail": detail, "captured_output": captured},
                status="success",
                entity_type="qustodio",
                entity_id="token",
            )
            return True, detail, captured

        detail = "Qustodio token refresh returned no token"
        log_event(
            event_type="qustodio_token_refresh",
            payload={"reason": reason, "error": detail, "captured_output": captured},
            status="failed",
            entity_type="qustodio",
            entity_id="token",
        )
        return False, detail, captured
    finally:
        _TOKEN_REFRESH_LOCK.release()


def refresh_qustodio_token_if_due() -> None:
    with get_connection() as conn:
        latest_success = conn.execute(
            """
            SELECT created_at
            FROM event_log
            WHERE event_type = ?
              AND entity_type = ?
              AND entity_id = ?
              AND status = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            ("qustodio_token_refresh", "qustodio", "token", "success"),
        ).fetchone()
        latest_attempt = conn.execute(
            """
            SELECT created_at
            FROM event_log
            WHERE event_type = ?
              AND entity_type = ?
              AND entity_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            ("qustodio_token_refresh", "qustodio", "token"),
        ).fetchone()

    now = datetime.datetime.now(timezone.utc)

    if latest_success is not None:
        try:
            last_refresh = datetime.datetime.fromisoformat(latest_success["created_at"])
        except ValueError:
            last_refresh = None

        if last_refresh is not None:
            if last_refresh.tzinfo is None:
                last_refresh = last_refresh.replace(tzinfo=timezone.utc)
            if now - last_refresh < timedelta(days=TOKEN_REFRESH_INTERVAL_DAYS):
                return

    if latest_attempt is not None:
        try:
            last_attempt = datetime.datetime.fromisoformat(latest_attempt["created_at"])
        except ValueError:
            last_attempt = None

        if last_attempt is not None:
            if last_attempt.tzinfo is None:
                last_attempt = last_attempt.replace(tzinfo=timezone.utc)
            if now - last_attempt < timedelta(days=1):
                return

    refresh_qustodio_token(reason="monthly_maintenance")


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


def _run_exact_add_time_with_token_recovery(
    name: str,
    minutes: int,
    uid: str | None = None,
) -> tuple[bool, str, str]:
    success, detail, captured_output = _run_exact_add_time(
        name=name,
        minutes=minutes,
        uid=uid,
    )
    if success:
        return success, detail, captured_output

    refresh_success, refresh_detail, refresh_output = refresh_qustodio_token(
        reason="redemption_request_failed"
    )
    combined_output = (
        captured_output
        + "\n--- token refresh attempt ---\n"
        + refresh_output
    )

    if not refresh_success:
        return False, f"{detail}; token refresh failed: {refresh_detail}", combined_output

    retry_success, retry_detail, retry_output = _run_exact_add_time(
        name=name,
        minutes=minutes,
        uid=uid,
    )
    combined_output += "\n--- retry after token refresh ---\n" + retry_output

    if retry_success:
        return True, f"{retry_detail}; recovered after token refresh", combined_output

    return False, f"{retry_detail}; token refresh succeeded but retry failed", combined_output


def grant_tablet_time(
    uid: str,
    name: str,
    minutes: int,
    child_id: str | None = None,
) -> dict:
    success, detail, captured_output = _run_exact_add_time_with_token_recovery(
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
        qustodio_uid=uid,
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
            SELECT id, child_id, child_name, qustodio_uid, minutes
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
        qustodio_uid = row["qustodio_uid"]
        minutes = row["minutes"]

        success, detail, captured_output = _run_exact_add_time_with_token_recovery(
            name=child_name,
            minutes=minutes,
            uid=qustodio_uid or None,
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
