from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta

import requests

from config import settings
from db import get_connection, log_event, utc_now_iso


SPARKLE_TODAY_KEY = "dailySparkleToday"
SPARKLE_HISTORY_KEY = "dailySparkleHistory"
HISTORY_WINDOW_DAYS = 30
MAX_HISTORY_ITEMS = 120
MAX_GENERATION_ATTEMPTS = 3
MAX_WORDS = 30


def _load_json_state(key: str, default):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT json_value FROM app_state WHERE key = ?",
            (key,),
        ).fetchone()

    if not row:
        return default

    try:
        return json.loads(row["json_value"])
    except json.JSONDecodeError:
        return default


def _save_json_state(key: str, value) -> None:
    now = utc_now_iso()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO app_state (key, json_value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                json_value=excluded.json_value,
                updated_at=excluded.updated_at
            """,
            (key, json.dumps(value, ensure_ascii=False), now),
        )


def _today_key() -> str:
    return datetime.now().date().isoformat()


def _display_date(today_key: str) -> str:
    try:
        parsed = datetime.strptime(today_key, "%Y-%m-%d")
        return f"{parsed.strftime('%A, %B')} {parsed.day}"
    except ValueError:
        now = datetime.now()
        return f"{now.strftime('%A, %B')} {now.day}"


def _clean_sparkle(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^daily sparkle\s*:?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.strip("\"' ")

    words = cleaned.split()
    if len(words) > MAX_WORDS:
        cleaned = " ".join(words[:MAX_WORDS]).rstrip(".,;:!?") + "..."

    return cleaned


def _normalize_sparkle(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (text or "").casefold()).strip()


def _history_records(history: list) -> list[dict]:
    records = []
    for item in history:
        if isinstance(item, dict):
            content = str(item.get("content", "")).strip()
            saved_date = str(item.get("date", "")).strip() or None
        else:
            content = str(item).strip()
            saved_date = None
        if content:
            records.append({"date": saved_date, "content": content})
    return records


def _recent_sparkles(history: list, today_key: str) -> list[str]:
    records = _history_records(history)
    try:
        today = date.fromisoformat(today_key)
    except ValueError:
        today = date.today()
    cutoff = today - timedelta(days=HISTORY_WINDOW_DAYS)

    recent = []
    legacy_count = 0
    for record in records:
        saved_date = record["date"]
        if not saved_date:
            if legacy_count < HISTORY_WINDOW_DAYS:
                recent.append(record["content"])
            legacy_count += 1
            continue
        try:
            record_date = date.fromisoformat(saved_date)
        except ValueError:
            continue
        if cutoff <= record_date <= today:
            recent.append(record["content"])
    return recent


def _build_prompt(today_key: str, recent: list[str]) -> str:
    return f"""
You are creating a unique "Daily Sparkle" for kids.
- Topic: A fun fact, a short joke, or an inspiring mini-quote.
- Constraints: Under {MAX_WORDS} words. NO title. NO "Daily Sparkle" label.
- Context: Today is {_display_date(today_key)}.
- ANTI-REPEAT: Do not repeat or closely paraphrase any idea used in the last {HISTORY_WINDOW_DAYS} days: {json.dumps(recent, ensure_ascii=False)}.
- GOAL: Generate something brand new and delightful.
""".strip()


def _call_gemini(prompt: str) -> str:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    response = requests.post(
        url,
        params={"key": settings.gemini_api_key},
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=settings.gemini_timeout_seconds,
    )

    try:
        data = response.json()
    except ValueError:
        response.raise_for_status()
        raise RuntimeError("Gemini returned a non-JSON response")

    if not response.ok:
        message = data.get("error", {}).get("message") or "Gemini API error"
        raise RuntimeError(message)

    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    if not text:
        raise RuntimeError("Gemini returned an empty response")

    return text


def get_or_create_daily_sparkle(force_refresh: bool = False, today_key: str | None = None) -> dict:
    today = today_key or _today_key()
    today_saved = _load_json_state(SPARKLE_TODAY_KEY, {})

    if (
        not force_refresh
        and isinstance(today_saved, dict)
        and today_saved.get("date") == today
        and today_saved.get("content")
    ):
        return {
            "success": True,
            "status": "cached",
            "content": today_saved["content"],
            "date": today,
        }

    history = _load_json_state(SPARKLE_HISTORY_KEY, [])
    if not isinstance(history, list):
        history = []

    recent = _recent_sparkles(history, today)
    recent_fingerprints = {_normalize_sparkle(item) for item in recent}

    try:
        content = ""
        for _ in range(MAX_GENERATION_ATTEMPTS):
            prompt = _build_prompt(today, recent)
            candidate = _clean_sparkle(_call_gemini(prompt))
            if not candidate:
                continue
            fingerprint = _normalize_sparkle(candidate)
            if fingerprint in recent_fingerprints:
                recent.append(candidate)
                continue
            content = candidate
            break
        if not content:
            raise RuntimeError("Gemini repeated a recent Sparkle or returned empty content")

        content_fingerprint = _normalize_sparkle(content)
        prior_records = [
            record for record in _history_records(history)
            if _normalize_sparkle(record["content"]) != content_fingerprint
        ]
        next_history = [{"date": today, "content": content}, *prior_records][:MAX_HISTORY_ITEMS]
        today_record = {"date": today, "content": content}
        _save_json_state(SPARKLE_TODAY_KEY, today_record)
        _save_json_state(SPARKLE_HISTORY_KEY, next_history)

        log_event(
            event_type="sparkle_generated",
            payload={"date": today, "status": "generated"},
            status="success",
            entity_type="sparkle",
            entity_id=today,
        )

        return {
            "success": True,
            "status": "generated",
            "content": content,
            "date": today,
        }

    except Exception as exc:
        log_event(
            event_type="sparkle_generation_failed",
            payload={"date": today, "error": str(exc)},
            status="error",
            entity_type="sparkle",
            entity_id=today,
        )
        return {
            "success": False,
            "status": "error",
            "error": str(exc),
            "date": today,
        }
