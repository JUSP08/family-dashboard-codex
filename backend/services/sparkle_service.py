from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta
from difflib import SequenceMatcher
from hashlib import sha256

import requests

from config import settings
from db import get_connection, log_event, utc_now_iso


SPARKLE_TODAY_KEY = "dailySparkleToday"
SPARKLE_HISTORY_KEY = "dailySparkleHistory"
HISTORY_WINDOW_DAYS = 30
MAX_HISTORY_ITEMS = 120
MAX_GENERATION_ATTEMPTS = 3
MAX_WORDS = 30

SPARKLE_TOPICS = [
    ("science-body", "Science", "a surprising human-body fact"),
    ("science-chemistry", "Science", "a safe and surprising chemistry fact"),
    ("science-physics", "Science", "a kid-friendly physics fact"),
    ("science-senses", "Science", "a surprising fact about senses"),
    ("science-sound", "Science", "a surprising fact about sound"),
    ("space-planets", "Space", "a lesser-known planet fact"),
    ("space-moon", "Space", "a surprising Moon fact"),
    ("space-stars", "Space", "a surprising star fact"),
    ("space-spacecraft", "Space", "a kid-friendly spacecraft fact"),
    ("space-galaxies", "Space", "a surprising galaxy fact"),
    ("nature-ocean", "Nature", "a surprising ocean fact"),
    ("nature-plants", "Nature", "a surprising plant fact"),
    ("nature-insects", "Nature", "a surprising insect fact"),
    ("nature-birds", "Nature", "a surprising bird fact"),
    ("nature-weather", "Nature", "a surprising weather fact"),
    ("nature-geology", "Nature", "a surprising rock or Earth fact"),
    ("history-ancient-life", "History", "a kid-friendly fact about ancient daily life"),
    ("history-everyday-life", "History", "how an everyday activity changed over time"),
    ("history-firsts", "History", "a surprising historical first"),
    ("history-exploration", "History", "a surprising exploration or map fact"),
    ("history-food", "History", "a surprising food-history fact"),
    ("inventions-transport", "Inventions", "a surprising transportation invention fact"),
    ("inventions-communication", "Inventions", "a surprising communication invention fact"),
    ("inventions-household", "Inventions", "a surprising household invention fact"),
    ("inventions-medicine", "Inventions", "a kid-friendly medical invention fact"),
    ("inventions-tools", "Inventions", "a surprising tool invention fact"),
    ("language-origins", "Language", "the origin of an unexpected everyday word"),
    ("language-unusual", "Language", "an unusual but useful word"),
    ("language-world", "Language", "a surprising fact about a world language"),
    ("language-palindrome", "Language", "a playful palindrome or word pattern"),
    ("language-idiom", "Language", "the surprising origin of a kid-safe idiom"),
    ("riddle-logic", "Riddle", "a short logic riddle with its answer"),
    ("riddle-wordplay", "Riddle", "a short wordplay riddle with its answer"),
    ("riddle-observation", "Riddle", "a short observation riddle with its answer"),
    ("riddle-number", "Riddle", "a short number riddle with its answer"),
    ("kindness-empathy", "Kindness", "a tiny, specific empathy challenge"),
    ("kindness-gratitude", "Kindness", "a tiny, specific gratitude challenge"),
    ("kindness-teamwork", "Kindness", "a tiny, specific teamwork challenge"),
    ("kindness-courage", "Kindness", "a tiny, specific courage challenge"),
    ("kindness-helping", "Kindness", "a tiny, specific helping challenge"),
    ("arts-music", "Arts", "a surprising music fact"),
    ("arts-painting", "Arts", "a surprising visual-art fact"),
    ("arts-dance", "Arts", "a surprising dance fact"),
    ("arts-storytelling", "Arts", "a surprising storytelling fact"),
    ("arts-theater", "Arts", "a surprising theater fact"),
    ("math-patterns", "Math", "a delightful pattern fact"),
    ("math-shapes", "Math", "a surprising shape fact"),
    ("math-probability", "Math", "a kid-friendly probability surprise"),
    ("math-big-numbers", "Math", "a delightful big-number comparison"),
    ("math-puzzle", "Math", "a very short math puzzle with its answer"),
]


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
            topic = str(item.get("topic", "")).strip() or None
            category = str(item.get("category", "")).strip() or None
        else:
            content = str(item).strip()
            saved_date = None
            topic = None
            category = None
        if content:
            records.append(
                {
                    "date": saved_date,
                    "content": content,
                    "topic": topic,
                    "category": category,
                }
            )
    return records


