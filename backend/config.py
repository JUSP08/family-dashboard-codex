from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = PROJECT_ROOT / "backend"
FRONTEND_ROOT = PROJECT_ROOT / "frontend"
FRONTEND_DIST = FRONTEND_ROOT / "dist"

load_dotenv(BACKEND_ROOT / ".env")


def _as_bool(value: str, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8099"))

    sqlite_path: str = os.getenv(
        "SQLITE_PATH",
        str(BACKEND_ROOT / "data" / "family_dashboard.db"),
    )

    ha_url: str = os.getenv("HA_URL", "http://192.168.50.50:8123").rstrip("/")
    ha_redemption_webhook_id: str = os.getenv("HA_REDEMPTION_WEBHOOK_ID", "redemption_notice")
    ha_notify_timeout_seconds: int = int(os.getenv("HA_NOTIFY_TIMEOUT_SECONDS", "20"))

    qustodio_email: str = os.getenv("QUSTODIO_EMAIL", "")
    qustodio_password: str = os.getenv("QUSTODIO_PW", "")
    qustodio_token: str = os.getenv("QUSTODIO_TOKEN", os.getenv("TOKEN", ""))
    qustodio_account_uid: str = os.getenv("QUSTODIO_ACCOUNT_UID", "61672d9e46804349af49bd547bbb51a5")
    qustodio_timeout_seconds: int = int(os.getenv("QUSTODIO_TIMEOUT_SECONDS", "20"))
    qustodio_headless: bool = _as_bool(os.getenv("QUSTODIO_HEADLESS", "true"), True)

    gemini_api_key: str = os.getenv("GEMINI_API_KEY", os.getenv("VITE_GEMINI_API_KEY", ""))
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    gemini_timeout_seconds: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "20"))

    log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
