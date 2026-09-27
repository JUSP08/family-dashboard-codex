#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

for command_name in git npm curl ss python3; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Missing required command: $command_name" >&2
    exit 1
  }
done

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Tracked source files have local changes. Commit or review them before updating:" >&2
  git status --short
  exit 1
fi

echo "Fetching the latest dashboard source..."
git fetch --prune origin

if ! git merge-base --is-ancestor HEAD origin/main; then
  echo "This checkout cannot fast-forward to origin/main." >&2
  echo "Use docs/UBUNTU_DEPLOY.md for the one-time history-rewrite procedure." >&2
  exit 1
fi

listener_pid="$(
  ss -ltnp 'sport = :8099' 2>/dev/null |
    sed -n 's/.*pid=\([0-9]\+\).*/\1/p' |
    head -n1
)"

if [ -n "$listener_pid" ]; then
  listener_command="$(ps -p "$listener_pid" -o args=)"
  case "$listener_command" in
    *python*app.py*)
      echo "Stopping dashboard PID $listener_pid..."
      kill "$listener_pid"
      for _ in $(seq 1 20); do
        kill -0 "$listener_pid" 2>/dev/null || break
        sleep 0.5
      done
      ;;
    *)
      echo "Port 8099 belongs to an unexpected process: $listener_command" >&2
      exit 1
      ;;
  esac
elif curl -fsS http://127.0.0.1:8099/health >/dev/null 2>&1; then
  echo "Dashboard is reachable, but its process could not be identified safely." >&2
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$HOME/family-dashboard-backups/$timestamp"
mkdir -p "$backup_dir"

live_db="$(
  find backend -type f -name family_dashboard.db -printf '%T@ %p\n' 2>/dev/null |
    sort -nr |
    head -n1 |
    cut -d' ' -f2-
)"

if [ -n "$live_db" ] && [ -f "$live_db" ]; then
  cp -a "$live_db" "$backup_dir/family_dashboard.db"
fi
if [ -f backend/.env ]; then
  cp -a backend/.env "$backup_dir/.env"
fi
git rev-parse HEAD > "$backup_dir/source-commit.txt"

echo "Backup created at $backup_dir"
git merge --ff-only origin/main

mkdir -p backend/data
if [ -f "$backup_dir/family_dashboard.db" ]; then
  cp -a "$backup_dir/family_dashboard.db" backend/data/family_dashboard.db
fi
if [ -f "$backup_dir/.env" ]; then
  cp -a "$backup_dir/.env" backend/.env
fi

if [ ! -x backend/.venv/bin/python ]; then
  python3 -m venv backend/.venv
fi

backend/.venv/bin/python -m pip install -r backend/requirements.txt
backend/.venv/bin/python -m playwright install chromium
npm --prefix frontend ci
npm --prefix frontend run build

echo "Starting dashboard..."
cd backend
nohup ./.venv/bin/python app.py > dashboard.log 2>&1 &
dashboard_pid=$!
echo "$dashboard_pid" > data/dashboard.pid
cd "$REPO_ROOT"

healthy=false
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8099/health >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 1
done

if [ "$healthy" != true ]; then
  echo "Dashboard did not become healthy. Recent log output:" >&2
  tail -n 30 backend/dashboard.log >&2 || true
  exit 1
fi

host_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "Dashboard updated successfully."
echo "Commit: $(git rev-parse --short HEAD)"
echo "Backup: $backup_dir"
echo "Local:  http://127.0.0.1:8099/"
if [ -n "$host_ip" ]; then
  echo "Network: http://$host_ip:8099/"
fi
