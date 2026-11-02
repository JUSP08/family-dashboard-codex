"""Offline tests: no real credentials, browser launches, or time grants."""
import base64
import datetime as dt
import json
import io
import sqlite3
import tempfile
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

from scripts.check_qustodio import database_profile_uids, main as check_main, token_expiry
from services.qustodio_exact import QustodioController
from services import qustodio_service as service


class TokenFlowTests(unittest.TestCase):
    def test_refresh_response_and_bearer_fallback_paths(self):
        cases = (
            ('oauth', False, 'https://api.qustodio.com/v2/example', None, {'access_token': 'oauth-test'}, 'oauth-test'),
            ('timeout_with_bearer', True, 'https://api.qustodio.com/v2/example', 'bearer-test', {}, 'bearer-test'),
            ('timeout_without_bearer', True, 'https://api.qustodio.com/v2/example', None, {}, None),
            ('untrusted_bearer', True, 'https://api.qustodio.com.attacker.invalid/example', 'wrong-test', {}, None),
            ('insecure_bearer', True, 'http://api.qustodio.com/v2/example', 'wrong-test', {}, None),
            ('empty_oauth_with_bearer', False, 'https://api.qustodio.com/v2/example', 'bearer-test', {}, 'bearer-test'),
            ('invalid_json_with_bearer', False, 'https://api.qustodio.com/v2/example', 'bearer-test', ValueError('private-data'), 'bearer-test'),
        )
        for name, timeout, request_url, bearer, body, expected in cases:
            with self.subTest(name=name):
                controller = self.controller({'TOKEN': 'old-test'})
                runtime = MagicMock()
                page = runtime.chromium.launch.return_value.new_context.return_value.new_page.return_value
                page.url = 'https://family.qustodio.com/login'
                callbacks = {}
                page.on.side_effect = lambda event, callback: callbacks.update({event: callback})
                def submit(_selector):
                    if bearer:
                        callbacks['request'](SimpleNamespace(url=request_url, headers={'authorization': f'Bearer {bearer}'}))
                page.click.side_effect = submit
                response = page.expect_response.return_value.__enter__.return_value.value
                if isinstance(body, Exception):
                    response.json.side_effect = body
                else:
                    response.json.return_value = body
                if timeout:
                    page.expect_response.return_value.__exit__.side_effect = PlaywrightTimeoutError('test timeout')
                manager = MagicMock()
                manager.__enter__.return_value = runtime
                with patch.object(controller, '_load_credentials', return_value=('private-email', 'private-password')), \
                        patch('services.qustodio_exact.sync_playwright', return_value=manager), \
                        patch.object(controller, '_update_env') as save, \
                        patch('services.qustodio_exact.requests.post') as grant, \
                        redirect_stdout(io.StringIO()) as output:
                    self.assertEqual(controller.refresh_token(), expected)
                    if expected:
                        save.assert_called_once_with(expected)
                    else:
                        save.assert_not_called()
                        self.assertEqual(controller.token, 'old-test')
                    grant.assert_not_called()
                    runtime.chromium.launch.return_value.close.assert_called_once()
                    for secret in ('private-email', 'private-password', 'private-data', 'oauth-test', 'bearer-test', 'wrong-test'):
                        self.assertNotIn(secret, output.getvalue())
                matcher = page.expect_response.call_args.args[0]
                self.assertTrue(matcher(SimpleNamespace(url='https://api.qustodio.com/v2/oauth2/access_token')))
                self.assertFalse(matcher(SimpleNamespace(url='https://attacker.invalid/oauth2/access_token')))

    def controller(self, values):
        with patch.object(QustodioController, '_load_env_values', return_value=values):
            return QustodioController()

    def test_original_token_name_supported(self):
        self.assertEqual(self.controller({'TOKEN': 'old-name-test'}).token, 'old-name-test')

    def test_new_token_name_wins_when_both_exist(self):
        self.assertEqual(self.controller({'TOKEN': 'newer', 'QUSTODIO_TOKEN': 'older'}).token, 'older')

    def test_header_reloads_token_from_disk(self):
        controller = self.controller({'TOKEN': 'before'})
        with patch.object(controller, '_load_env_values', return_value={'TOKEN': 'after'}):
            self.assertEqual(controller.get_auth_header()['Authorization'], 'Bearer after')

    def test_success_does_not_refresh(self):
        with patch.object(service, '_run_exact_add_time', return_value=(True, 'ok', '')) as grant, \
                patch.object(service, 'refresh_qustodio_token') as refresh:
            self.assertTrue(service._run_exact_add_time_with_token_recovery('child', 5, 'uid')[0])
            grant.assert_called_once_with(name='child', minutes=5, uid='uid')
            refresh.assert_not_called()

    def test_failed_request_refreshes_then_retries_same_profile(self):
        with patch.object(service, '_run_exact_add_time', side_effect=[(False, 'failed', ''), (True, 'ok', '')]) as grant, \
                patch.object(service, 'refresh_qustodio_token', return_value=(True, 'refreshed', '')):
            self.assertTrue(service._run_exact_add_time_with_token_recovery('child', 5, 'uid')[0])
            self.assertEqual(grant.call_count, 2)
            self.assertEqual(grant.call_args_list[0], grant.call_args_list[1])

    def test_refresh_failure_does_not_retry_grant(self):
        with patch.object(service, '_run_exact_add_time', return_value=(False, 'failed', '')) as grant, \
                patch.object(service, 'refresh_qustodio_token', return_value=(False, 'no credentials', '')):
            self.assertFalse(service._run_exact_add_time_with_token_recovery('child', 5, 'uid')[0])
            grant.assert_called_once()

    def test_usage_401_still_attempts_grant_current_behavior(self):
        controller = self.controller({'TOKEN': 'test-only'})
        with patch.object(controller, '_load_token', return_value='test-only'), \
                patch('services.qustodio_exact.requests.get', return_value=SimpleNamespace(status_code=401)), \
                patch('services.qustodio_exact.requests.post', return_value=SimpleNamespace(status_code=401, text='Unauthorized')) as post:
            self.assertFalse(controller.add_time('child', 5, 'uid'))
            post.assert_called_once()

    def test_expired_jwt_hint(self):
        payload = base64.urlsafe_b64encode(json.dumps({'exp': 100}).encode()).decode().rstrip('=')
        self.assertTrue(token_expiry(f'header.{payload}.signature').startswith('expired'))

    def test_future_jwt_hint(self):
        payload = base64.urlsafe_b64encode(json.dumps({'exp': 200}).encode()).decode().rstrip('=')
        self.assertTrue(token_expiry(f'header.{payload}.signature', dt.datetime.fromtimestamp(100, dt.timezone.utc)).startswith('not expired'))

    def test_opaque_and_malformed_tokens_are_safe(self):
        for token in ('test-secret', 'a.%%%%.b', 'a.W10.b', None):
            self.assertTrue(token_expiry(token).startswith('unknown'))

    def test_diagnostic_checks_api_without_writes_or_disclosing_secrets(self):
        controller = SimpleNamespace(
            token='secret-test-token', account_uid='private-account',
            kids={'child': 'private-profile'}, base_url='https://api.qustodio.com/v2',
            _load_env_values=lambda: {},
            _load_credentials=lambda: ('private-email', 'secret-password'),
            get_auth_header=lambda: {'Authorization': 'Bearer secret-test-token'},
        )
        for status, expected_code in ((200, 0), (401, 1), (403, 1)):
            with self.subTest(status=status), \
                    patch('scripts.check_qustodio.QustodioController', return_value=controller), \
                    patch('scripts.check_qustodio.database_profile_uids', return_value=([], 'test')), \
                    patch('scripts.check_qustodio.requests.get', return_value=SimpleNamespace(status_code=status)) as get, \
                    patch('scripts.check_qustodio.requests.post') as post, \
                    patch.object(QustodioController, 'refresh_token') as refresh, \
                    redirect_stdout(io.StringIO()) as output:
                self.assertEqual(check_main(['--check-api']), expected_code)
                get.assert_called_once()
                self.assertFalse(get.call_args.kwargs['allow_redirects'])
                post.assert_not_called()
                refresh.assert_not_called()
                for secret in ('secret-test-token', 'private-account', 'private-profile', 'private-email', 'secret-password'):
                    self.assertNotIn(secret, output.getvalue())

    def test_database_profiles_read_without_modifying_database(self):
        from pathlib import Path
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'test.db'
            conn = sqlite3.connect(path)
            conn.execute('CREATE TABLE app_state (key TEXT, json_value TEXT)')
            conn.execute('INSERT INTO app_state VALUES (?, ?)', ('childrenData', json.dumps([
                {'qustodioUid': 'saved-profile'}, {'qustodioUid': 'saved-profile'},
                {'qustodioUid': ''}, {}, {'qustodioUid': None},
            ])))
            conn.commit()
            conn.close()
            before = path.read_bytes()
            self.assertEqual(database_profile_uids(path)[0], ['saved-profile'])
            self.assertEqual(path.read_bytes(), before)
            missing = Path(directory) / 'missing.db'
            self.assertEqual(database_profile_uids(missing)[0], [])
            self.assertFalse(missing.exists())

    def test_diagnostic_uses_database_profile_without_environment_mapping(self):
        controller = SimpleNamespace(
            token='test-token', account_uid='test-account', kids={},
            base_url='https://api.qustodio.com/v2', _load_env_values=lambda: {},
            _load_credentials=lambda: ('email', 'password'),
            get_auth_header=lambda: {'Authorization': 'Bearer test-token'},
        )
        with patch('scripts.check_qustodio.QustodioController', return_value=controller), \
                patch('scripts.check_qustodio.database_profile_uids', return_value=(['saved-profile'], 'ok')), \
                patch('scripts.check_qustodio.requests.get', return_value=SimpleNamespace(status_code=200)) as get, \
                redirect_stdout(io.StringIO()):
            self.assertEqual(check_main(['--check-api']), 0)
            self.assertIn('/profiles/saved-profile/', get.call_args.args[0])


if __name__ == '__main__':
    unittest.main()
