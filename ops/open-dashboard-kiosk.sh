#!/usr/bin/env bash
set -Eeuo pipefail

# Run in a terminal on the Ubuntu desktop, not a headless SSH session.
if [ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  echo "Run this launcher on the Ubuntu desktop (or its remote desktop session)." >&2
  exit 1
fi
url="http://127.0.0.1:8099/"
for browser in chromium chromium-browser google-chrome firefox; do
  if command -v "$browser" >/dev/null 2>&1; then
    if [ "$browser" = firefox ]; then
      exec "$browser" --new-window --kiosk "$url"
    fi
    exec "$browser" --user-data-dir="$HOME/.config/family-dashboard-kiosk" --no-first-run --kiosk "$url"
  fi
done
echo "No supported browser found. Open the dashboard in your browser and press F11." >&2
exit 1
