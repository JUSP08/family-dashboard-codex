from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from waitress import serve

from config import FRONTEND_DIST, PROJECT_ROOT, settings
from db import init_db, log_event
from services.health_service import build_status
from services.notify_service import send_redemption_notification
from services.qustodio_service import grant_tablet_time
from services.queue_service import start_background_workers
from services.sparkle_service import get_or_create_daily_sparkle
from services.state_service import get_full_state, save_full_state


def create_app() -> Flask:
    static_folder = str(FRONTEND_DIST)
    app = Flask(__name__, static_folder=static_folder, static_url_path="")

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.get("/status")
    def status():
        return jsonify(build_status())

    @app.get("/api/state")
    def api_get_state():
        return jsonify(get_full_state())

    @app.put("/api/state")
    def api_put_state():
        if not request.is_json:
            return jsonify({"success": False, "error": "Expected JSON body"}), 400

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"success": False, "error": "Invalid JSON payload"}), 400

        saved = save_full_state(payload)
        return jsonify({"success": True, "state": saved})

    @app.post("/api/notify")
    def api_notify():
        if not request.is_json:
            return jsonify({"success": False, "error": "Expected JSON body"}), 400

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"success": False, "error": "Invalid JSON payload"}), 400

        child_name = str(payload.get("child_name", "")).strip()
        reward_type = str(payload.get("type", "")).strip()
        target = str(payload.get("target", "")).strip()
        amount = payload.get("amount", "")

        if not child_name or not reward_type or not target or amount in ("", None):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "child_name, amount, type, and target are required",
                    }
                ),
                400,
            )

        result = send_redemption_notification(
            child_name=child_name,
            amount=amount,
            reward_type=reward_type,
            target=target,
        )
        return jsonify(result)

    @app.post("/api/qustodio")
    def api_qustodio():
        if not request.is_json:
            return jsonify({"success": False, "error": "Expected JSON body"}), 400

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"success": False, "error": "Invalid JSON payload"}), 400

        uid = str(payload.get("uid", "")).strip()
        name = str(payload.get("name", "")).strip()
        child_id = str(payload.get("child_id", "")).strip() or None

        try:
            minutes = int(payload.get("minutes", 0))
        except (TypeError, ValueError):
            minutes = 0

        if not uid or not name or minutes <= 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "uid, name, and positive minutes are required",
                    }
                ),
                400,
            )

        result = grant_tablet_time(
            uid=uid,
            name=name,
            minutes=minutes,
            child_id=child_id,
        )
        return jsonify(result)

    @app.post("/api/sparkle")
    def api_sparkle():
        payload = request.get_json(silent=True) if request.is_json else {}
        if payload is None:
            payload = {}
        if not isinstance(payload, dict):
            return jsonify({"success": False, "error": "Invalid JSON payload"}), 400

        result = get_or_create_daily_sparkle(
            force_refresh=bool(payload.get("forceRefresh", False)),
            today_key=str(payload.get("todayKey", "")).strip() or None,
        )
        status_code = 200 if result.get("success") else 503
        return jsonify(result), status_code

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path: str):
        dist_path = Path(app.static_folder or "")
        requested = dist_path / path

        if path and requested.exists() and requested.is_file():
            return send_from_directory(app.static_folder, path)

        index_file = dist_path / "index.html"
        if index_file.exists():
            return send_from_directory(app.static_folder, "index.html")

        return (
            jsonify(
                {
                    "success": False,
                    "error": "frontend/dist/index.html not found",
                    "hint": "Run npm run build in the frontend folder first.",
                }
            ),
            404,
        )

    return app


if __name__ == "__main__":
    init_db()
    start_background_workers()

    app = create_app()

    log_event(
        event_type="app_started",
        payload={"host": settings.app_host, "port": settings.app_port},
        status="success",
        entity_type="system",
        entity_id="startup",
    )

    print(f"Starting Family Dashboard Windows backend on {settings.app_host}:{settings.app_port}")
    print(f"Serving frontend from: {FRONTEND_DIST}")
    print(f"Project root: {PROJECT_ROOT}")

    serve(app, host=settings.app_host, port=settings.app_port)
