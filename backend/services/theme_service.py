from __future__ import annotations

import base64
import json
import re
import threading
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

from config import settings
from db import get_connection, log_event, utc_now_iso


THEME_STATE_KEY = "dailyGeneratedTheme"
THEME_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
THEME_LOCK = threading.Lock()

# These are broad, original visual directions. Brand characters, names, logos,
# uniforms, and other protected artwork are deliberately excluded from prompts.
THEME_CONCEPTS = (
    {
        "id": "creature-quest",
        "name": "Creature Quest",
        "scene": "an original collectible-creature expedition through a glowing forest, with friendly invented elemental companions and explorer gear",
        "heading": '"Arial Black", "Trebuchet MS", sans-serif',
        "body": 'Verdana, "Segoe UI", sans-serif',
        "accent": "#facc15",
    },
    {
        "id": "toy-nursery",
        "name": "Tiny Dreamhouse",
        "scene": "a whimsical pastel baby-doll playroom with soft silicone-toy styling, miniature furniture, clouds, stars, and tactile craft textures",
        "heading": 'Georgia, "Palatino Linotype", serif',
        "body": '"Trebuchet MS", "Segoe UI", sans-serif',
        "accent": "#f9a8d4",
    },
    {
        "id": "friday-night-lights",
        "name": "Friday Night Lights",
        "scene": "a high-school football field under brilliant stadium lights, painted yard lines, energetic pennants, and a proud small-town game-night atmosphere",
        "heading": 'Impact, "Arial Black", sans-serif',
        "body": '"Segoe UI", Arial, sans-serif',
        "accent": "#fbbf24",
    },
    {
        "id": "dance-stage",
        "name": "Dance Spotlight",
        "scene": "a joyful dance rehearsal stage with flowing ribbons, polished floor reflections, colorful spotlights, and dynamic abstract movement trails",
        "heading": '"Palatino Linotype", Georgia, serif',
        "body": '"Trebuchet MS", "Segoe UI", sans-serif',
        "accent": "#f0abfc",
    },
    {
        "id": "soccer-world",
        "name": "Soccer World",
        "scene": "a vivid soccer pitch at golden hour with a ball, goal net, chalk tactics, scarves, and the energy of a family-friendly neighborhood match",
        "heading": '"Arial Black", Arial, sans-serif',
        "body": 'Verdana, "Segoe UI", sans-serif',
        "accent": "#86efac",
    },
    {
        "id": "flag-football",
        "name": "Flag Football Playbook",
        "scene": "a bright flag-football field mixed with hand-drawn playbook arrows, colorful flags, cones, and crisp autumn game-day energy",
        "heading": 'Rockwell, "Courier New", serif',
        "body": 'Arial, "Segoe UI", sans-serif',
        "accent": "#fb923c",
    },
    {
        "id": "creator-studio",
        "name": "Creator Studio",
        "scene": "an upbeat original video-creator studio with camera gear, ring lights, editing controls, playful props, and colorful sound-wave shapes",
        "heading": '"Trebuchet MS", "Arial Black", sans-serif',
        "body": '"Segoe UI", Arial, sans-serif',
        "accent": "#67e8f9",
    },
    {
        "id": "family-adventure",
        "name": "Family Adventure Channel",
        "scene": "a colorful original family-adventure world with an indoor play fort, treasure-map motifs, toy vehicles, stars, and upbeat creator-channel energy",
        "heading": '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        "body": 'Verdana, "Segoe UI", sans-serif',
        "accent": "#fde047",
    },
    {
        "id": "meme-lab",
        "name": "Meme Remix Lab",
        "scene": "a clever internet-humor remix lab made from expressive abstract reaction shapes, glitch stickers, keyboards, speech-bubble silhouettes, and absurd visual surprises",
        "heading": 'Impact, "Arial Black", sans-serif',
        "body": 'Arial, "Segoe UI", sans-serif',
        "accent": "#c4b5fd",
    },
    {
        "id": "arcade-night",
        "name": "Arcade Night",
        "scene": "an original neon arcade with pixel-inspired light patterns, joysticks, prize tickets, glowing cabinets, and a deep electric night palette",
        "heading": '"Courier New", Rockwell, monospace',
        "body": 'Verdana, "Segoe UI", sans-serif',
        "accent": "#22d3ee",
    },
    {
        "id": "maker-lab",
        "name": "Maker Lab",
        "scene": "a playful invention workshop with cardboard prototypes, gears, circuits, robots, hand tools, and colorful science-experiment light",
        "heading": 'Rockwell, "Arial Black", serif',
        "body": '"Trebuchet MS", "Segoe UI", sans-serif',
        "accent": "#a3e635",
    },
    {
        "id": "music-festival",
        "name": "Backyard Music Fest",
        "scene": "a family-friendly backyard music festival with instruments, string lights, speaker shapes, confetti, and rhythmic waves of saturated color",
        "heading": 'Georgia, "Trebuchet MS", serif',
        "body": '"Segoe UI", Arial, sans-serif',
        "accent": "#fda4af",
    },
)

