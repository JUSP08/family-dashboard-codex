from __future__ import annotations

import hmac
import time
from collections import defaultdict, deque
from functools import wraps

from flask import jsonify, request, session

from config import settings


MAX_ATTEMPTS = 5
ATTEMPT_WINDOW_SECONDS = 300
_attempts: dict[str, deque[float]] = defaultdict(deque)


def _client_key() -> str:
    return request.remote_addr or "unknown"


def _prune_attempts(client_key: str) -> deque[float]:
    now = time.monotonic()
    attempts = _attempts[client_key]
    while attempts and now - attempts[0] > ATTEMPT_WINDOW_SECONDS:
        attempts.popleft()
    return attempts


def login_admin(pin: str) -> tuple[dict, int]:
    if not settings.dashboard_admin_pin:
        return {
            "success": False,
            "error": "DASHBOARD_ADMIN_PIN is not configured on the server",
        }, 503

    client_key = _client_key()
    attempts = _prune_attempts(client_key)
    if len(attempts) >= MAX_ATTEMPTS:
        return {
            "success": False,
            "error": "Too many attempts. Try again in a few minutes.",
        }, 429

    if not hmac.compare_digest(str(pin), settings.dashboard_admin_pin):
        attempts.append(time.monotonic())
        return {"success": False, "error": "Incorrect PIN"}, 401

    _attempts.pop(client_key, None)
    session.clear()
    session["is_admin"] = True
    session.permanent = True
    return {"success": True}, 200


def logout_admin() -> None:
    session.clear()


def is_admin() -> bool:
    return session.get("is_admin") is True


def require_admin(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not is_admin():
            return jsonify({"success": False, "error": "Admin access required"}), 401
        return view(*args, **kwargs)

    return wrapped
