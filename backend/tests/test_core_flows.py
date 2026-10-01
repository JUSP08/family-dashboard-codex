from __future__ import annotations

import json
import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo


_temp_dir = tempfile.TemporaryDirectory(
    dir=Path(__file__).resolve().parents[1] / "data"
)
os.environ["SQLITE_PATH"] = os.path.join(_temp_dir.name, "dashboard-test.db")
os.environ["DASHBOARD_ADMIN_PIN"] = "2468"
os.environ["DASHBOARD_SECRET_KEY"] = "test-secret-key-that-is-long-enough"

from app import create_app  # noqa: E402
from db import get_connection, init_db  # noqa: E402
from services.redemption_service import redeem  # noqa: E402
from services.reward_service import process_daily_rewards  # noqa: E402
from services.qustodio_service import enqueue_qustodio_request  # noqa: E402
from services.sparkle_service import (  # noqa: E402
    get_or_create_daily_sparkle,
    refresh_sparkle_pool_if_due,
)
from services.state_service import (  # noqa: E402
    StateConflictError,
    get_full_state,
    save_full_state,
)
from services.theme_service import ensure_daily_theme, get_daily_theme  # noqa: E402


class CoreFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.app = create_app()
        cls.app.config.update(TESTING=True)

    @classmethod
    def tearDownClass(cls):
        _temp_dir.cleanup()

    def setUp(self):
        with get_connection() as conn:
            for table in (
                "app_state",
                "event_log",
                "notification_queue",
                "qustodio_queue",
                "redemptions",
            ):
                conn.execute(f"DELETE FROM {table}")
            conn.execute("UPDATE state_meta SET revision = 0 WHERE id = 1")

        themes_dir = Path(os.environ["SQLITE_PATH"]).parent / "themes"
        if themes_dir.exists():
            for path in themes_dir.iterdir():
                if path.is_file():
                    path.unlink()

    def test_partial_state_save_preserves_other_keys_and_detects_conflicts(self):
        first = save_full_state(
            {"childrenData": [{"id": "c1"}], "wallet": {"c1": {"time": 10}}},
            expected_revision=0,
        )
        self.assertEqual(first["_revision"], 1)

        second = save_full_state(
            {"wallet": {"c1": {"time": 20}}}, expected_revision=1
        )
        self.assertEqual(second["childrenData"], [{"id": "c1"}])
        self.assertEqual(second["wallet"]["c1"]["time"], 20)
        self.assertEqual(second["_revision"], 2)

        with self.assertRaises(StateConflictError):
            save_full_state({"wallet": {}}, expected_revision=1)

    @patch("services.reward_service.send_daily_reward_notification")
    def test_daily_tasks_are_paid_once_by_backend(self, notify):
        date_key = "2026-09-24"
        save_full_state(
            {
                "childrenData": [{"id": "c1", "name": "Kid", "role": "child"}],
                "masterTasks": [
                    {
                        "id": "daily-1",
                        "label": "Daily task",
                        "recurrence": "daily",
                        "days": [],
                        "assignees": ["all"],
                    }
                ],
                "completedTasks": {f"{date_key}-c1-daily-1": 1},
                "wallet": {"c1": {"time": 100, "money": 0}},
                "dailyRewards": {},
            },
            expected_revision=0,
        )

        now = datetime(2026, 9, 25, 12, 0, tzinfo=ZoneInfo("America/New_York"))
        payouts = process_daily_rewards(now)
        self.assertEqual(len(payouts), 1)
        self.assertEqual(get_full_state()["wallet"]["c1"]["time"], 150)

        self.assertEqual(process_daily_rewards(now), [])
        self.assertEqual(get_full_state()["wallet"]["c1"]["time"], 150)
        notify.assert_called_once()

    def test_reward_worker_does_not_initialize_an_empty_dashboard(self):
        now = datetime(2026, 9, 25, 12, 0, tzinfo=ZoneInfo("America/New_York"))
        self.assertEqual(process_daily_rewards(now), [])
        self.assertEqual(get_full_state(), {"_revision": 0})

    @patch("services.reward_service.send_daily_reward_notification")
    def test_daily_reward_uses_visible_generated_task_manifest(self, notify):
        date_key = "2026-07-14"
        generated_task_id = f"daily-{date_key}-c1-outdoor-activity"
        save_full_state(
            {
                "childrenData": [{"id": "c1", "name": "Kid", "role": "child"}],
                "masterTasks": [{"id": "different-task", "assignees": ["all"]}],
                "dailyCoachTaskManifest": {
                    date_key: [{"id": generated_task_id, "assignees": ["c1"]}]
                },
                "completedTasks": {f"{date_key}-c1-{generated_task_id}": 1},
                "wallet": {"c1": {"time": 0, "money": 0}},
                "dailyRewards": {},
            },
            expected_revision=0,
        )

        now = datetime(2026, 7, 15, 12, 0, tzinfo=ZoneInfo("America/New_York"))
        payouts = process_daily_rewards(now)

        payout = next(item for item in payouts if item["date"] == date_key)
        self.assertEqual(payout["completion_pct"], 100)
        self.assertEqual(get_full_state()["wallet"]["c1"]["time"], 75)
        notify.assert_called_once()

    @patch("services.redemption_service.grant_tablet_time")
    @patch("services.redemption_service.send_redemption_notification")
    def test_redemption_is_idempotent(self, notify, grant):
        notify.return_value = {"success": True, "status": "sent"}
        grant.return_value = {"success": True, "status": "sent"}
        save_full_state(
            {
                "childrenData": [
                    {
                        "id": "c1",
                        "name": "Kid",
                        "role": "child",
                        "qustodioUid": "profile-1",
                    }
                ],
                "wallet": {"c1": {"time": 100, "money": 0}},
            },
            expected_revision=0,
        )

        first = redeem("redemption-1", "c1", "Kid", "time", "Tablet", 30)
        second = redeem("redemption-1", "c1", "Kid", "time", "Tablet", 30)

        self.assertEqual(first["wallet"]["c1"]["time"], 70)
        self.assertEqual(second["wallet"]["c1"]["time"], 70)
        self.assertTrue(second["duplicate"])
        grant.assert_called_once()
        notify.assert_called_once()

    def test_admin_session_protects_token_status(self):
        client = self.app.test_client()
        self.assertEqual(client.get("/api/qustodio/token").status_code, 401)
        self.assertEqual(
            client.post("/api/admin/login", json={"pin": "1111"}).status_code,
            401,
        )
        self.assertEqual(
            client.post("/api/admin/login", json={"pin": "2468"}).status_code,
            200,
        )
        response = client.get("/api/qustodio/token")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("token", response.get_json())
        self.assertIn("masked_token", response.get_json())

    def test_qustodio_retry_queue_is_deduplicated_by_redemption(self):
        for _ in range(2):
            enqueue_qustodio_request(
                child_id="c1",
                child_name="Kid",
                qustodio_uid="profile-1",
                minutes=30,
                last_error="temporary failure",
                redemption_id="redemption-1",
            )
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT related_redemption_id, expires_at FROM qustodio_queue"
            ).fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["related_redemption_id"], "redemption-1")
        self.assertIsNotNone(rows[0]["expires_at"])

    @patch("services.sparkle_service._call_gemini")
    def test_sparkle_retries_duplicates_from_the_last_30_days(self, call_gemini):
        recent = "Octopuses have three hearts and blue blood."
        call_gemini.side_effect = [
            "Octopuses have blue blood and three hearts.",
            "Honey never spoils when stored properly.",
        ]
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO app_state (key, json_value, updated_at) VALUES (?, ?, ?)",
                (
                    "dailySparkleHistory",
                    json.dumps([{"date": "2026-09-20", "content": recent}]),
                    "2026-09-20T12:00:00Z",
                ),
            )

        result = get_or_create_daily_sparkle(force_refresh=True, today_key="2026-09-27")

        self.assertTrue(result["success"])
        self.assertEqual(result["content"], "Honey never spoils when stored properly.")
        self.assertEqual(call_gemini.call_count, 2)
        with get_connection() as conn:
            saved = json.loads(
                conn.execute(
                    "SELECT json_value FROM app_state WHERE key = 'dailySparkleHistory'"
                ).fetchone()["json_value"]
            )
        self.assertEqual(saved[0]["date"], "2026-09-27")
        self.assertEqual(saved[0]["content"], result["content"])
        self.assertTrue(saved[0]["topic"])
        self.assertTrue(saved[0]["category"])

    @patch("services.sparkle_service._call_gemini")
    def test_sparkle_does_not_reuse_a_recent_topic(self, call_gemini):
        call_gemini.return_value = "A fresh and specific Sparkle."
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO app_state (key, json_value, updated_at) VALUES (?, ?, ?)",
                (
                    "dailySparkleHistory",
                    json.dumps(
                        [
                            {
                                "date": "2026-09-28",
                                "content": "Yesterday's statement.",
                                "topic": "space-planets",
                                "category": "Space",
                            }
                        ]
                    ),
                    "2026-09-28T12:00:00Z",
                ),
            )

        result = get_or_create_daily_sparkle(force_refresh=True, today_key="2026-09-29")

        self.assertTrue(result["success"])
        self.assertNotEqual(result["topic"], "space-planets")
        self.assertNotEqual(result["category"], "Space")

    def test_kids_can_advance_through_the_sparkle_pool_without_admin(self):
        pool = {
            "week": "2026-W40",
            "generatedAt": "2026-09-29T12:00:00Z",
            "items": [
                {"content": "First fresh Sparkle.", "category": "Science", "topic": "first"},
                {"content": "Second fresh Sparkle.", "category": "Arts", "topic": "second"},
            ],
        }
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO app_state (key, json_value, updated_at) VALUES (?, ?, ?)",
                ("weeklySparklePool", json.dumps(pool), "2026-09-29T12:00:00Z"),
            )

        client = self.app.test_client()
        first = client.post(
            "/api/sparkle",
            json={"nextSparkle": True, "todayKey": "2026-09-29"},
        )
        second = client.post(
            "/api/sparkle",
            json={"nextSparkle": True, "todayKey": "2026-09-29"},
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.get_json()["content"], "First fresh Sparkle.")
        self.assertEqual(second.get_json()["content"], "Second fresh Sparkle.")
        self.assertEqual(second.get_json()["remaining"], 0)

    @patch("services.sparkle_service._call_gemini")
    def test_empty_kid_sparkle_pool_does_not_trigger_paid_generation(self, call_gemini):
        client = self.app.test_client()

        response = client.post(
            "/api/sparkle",
            json={"nextSparkle": True, "todayKey": "2026-09-29"},
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.get_json()["status"], "empty")
        call_gemini.assert_not_called()

    @patch("services.sparkle_service._is_too_similar", return_value=False)
    @patch("services.sparkle_service._call_gemini_pool")
    def test_weekly_sparkle_refill_stores_100_items(self, call_gemini_pool, _similar):
        call_gemini_pool.return_value = [
            {
                "content": f"Sparkle {index}: token{index:03d} meets idea{index:03d} today.",
                "category": ("Science", "Space", "Nature", "History")[index % 4],
                "topic": f"topic-{index:03d}",
            }
            for index in range(100)
        ]

        result = refresh_sparkle_pool_if_due(today_key="2026-09-29", force=True)

        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 100)
        self.assertEqual(call_gemini_pool.call_count, 1)
        with get_connection() as conn:
            saved = json.loads(
                conn.execute(
                    "SELECT json_value FROM app_state WHERE key = 'weeklySparklePool'"
                ).fetchone()["json_value"]
            )
        self.assertEqual(saved["week"], "2026-W40")
        self.assertEqual(len(saved["items"]), 100)

    @patch("services.theme_service._request_theme_image")
    def test_daily_theme_generates_once_and_is_served(self, request_theme_image):
        request_theme_image.return_value = (b"test-jpeg-bytes", "image/jpeg")

        first = ensure_daily_theme("2026-09-30")
        second = ensure_daily_theme("2026-09-30")

        self.assertTrue(first["ready"])
        self.assertEqual(first, second)
        self.assertEqual(request_theme_image.call_count, 1)
        self.assertEqual(get_daily_theme("2026-09-30")["themeId"], first["themeId"])
        tomorrow = ensure_daily_theme("2026-10-01")
        self.assertNotEqual(tomorrow["themeId"], first["themeId"])
        self.assertEqual(get_daily_theme("2026-09-30"), first)
        self.assertEqual(get_daily_theme("2026-10-01"), tomorrow)
        self.assertEqual(ensure_daily_theme("2026-09-30"), first)
        self.assertEqual(request_theme_image.call_count, 2)

        client = self.app.test_client()
        metadata_response = client.get("/api/theme/today?date=2026-09-30")
        image_response = client.get("/api/theme/image/2026-09-30")
        self.assertEqual(metadata_response.status_code, 200)
        self.assertEqual(image_response.status_code, 200)
        self.assertEqual(image_response.data, b"test-jpeg-bytes")
        image_response.close()

    def test_daily_theme_endpoint_uses_fallback_when_artwork_is_missing(self):
        response = self.app.test_client().get("/api/theme/today?date=2026-09-30")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()["ready"])
        self.assertTrue(response.get_json()["name"])
        self.assertEqual(self.app.test_client().get("/api/theme/today?date=invalid").status_code, 400)


if __name__ == "__main__":
    unittest.main()