def _recent_history(history: list, today_key: str) -> list[dict]:
    records = _history_records(history)
    try:
        today = date.fromisoformat(today_key)
    except ValueError:
        today = date.today()
    cutoff = today - timedelta(days=HISTORY_WINDOW_DAYS)

    recent_records = []
    legacy_count = 0
    for record in records:
        saved_date = record["date"]
        if not saved_date:
            if legacy_count < HISTORY_WINDOW_DAYS:
                recent_records.append(record)
            legacy_count += 1
            continue
        try:
            record_date = date.fromisoformat(saved_date)
        except ValueError:
            continue
        if cutoff <= record_date <= today:
            recent_records.append(record)
    return recent_records


def _select_topic(today_key: str, recent_records: list[dict]) -> tuple[str, str, str] | None:
    used_topics = {record["topic"] for record in recent_records if record.get("topic")}
    category_counts = {}
    for record in recent_records:
        category = record.get("category")
        if category:
            category_counts[category] = category_counts.get(category, 0) + 1

    available = [topic for topic in SPARKLE_TOPICS if topic[0] not in used_topics]
    if not available:
        return None

    seed = f"{today_key}|{len(recent_records)}"
    return min(
        available,
        key=lambda topic: (
            category_counts.get(topic[1], 0),
            sha256(f"{seed}|{topic[0]}".encode("utf-8")).hexdigest(),
        ),
    )


def _is_too_similar(candidate: str, recent: list[str]) -> bool:
    normalized = _normalize_sparkle(candidate)
    candidate_tokens = set(normalized.split())
    for prior in recent:
        prior_normalized = _normalize_sparkle(prior)
        if normalized == prior_normalized:
            return True
        if SequenceMatcher(None, normalized, prior_normalized).ratio() >= 0.82:
            return True
        prior_tokens = set(prior_normalized.split())
        union = candidate_tokens | prior_tokens
        if union and len(candidate_tokens & prior_tokens) / len(union) >= 0.72:
            return True
    return False


def _build_prompt(today_key: str, recent: list[str], topic: tuple[str, str, str]) -> str:
    _, category, topic_prompt = topic
    return f"""
You are creating a unique "Daily Sparkle" for kids.
- Category: {category}.
- Topic: {topic_prompt}.
- Constraints: Under {MAX_WORDS} words. NO title. NO "Daily Sparkle" label.
- Context: Today is {_display_date(today_key)}.
- ANTI-REPEAT: Do not repeat or closely paraphrase any idea used in the last {HISTORY_WINDOW_DAYS} days: {json.dumps(recent, ensure_ascii=False)}.
- GOAL: Generate something accurate, brand new, specific, and delightful. Return only the Sparkle statement.
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

    recent_records = _recent_history(history, today)
    recent = [record["content"] for record in recent_records]
    topic = _select_topic(today, recent_records)

    try:
        if topic is None:
            raise RuntimeError("No unused Sparkle topics remain in the 30-day window")

        content = ""
        for _ in range(MAX_GENERATION_ATTEMPTS):
            prompt = _build_prompt(today, recent, topic)
            candidate = _clean_sparkle(_call_gemini(prompt))
            if not candidate:
                continue
            if _is_too_similar(candidate, recent):
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
        topic_id, category, _ = topic
        next_record = {
            "date": today,
            "content": content,
            "topic": topic_id,
            "category": category,
        }
        next_history = [next_record, *prior_records][:MAX_HISTORY_ITEMS]
        today_record = next_record
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
            "topic": topic_id,
            "category": category,
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
