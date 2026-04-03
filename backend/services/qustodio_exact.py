import os
import requests
import datetime
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()


class QustodioController:
    def __init__(self):
        self.account_uid = "61672d9e46804349af49bd547bbb51a5"
        self.base_url = "https://api.qustodio.com/v2"
        self.token = os.getenv("TOKEN")
        self.kids = {
            "tristan": "34f4ad13cbaf49b8ba8441ea807685b3",
            "blake": "e4fb6de0dde041c5a5d927b0c29ef433",
            "hannah": "",
            "sloane": "",
            "emerson": "",
            "guinevere": "",
        }

    def get_auth_header(self):
        """Uses the exact headers found in your HAR file."""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Qustodio-Client": "QustodioPARWeb/PAR-182.34.1-19-g8237c6af (p:browser)",
        }

    def refresh_token(self, headless=False):
        """Aggressive token catching looking for the OAuth response."""
        email = os.getenv("QUSTODIO_EMAIL")
        password = os.getenv("QUSTODIO_PW")

        with sync_playwright() as p:
            print(f"🚀 Launching browser for {email}...")
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
            )
            page = context.new_page()

            try:
                page.goto("https://family.qustodio.com/login")

                if "login" in page.url:
                    page.wait_for_selector("#form_email", timeout=10000)
                    page.fill("#form_email", email)
                    page.fill("#form_password", password)

                print("⏳ Monitoring network for the access token response...")

                with page.expect_response(
                    lambda response: "oauth2/access_token" in response.url,
                    timeout=30000,
                ) as response_info:
                    page.click('button[type="submit"]')

                token_response = response_info.value
                token_data = token_response.json()

                if "access_token" in token_data:
                    self.token = token_data["access_token"]
                    self._update_env(self.token)
                    print(f"✅ SUCCESS: Token snagged ({self.token[:10]}...)")

                    input(
                        "🛑 Paused: Browser is open for inspection. Press Enter in this terminal when you are ready to close it and continue..."
                    )

                    return self.token
                else:
                    print("❌ Token catch failed: 'access_token' key not found in response.")
                    return None

            except Exception as e:
                print(f"❌ Token catch failed: {e}")
                return None
            finally:
                browser.close()

    def _update_env(self, token):
        """Ensures the .env file stays current with the latest valid token."""
        with open(".env", "w") as f:
            f.write(f'QUSTODIO_EMAIL="{os.getenv("QUSTODIO_EMAIL")}"\n')
            f.write(f'QUSTODIO_PW="{os.getenv("QUSTODIO_PW")}"\n')
            f.write(f'TOKEN="{token}"\n')

    def add_time(self, name, minutes, uid=None):
        """HAR-Verified method to add time to a specific child."""
        resolved_uid = uid or self.kids.get(name.lower())
        if not resolved_uid:
            print(f"Error: {name} not found in kids list.")
            return False

        headers = self.get_auth_header()
        today = datetime.date.today().isoformat()

        # 1. Get current usage (terminal visibility only)
        usage_url = (
            f"{self.base_url}/accounts/{self.account_uid}/profiles/"
            f"{resolved_uid}/summary_hourly?date={today}"
        )
        usage_res = requests.get(usage_url, headers=headers)

        if usage_res.status_code == 200:
            used_seconds = sum(
                item.get("screen_time_seconds", 0)
                for item in usage_res.json()
                if isinstance(item, dict)
            )
            print(f"📊 {name.capitalize()} has used {used_seconds / 60:.1f}m today.")
        else:
            print("⚠️ Could not fetch current usage, but continuing with time addition...")

        # 2. Prep the new time block
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

        # 3. Fire the POST
        post_url = (
            f"{self.base_url}/accounts/{self.account_uid}/profiles/"
            f"{resolved_uid}/rules/calendar_restrictions"
        )
        res = requests.post(post_url, json=payload, headers=headers)

        if res.status_code == 201:
            print(f"🚀 SUCCESS: Added {minutes}m block to {name.capitalize()}.")
            return True
        else:
            print(f"❌ API Error: {res.status_code} - {res.text}")
            return False