THEME_CONCEPTS += tuple(
    {"id": identifier, "name": name, "scene": scene,
     "heading": heading, "body": '"Segoe UI", Arial, sans-serif', "accent": accent}
    for identifier, name, scene, heading, accent in (
        ("smiley-faces", "Smile Parade", "cheerful smiley-face stickers, playful doodles and colorful paper cutouts", '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif', "#fde047"),
        ("rainbows", "Rainbow Trails", "sweeping vivid rainbows over airy clouds with colorful prismatic ribbons", '"Trebuchet MS", sans-serif', "#86efac"),
        ("hearts", "Heart Garden", "floating handmade hearts and heart-shaped flowers in a joyful layered paper garden", 'Georgia, serif', "#fda4af"),
        ("space", "Space Explorers", "an imaginative spacecraft expedition past colorful planets, rings and tiny friendly rovers", '"Arial Black", sans-serif', "#67e8f9"),
        ("galaxies", "Galaxy Voyage", "vast spiral galaxies with luminous dust lanes and richly colored nebulae", 'Georgia, serif', "#f0abfc"),
        ("constellations", "Constellation Atlas", "a crisp star-filled sky with delicate constellation connections and celestial compass motifs without lettering", '"Palatino Linotype", Georgia, serif', "#fde68a"),
        ("sea", "Undersea Wonders", "a vibrant underwater coral reef with sea turtles, tropical fish and sunbeams through clear water", '"Trebuchet MS", sans-serif', "#5eead4"),
        ("abyss", "Deep Sea Glow", "a wondrous deep ocean abyss with glowing jellyfish, bioluminescent creatures and distant underwater ridges, peaceful rather than frightening", 'Georgia, serif', "#22d3ee"),
        ("beach", "Beach Day", "a bright shoreline with turquoise surf, seashells, sandcastles and colorful beach umbrellas", '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif', "#fcd34d"),
        ("snow-day", "Snow Day", "a playful snowy neighborhood with snow forts, sleds, frosted trees and cozy glowing windows", 'Rockwell, Georgia, serif', "#bae6fd"),
    )
)


def _today_key() -> str:
    return datetime.now(ZoneInfo(settings.dashboard_timezone)).date().isoformat()


def _theme_dir() -> Path:
    return Path(settings.sqlite_path).resolve().parent / "themes"


def _concept_for_date(date_key: str) -> dict:
    parsed = date.fromisoformat(date_key)
    # Walk the full list before repeating, with a yearly offset so January 1
    # does not always begin on the same concept.
    index = (parsed.toordinal() + parsed.year) % len(THEME_CONCEPTS)
    return THEME_CONCEPTS[index]


def _build_prompt(date_key: str, concept: dict) -> str:
    return f"""
Create an original, polished 16:9 background illustration for a busy family dashboard on {date_key}.

Visual direction: {concept['scene']}.

Composition requirements:
- Rich, imaginative environmental artwork with layered depth and a distinct daily personality.
- Keep the center 65 percent calm, low-detail, and dark enough for translucent dashboard cards and white text.
- Concentrate recognizable props, brighter color, and visual motion around the outer edges and corners.
- No words, letters, numbers, UI panels, calendars, clocks, watermarks, signatures, or logos.
- No existing franchise characters, branded mascots, celebrity likenesses, team logos, or copied trade dress.
- Do not depict recognizable real children. Any human presence should be distant, stylized silhouettes only.
- Family-friendly, energetic, sophisticated rather than toddler-like, and readable as a full-screen background.
- Use a balanced multi-color palette with {concept['accent']} as one accent, plus strong dark values for contrast.
""".strip()


def _find_image_payload(value) -> tuple[str, str] | None:
    if isinstance(value, dict):
        data = value.get("data")
        mime_type = value.get("mime_type") or value.get("mimeType")
        if isinstance(data, str) and isinstance(mime_type, str) and mime_type.startswith("image/"):
            return data, mime_type
        for nested in value.values():
            found = _find_image_payload(nested)
            if found:
                return found
    elif isinstance(value, list):
        for nested in value:
            found = _find_image_payload(nested)
            if found:
                return found
    return None


def _request_theme_image(prompt: str) -> tuple[bytes, str]:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    response = requests.post(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        headers={
            "x-goog-api-key": settings.gemini_api_key,
            "Content-Type": "application/json",
        },
        json={
            "model": settings.gemini_image_model,
            "input": prompt,
            "response_format": {
                "type": "image",
                "mime_type": "image/jpeg",
                "aspect_ratio": "16:9",
                "image_size": settings.gemini_theme_image_size,
            },
        },
        timeout=settings.gemini_theme_timeout_seconds,
    )
    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError("Gemini image service returned a non-JSON response") from exc

    if not response.ok:
        message = payload.get("error", {}).get("message") or "Gemini image generation failed"
        raise RuntimeError(message)

    image_payload = _find_image_payload(payload)
    if not image_payload:
        raise RuntimeError("Gemini image service returned no image")

    encoded, mime_type = image_payload
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (ValueError, TypeError) as exc:
        raise RuntimeError("Gemini image service returned invalid image data") from exc
    if not image_bytes or len(image_bytes) > 20 * 1024 * 1024:
        raise RuntimeError("Gemini image size was invalid")
    return image_bytes, mime_type


