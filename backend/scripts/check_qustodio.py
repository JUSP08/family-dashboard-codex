"""Read-only Qustodio diagnostics. Never prints credentials or grants time."""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.qustodio_exact import QustodioController  # noqa: E402
from config import settings  # noqa: E402
import requests  # noqa: E402


def token_expiry(token, now=None):
    """JWT claims are an unverified hint; only the API can confirm acceptance."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return 'unknown (opaque token)'
        payload = parts[1] + '=' * (-len(parts[1]) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
        expiry = claims.get('exp')
        if isinstance(expiry, bool) or not isinstance(expiry, (int, float)):
            return 'unknown (no numeric expiry claim)'
        expires = dt.datetime.fromtimestamp(expiry, dt.timezone.utc)
        now = now or dt.datetime.now(dt.timezone.utc)
        state = 'expired' if expires <= now else 'not expired'
        return f'{state} by unverified JWT claim; expires {expires.isoformat()}'
    except (ValueError, TypeError, AttributeError, OverflowError, OSError):
        return 'unknown (unreadable token claims)'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-api', action='store_true',
                        help='Make one read-only usage GET to Qustodio; no refresh or writes.')
    args = parser.parse_args(argv)
    controller = QustodioController()
    values = controller._load_env_values()
    token = controller.token or ''
    email, password = controller._load_credentials()
    print(f'Backend: {BACKEND_DIR}')
    print(f'Token present: {bool(token)}')
    print(f'QUSTODIO_TOKEN / TOKEN conflict: {bool(values.get("QUSTODIO_TOKEN") and values.get("TOKEN") and values["QUSTODIO_TOKEN"] != values["TOKEN"])}')
    print('Token precedence: backend/.env QUSTODIO_TOKEN, then TOKEN, then startup settings')
    print(f'Token expiry: {token_expiry(token) if token else "missing"}')
    print(f'Refresh credentials present: {bool(email and password)}')
    print(f'Account configured: {bool(controller.account_uid)}')
    print(f'Configured profile count: {len(controller.kids)}')
    if not args.check_api:
        print('API not checked. Add --check-api for a read-only authentication check.')
        return 0
    if not token or not controller.account_uid or not controller.kids:
        print('API check skipped: token, account, and at least one profile mapping required.')
        return 2
    uid = next(iter(controller.kids.values()))
    url = f'{controller.base_url}/accounts/{controller.account_uid}/profiles/{uid}/summary_hourly'
    try:
        response = requests.get(url, params={'date': dt.date.today().isoformat()},
                                headers=controller.get_auth_header(),
                                timeout=settings.qustodio_timeout_seconds,
                                allow_redirects=False)
    except requests.RequestException as exc:
        print(f'API check failed: {type(exc).__name__} (details withheld).')
        return 3
    print(f'Usage GET HTTP status: {response.status_code}')
    if response.status_code == 200:
        print('Token accepted for this profile usage request. No time was added.')
        return 0
    if response.status_code == 401:
        print('Authentication rejected: token may be expired or revoked.')
    elif response.status_code == 403:
        print('Access forbidden: investigate permissions/account/profile; expiry is not proven.')
    else:
        print('Unexpected response; expiry is not proven. Response body withheld.')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
