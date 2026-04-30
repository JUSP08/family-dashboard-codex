import datetime

import requests
from dotenv import set_key
from playwright.sync_api import sync_playwright

from config import BACKEND_ROOT, settings


class QustodioController:
    def __init__(self):
        self.account_uid = settings.qustodio_account_uid
        self.base_url = "https://api.qustodio.com/v2"
        self.token = settings.qustodio_token
        self.kids = {
            "tristan": "34f4ad13cbaf49b8ba8441ea807685b3",
            "blake": "e4fb6de0dde041c5a5d927b0c29ef433",
            "hannah": "f8da9355b3fe490fa9fb3862f519429a",
            "sloane": "591bca889e894f28b821a32a90ecab34",
            "emerson": "ffdc32e0c9204db586e3f170f458fa4b",
            "guinevere": "",
        }

    def get_auth_header(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Qustodio-Client": "QustodioPARWeb/PAR-182.34.1-19-g8237c6af (p:browser)",
        }

    def refresh_token(self, headless=None):
        email = settings.qustodio_email
        password = settings.qustodio_password
        launch_headless = settings.qustodio_headless if headless is None else headless

        if not email or not password:
            print("Qustodio credentials are missing; cannot refresh token.")
            return None

        with sync_playwright() as p:
            print(f"Launching browser for {email}...")
            browser = p.chromium.launch(headless=launch_headless)
            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/142.0.0.0 Safari/537.36"
                )
            )
            page = context.new_page()

            try:
                page.goto("https://family.qustodio.com/login")

                if "login" in page.url:
                    page.wait_for_selector("#form_email", timeout=10000)
                    page.fill("#form_email", email)
                    page.fill("#form_password", password)

                print("Monitoring network for the access token response...")

                with page.expect_response(
                    lambda response: "oauth2/access_token" in response.url,
                    timeout=30000,
                ) as response_info:
                    page.click('button[type="submit"]')

                token_data = response_info.value.json()

                if "access_token" not in token_data:
                    print("Token refresh failed: 'access_token' key not found in response.")
                    return None

                self.token = token_data["access_token"]
                self._update_env(self.token)
                print(f"SUCCESS: Token refreshed ({self.token[:10]}...)")
                return self.token

            except Exception as exc:
                print(f"Token refresh failed: {exc}")
                return None
            finally:
                browser.close()

    def _update_env(self, token):
        env_path = BACKEND_ROOT / ".env"
        env_path.touch(exist_ok=True)
        set_key(str(env_path), "QUSTODIO_TOKEN", token)
        set_key(str(env_path), "TOKEN", token)

    def add_time(self, name, minutes, uid=None):
        resolved_uid = uid or self.kids.get(name.lower())
        if not resolved_uid:
            print(f"Error: {name} not found in kids list.")
            return False

        if not self.token:
            print("Error: QUSTODIO_TOKEN is missing.")
            return False

        headers = self.get_auth_header()
        today = datetime.date.today().isoformat()

        usage_url = (
            f"{self.base_url}/accounts/{self.account_uid}/profiles/"
            f"{resolved_uid}/summary_hourly?date={today}"
        )
        usage_res = requests.get(
            usage_url,
            headers=headers,
            timeout=settings.qustodio_timeout_seconds,
        )

        if usage_res.status_code == 200:
            used_seconds = sum(
                item.get("screen_time_seconds", 0)
                for item in usage_res.json()
                if isinstance(item, dict)
            )
            print(f"{name.capitalize()} has used {used_seconds / 60:.1f}m today.")
        else:
            print("Could not fetch current usage, but continuing with time addition.")

        added_duration = int(minutes * 60)
        now_local = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")

        payload = {
            "account_uid": self.account_uid,
            "profile_uid": resolved_uid,
            "restriction_type": 2,
            "usage_type": 0,
            "duration": added_duration,
            "rrule": f"DTSTART:{now_local}\nFREQ=DAILY;COUNT=1",
        }

        post_url = (
            f"{self.base_url}/accounts/{self.account_uid}/profiles/"
            f"{resolved_uid}/rules/calendar_restrictions"
        )
        res = requests.post(
            post_url,
            json=payload,
            headers=headers,
            timeout=settings.qustodio_timeout_seconds,
        )

        if res.status_code == 201:
            print(f"SUCCESS: Added {minutes}m block to {name.capitalize()}.")
            return True

        print(f"API Error: {res.status_code} - {res.text}")
        return False
