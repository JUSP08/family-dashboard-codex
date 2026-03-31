from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from config import FRONTEND_DIST, settings
from db import get_connection


def check_database() -> str:
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1").fetchone()
        return "ok"
    except Exception:
        return "error"


def get_pending_count(table_name: str) -> int:
    try:
        with get_connection() as conn:
            row = conn.execute(
                f"SELECT COUNT(*) AS count FROM {table_name} WHERE status IN ('pending', 'failed')"
            ).fetchone()
        return int(row["count"])
    except Exception:
        return -1


def get_last_state_write() -> str | None:
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT MAX(updated_at) AS updated_at FROM app_state"
            ).fetchone()
        return row["updated_at"]
    except Exception:
        return None


def build_status() -> dict:
    return {
        "app": "Family Dashboard Windows",
        "utc_time": datetime.now(timezone.utc).isoformat(),
        "frontend_dist_present": (FRONTEND_DIST / "index.html").exists(),
        "database": check_database(),
        "notification_queue_pending": get_pending_count("notification_queue"),
        "qustodio_queue_pending": get_pending_count("qustodio_queue"),
        "last_state_write_at": get_last_state_write(),
        "host": settings.app_host,
        "port": settings.app_port,
        "version": "phase1-bootstrap",
    }