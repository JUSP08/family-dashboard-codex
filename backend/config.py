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

    dashboard_timezone: str = os.getenv("DASHBOARD_TIMEZONE", "America/New_York")
    dashboard_admin_pin: str = os.getenv("DASHBOARD_ADMIN_PIN", "")
    dashboard_secret_key: str = os.getenv("DASHBOARD_SECRET_KEY", "")
    max_time_balance_minutes: int = int(os.getenv("MAX_TIME_BALANCE_MINUTES", "150"))

    ha_url: str = os.getenv("HA_URL", "http://192.168.50.50:8123").rstrip("/")
    ha_token: str = os.getenv("HA_TOKEN", "")
    ha_entity_allowlist: str = os.getenv("HA_ENTITY_ALLOWLIST", "")
    ha_redemption_webhook_id: str = os.getenv("HA_REDEMPTION_WEBHOOK_ID", "redemption_notice")
    ha_reward_webhook_id: str = os.getenv("HA_REWARD_WEBHOOK_ID", "family_dashboard_reward")
    ha_notify_timeout_seconds: int = int(os.getenv("HA_NOTIFY_TIMEOUT_SECONDS", "20"))

    qustodio_email: str = os.getenv("QUSTODIO_EMAIL", "")
    qustodio_password: str = os.getenv("QUSTODIO_PW", "")
    qustodio_token: str = os.getenv("QUSTODIO_TOKEN", os.getenv("TOKEN", ""))
    qustodio_account_uid: str = os.getenv("QUSTODIO_ACCOUNT_UID", "")
    qustodio_profiles_json: str = os.getenv("QUSTODIO_PROFILES_JSON", "{}")
    qustodio_timeout_seconds: int = int(os.getenv("QUSTODIO_TIMEOUT_SECONDS", "20"))
    qustodio_headless: bool = _as_bool(os.getenv("QUSTODIO_HEADLESS", "true"), True)

    gemini_api_key: str = os.getenv("GEMINI_API_KEY", os.getenv("VITE_GEMINI_API_KEY", ""))
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    gemini_timeout_seconds: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "20"))
    gemini_pool_timeout_seconds: int = int(os.getenv("GEMINI_POOL_TIMEOUT_SECONDS", "90"))
    gemini_image_model: str = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
    gemini_theme_timeout_seconds: int = int(os.getenv("GEMINI_THEME_TIMEOUT_SECONDS", "180"))
    gemini_theme_image_size: str = os.getenv("GEMINI_THEME_IMAGE_SIZE", "2K")

    google_api_key: str = os.getenv("GOOGLE_API_KEY", os.getenv("VITE_GOOGLE_API_KEY", ""))
    google_timeout_seconds: int = int(os.getenv("GOOGLE_TIMEOUT_SECONDS", "20"))

    log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
