"""Run offline tests with settings isolated before any service is imported."""
import os
import sys
import tempfile
import unittest
from pathlib import Path


def main():
    backend = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend))
    with tempfile.TemporaryDirectory(prefix="dashboard-tests-") as directory:
        os.environ.update(
            SQLITE_PATH=str(Path(directory) / "dashboard.db"),
            DASHBOARD_ADMIN_PIN="2468",
            DASHBOARD_SECRET_KEY="isolated-test-secret-not-production",
            MORNING_BRIEFING_ENABLED="false",
        )
        suite = unittest.defaultTestLoader.discover(str(backend / "tests"))
        result = unittest.TextTestRunner(verbosity=1).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
