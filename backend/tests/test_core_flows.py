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
from services.state_service import (  # noqa: E402
    StateConflictError,
    get_full_state,
    save_full_state,
)


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


if __name__ == "__main__":
    unittest.main()
