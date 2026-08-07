from __future__ import annotations

import re
from typing import Any

import requests

from config import settings


SUPPORTED_DOMAINS = {
    "climate",
    "fan",
    "input_boolean",
    "light",
    "media_player",
    "scene",
    "switch",
}
ENTITY_ID_RE = re.compile(r"^[a-z_]+\.[a-z0-9_]+$")


class HomeAssistantError(RuntimeError):
    pass


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.ha_token}",
        "Content-Type": "application/json",
    }


def _ensure_configured() -> None:
    if not settings.ha_token:
        raise HomeAssistantError(
            "Home Assistant control is not configured. Add HA_TOKEN to backend/.env."
        )


def _request(method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    _ensure_configured()
    try:
        response = requests.request(
            method,
            f"{settings.ha_url}{path}",
            headers=_headers(),
            json=payload,
            timeout=settings.ha_notify_timeout_seconds,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        detail = str(exc)
        if getattr(exc, "response", None) is not None:
            detail = f"Home Assistant returned HTTP {exc.response.status_code}"
        raise HomeAssistantError(detail) from exc

    if not response.content:
        return None
    return response.json()


def _allowlist() -> set[str]:
    return {
        item.strip()
        for item in settings.ha_entity_allowlist.split(",")
        if item.strip()
    }


def get_smart_home_entities() -> dict[str, Any]:
    if not settings.ha_token:
        return {
            "success": True,
            "configured": False,
            "homeAssistantUrl": settings.ha_url,
            "entities": [],
        }

    states = _request("GET", "/api/states")
    allowed = _allowlist()
    entities: list[dict[str, Any]] = []

    for item in states if isinstance(states, list) else []:
        entity_id = str(item.get("entity_id", ""))
        domain = entity_id.split(".", 1)[0]
        if domain not in SUPPORTED_DOMAINS:
            continue
        if allowed and entity_id not in allowed:
            continue

        attributes = item.get("attributes") if isinstance(item.get("attributes"), dict) else {}
        entities.append(
            {
                "entityId": entity_id,
                "domain": domain,
                "state": item.get("state", "unknown"),
                "name": attributes.get("friendly_name") or entity_id,
                "attributes": {
                    key: attributes[key]
                    for key in (
                        "brightness",
                        "color_mode",
                        "current_temperature",
                        "device_class",
                        "hvac_action",
                        "is_volume_muted",
                        "media_artist",
                        "media_title",
                        "rgb_color",
                        "supported_features",
                        "temperature",
                        "volume_level",
                    )
                    if key in attributes
                },
            }
        )

    entities.sort(key=lambda entity: (entity["domain"], entity["name"].lower()))
    return {
        "success": True,
        "configured": True,
        "homeAssistantUrl": settings.ha_url,
        "entities": entities,
    }


def run_smart_home_action(entity_id: str, action: str, value: Any = None) -> dict[str, Any]:
    if not ENTITY_ID_RE.fullmatch(entity_id):
        raise HomeAssistantError("Invalid entity ID")

    domain = entity_id.split(".", 1)[0]
    service: str
    data: dict[str, Any] = {"entity_id": entity_id}

    if action in {"turn_on", "turn_off", "toggle"} and domain in {
        "fan", "input_boolean", "light", "media_player", "switch"
    }:
        service = action
    elif action == "set_brightness" and domain == "light":
        service = "turn_on"
        try:
            data["brightness_pct"] = max(0, min(100, int(value)))
        except (TypeError, ValueError) as exc:
            raise HomeAssistantError("Brightness must be between 0 and 100") from exc
    elif action == "volume_set" and domain == "media_player":
        service = "volume_set"
        try:
            data["volume_level"] = max(0.0, min(1.0, float(value)))
        except (TypeError, ValueError) as exc:
            raise HomeAssistantError("Volume must be between 0 and 1") from exc
    elif action in {"media_play_pause", "media_stop"} and domain == "media_player":
        service = action
    elif action in {"mute", "unmute"} and domain == "media_player":
        service = "volume_mute"
        data["is_volume_muted"] = action == "mute"
    elif action == "activate" and domain == "scene":
        service = "turn_on"
    else:
        raise HomeAssistantError("That action is not allowed for this entity")

    _request("POST", f"/api/services/{domain}/{service}", data)
    return {"success": True, "entityId": entity_id, "action": action}


def broadcast_google_message(message: str, targets: list[str] | None = None) -> dict[str, Any]:
    cleaned = message.strip()
    if not cleaned or len(cleaned) > 250:
        raise HomeAssistantError("Announcement must be between 1 and 250 characters")

    data: dict[str, Any] = {"message": cleaned}
    clean_targets = [str(target).strip() for target in targets or [] if str(target).strip()]
    if clean_targets:
        data["target"] = clean_targets

    _request("POST", "/api/services/notify/google_assistant_sdk", data)
    return {"success": True}