def _extension_for_mime(mime_type: str) -> str:
    return {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(
        mime_type, ".jpg"
    )


def _load_metadata(date_key: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT json_value FROM app_state WHERE key IN (?, ?) ORDER BY key DESC LIMIT 1",
            (f"{THEME_STATE_KEY}:{date_key}", THEME_STATE_KEY),
        ).fetchone()
    if not row:
        return None
    try:
        value = json.loads(row["json_value"])
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def _public_metadata(metadata: dict) -> dict:
    return {
        "success": True,
        "ready": True,
        "date": metadata["date"],
        "themeId": metadata["themeId"],
        "name": metadata["name"],
        "accent": metadata["accent"],
        "headingFont": metadata["headingFont"],
        "bodyFont": metadata["bodyFont"],
        "generatedAt": metadata["generatedAt"],
        "imageUrl": f"/api/theme/image/{metadata['date']}",
    }


def get_daily_theme(date_key: str | None = None) -> dict | None:
    requested_date = date_key or _today_key()
    if not THEME_DATE_PATTERN.fullmatch(requested_date):
        return None
    metadata = _load_metadata(requested_date)
    if not metadata or metadata.get("date") != requested_date:
        return None
    file_name = metadata.get("fileName")
    if (
        not isinstance(file_name, str)
        or Path(file_name).name != file_name
        or not (_theme_dir() / file_name).is_file()
    ):
        return None
    return _public_metadata(metadata)


def get_theme_image_path(date_key: str) -> Path | None:
    if not THEME_DATE_PATTERN.fullmatch(date_key):
        return None
    metadata = _load_metadata(date_key)
    if not metadata or metadata.get("date") != date_key:
        return None
    file_name = metadata.get("fileName")
    if not isinstance(file_name, str) or Path(file_name).name != file_name:
        return None
    path = _theme_dir() / file_name
    return path if path.is_file() else None


def _remove_old_images(current_file_name: str) -> None:
    files = sorted(_theme_dir().glob("20??-??-??.*"), key=lambda path: path.name, reverse=True)
    keep = {path.name for path in files[:14]}
    keep.add(current_file_name)
    for path in files:
        if path.name not in keep:
            path.unlink(missing_ok=True)


def ensure_daily_theme(date_key: str | None = None, force: bool = False) -> dict:
    requested_date = date_key or _today_key()
    if not THEME_DATE_PATTERN.fullmatch(requested_date):
        raise ValueError("date_key must be YYYY-MM-DD")

    with THEME_LOCK:
        existing = get_daily_theme(requested_date)
        if existing and not force:
            return existing

        concept = _concept_for_date(requested_date)
        image_bytes, mime_type = _request_theme_image(_build_prompt(requested_date, concept))
        extension = _extension_for_mime(mime_type)
        theme_dir = _theme_dir()
        theme_dir.mkdir(parents=True, exist_ok=True)
        file_name = f"{requested_date}{extension}"
        final_path = theme_dir / file_name
        temporary_path = theme_dir / f".{file_name}.tmp"
        temporary_path.write_bytes(image_bytes)
        temporary_path.replace(final_path)

        metadata = {
            "date": requested_date,
            "themeId": concept["id"],
            "name": concept["name"],
            "accent": concept["accent"],
            "headingFont": concept["heading"],
            "bodyFont": concept["body"],
            "generatedAt": utc_now_iso(),
            "fileName": file_name,
            "mimeType": mime_type,
        }
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO app_state (key, json_value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    json_value=excluded.json_value,
                    updated_at=excluded.updated_at
                """,
                (f"{THEME_STATE_KEY}:{requested_date}", json.dumps(metadata), metadata["generatedAt"]),
            )

        _remove_old_images(file_name)
        log_event(
            event_type="daily_theme_generated",
            payload={"date": requested_date, "theme_id": concept["id"], "model": settings.gemini_image_model},
            status="success",
            entity_type="daily_theme",
            entity_id=requested_date,
        )
        return _public_metadata(metadata)


def get_theme_preview(date_key: str | None = None) -> dict:
    requested_date = date_key or _today_key()
    concept = _concept_for_date(requested_date)
    return get_daily_theme(requested_date) or {
        "success": True, "ready": False, "date": requested_date,
        "themeId": concept["id"], "name": concept["name"], "accent": concept["accent"],
    }


def ensure_upcoming_themes() -> None:
    today = date.fromisoformat(_today_key())
    for day in (today, today + timedelta(days=1)):
        ensure_daily_theme(day.isoformat())
