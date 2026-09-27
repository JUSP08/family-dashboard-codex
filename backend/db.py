from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from config import settings


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_parent_dir(path_str: str) -> None:
    path = Path(path_str)
    path.parent.mkdir(parents=True, exist_ok=True)


@contextmanager
def get_connection():
    ensure_parent_dir(settings.sqlite_path)
    conn = sqlite3.connect(settings.sqlite_path, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 15000")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            PRAGMA journal_mode=WAL;

            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY,
                json_value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS state_meta (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                revision INTEGER NOT NULL DEFAULT 0
            );

            INSERT OR IGNORE INTO state_meta (id, revision) VALUES (1, 0);

            CREATE TABLE IF NOT EXISTS event_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                entity_type TEXT,
                entity_id TEXT,
                payload_json TEXT NOT NULL,
                status TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notification_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                next_retry_at TEXT,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_error TEXT
            );

            CREATE TABLE IF NOT EXISTS qustodio_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id TEXT NOT NULL,
                child_name TEXT NOT NULL,
                qustodio_uid TEXT NOT NULL,
                minutes INTEGER NOT NULL,
                status TEXT NOT NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                next_retry_at TEXT,
                created_at TEXT NOT NULL,
                last_error TEXT,
                related_redemption_id TEXT
            );

            CREATE TABLE IF NOT EXISTS redemptions (
                id TEXT PRIMARY KEY,
                child_id TEXT NOT NULL,
                child_name TEXT NOT NULL,
                reward_type TEXT NOT NULL,
                target TEXT NOT NULL,
                amount REAL NOT NULL,
                balance_before REAL NOT NULL,
                balance_after REAL NOT NULL,
                status TEXT NOT NULL,
                notification_status TEXT,
                qustodio_status TEXT,
                detail TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )

        columns = {
            row["name"] for row in conn.execute("PRAGMA table_info(qustodio_queue)")
        }
        if "expires_at" not in columns:
            conn.execute("ALTER TABLE qustodio_queue ADD COLUMN expires_at TEXT")

        conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_qustodio_redemption
            ON qustodio_queue (related_redemption_id)
            WHERE related_redemption_id IS NOT NULL
            """
        )


def log_event(
    event_type: str,
    payload: dict,
    status: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO event_log (
                event_type, entity_type, entity_id, payload_json, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                event_type,
                entity_type,
                entity_id,
                json.dumps(payload, ensure_ascii=False),
                status,
                utc_now_iso(),
            ),
        )
