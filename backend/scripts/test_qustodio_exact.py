from __future__ import annotations

import io
import os
import sys
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.qustodio_exact import QustodioController  # noqa: E402


def mask(value: str | None, keep: int = 8) -> str:
    if not value:
        return "(missing)"
    if len(value) <= keep:
        return value
    return value[:keep] + "..."


def main() -> None:
    print("=== Qustodio Exact Debug Runner ===")
    print(f"CWD: {os.getcwd()}")
    print(f"Script dir: {SCRIPT_DIR}")
    print(f"Backend dir: {BACKEND_DIR}")
    print(f".env exists here: {Path('.env').resolve()} -> {Path('.env').exists()}")

    print("Environment snapshot:")
    print(f"  QUSTODIO_EMAIL: {mask(os.getenv('QUSTODIO_EMAIL'))}")
    print(f"  QUSTODIO_PW: {'(present)' if os.getenv('QUSTODIO_PW') else '(missing)'}")
    print(f"  TOKEN: {mask(os.getenv('TOKEN'))}")

    controller = QustodioController()

    print("Controller snapshot:")
    print(f"  account_uid: {controller.account_uid}")
    print(f"  base_url: {controller.base_url}")
    print(f"  token in controller: {mask(controller.token)}")
    print(f"  kids keys: {list(controller.kids.keys())}")
    print(f"  tristan uid: {controller.kids.get('tristan')}")
    print(f"  blake uid: {controller.kids.get('blake')}")

    child_name = "tristan"
    minutes = 5

    print(f"\nRunning exact script logic: add_time(name='{child_name}', minutes={minutes})")

    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()

    try:
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            result = controller.add_time(name=child_name, minutes=minutes)
    except Exception as exc:
        print("\n=== EXCEPTION ===")
        print(type(exc).__name__)
        print(str(exc))
    else:
        print("\n=== RETURN VALUE ===")
        print(result)

    print("\n=== CAPTURED STDOUT ===")
    print(stdout_buffer.getvalue() or "(none)")

    print("\n=== CAPTURED STDERR ===")
    print(stderr_buffer.getvalue() or "(none)")


if __name__ == "__main__":
    main()