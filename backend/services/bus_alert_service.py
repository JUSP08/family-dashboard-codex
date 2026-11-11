"""Read-only HA observer. Never calls services, changes automations, or stores mail bodies."""
from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import websocket
from config import settings

AUTOMATION_ID = '1794190907915'
AUTOMATION = 'automation.bethel_middle_school_bus_all_speakers'
IMAP_ENTRY = '01M6Z1JTBJ8ARXJQT450554PZ1'
SPEAKER = 'media_player.all_speakers'
DB_PATH = Path(settings.sqlite_path).with_name('bus_alerts.db')
LOCAL = ZoneInfo('America/New_York')
_started = False
_lock = threading.Lock()


def stamp(value):
    try:
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return parsed.timestamp() if parsed.tzinfo else None
    except (ValueError, TypeError):
        return None


@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    try:
        db.row_factory = sqlite3.Row
        with db:
            db.execute('CREATE TABLE IF NOT EXISTS alerts (key TEXT PRIMARY KEY, received REAL, payload TEXT)')
            db.execute('CREATE TABLE IF NOT EXISTS monitor (id INTEGER PRIMARY KEY, payload TEXT)')
            yield db
    finally:
        db.close()


def save_alert(alert, trace=False):
    with connect() as db:
        old = db.execute('SELECT payload FROM alerts WHERE key=?', (alert['key'],)).fetchone()
        if old:
            previous = json.loads(old['payload'])
            if not trace:
                return previous
            alert['received'] = min(previous['received'], alert['received'])
        db.execute('INSERT OR REPLACE INTO alerts VALUES (?,?,?)',
                   (alert['key'], alert['received'], json.dumps(alert)))
        db.execute('DELETE FROM alerts WHERE received < ?', (time.time()-30*86400,))
    return alert


def parse_email(event):
    data = event.get('data', {})
    if (data.get('entry_id') != IMAP_ENTRY or
        str(data.get('sender', '')).lower() != 'support@myfirstview.com' or
        str(data.get('username', '')).lower() != 'jlindst@gmail.com' or
        str(data.get('subject', '')).strip() != 'First View: Distance-Based Notification' or
        data.get('initial') is not True):
        return None
    received = stamp(event.get('time_fired')) or time.time()
    sent = stamp(data.get('date'))
    local = datetime.fromtimestamp(received, LOCAL)
    morning = local.weekday() < 5 and 6 <= local.hour < 12
    fresh = sent is not None and 0 <= received-sent <= 180
    eligible = morning and fresh
    key = hashlib.sha256(f"{IMAP_ENTRY}|{data.get('uid')}|{data.get('date')}".encode()).hexdigest()[:32]
    # Extract only known first names; never persist the message or stop address.
    text = str(data.get('text', '')).upper()
    children = [name for name in ('Hannah', 'Tristan') if name.upper() in text]
    return {'key': key, 'received': received, 'email_at': sent, 'children': children,
            'eligible': eligible, 'status': 'pending' if eligible else 'skipped',
            'detail': 'Waiting for announcement outcome.' if eligible else
                      ('Outside school-morning hours.' if not morning else 'Old or undated email; no arrival banner.'),
            'run_id': None, 'completed_at': None}


def parse_trace(trace):
    event = None
    for steps in trace.get('trace', {}).values():
        for step in steps:
            candidate = step.get('changed_variables', {}).get('trigger', {}).get('event')
            if candidate:
                event = candidate
    alert = parse_email(event or {})
    if not alert:
        return None  # Manual tests are not bus arrivals.
    alert['run_id'] = trace.get('run_id')
    alert['completed_at'] = stamp(trace.get('timestamp', {}).get('finish'))
    execution = trace.get('script_execution')
    steps = trace.get('trace', {})
    errors = bool(trace.get('error')) or any(s.get('error') for entries in steps.values() for s in entries)
    actions = [s for path, entries in steps.items() if path.startswith('action/') for s in entries]
    spoke = any(s.get('result', {}).get('params', {}).get('domain') == 'tts' and
                s.get('result', {}).get('params', {}).get('service') == 'speak' for s in actions)
    if errors:
        alert.update(status='failed', detail='Home Assistant reported an announcement error. Check the automation trace.')
    elif execution == 'finished' and spoke:
        alert.update(status='submitted', detail='Speech action completed for All Speakers. Sound in each room is not verified.')
    elif execution == 'failed_conditions':
        failed = next((path for path, entries in steps.items() if path.startswith('condition/')
                       and any(s.get('result', {}).get('result') is False for s in entries)), '')
        if failed == 'condition/2':
            alert.update(status='skipped', detail='Once-per-morning rule: a prior announcement already ran.')
        elif failed == 'condition/3':
            alert.update(status='failed', detail='Speaker group or speech provider was unavailable.')
        elif alert['eligible']:
            alert.update(status='failed', detail='A morning announcement was blocked by an automation condition.')
    elif trace.get('state') == 'stopped':
        alert.update(status='failed', detail='Automation stopped without a completed speech action.')
    return alert


def save_health(payload):
    with connect() as db:
        db.execute('INSERT OR REPLACE INTO monitor VALUES (1,?)', (json.dumps(payload),))


def get_bus_status():
    now = time.time()
    with connect() as db:
        row = db.execute('SELECT payload FROM monitor WHERE id=1').fetchone()
        health = json.loads(row['payload']) if row else {}
        alerts = [json.loads(r['payload']) for r in db.execute('SELECT payload FROM alerts ORDER BY received DESC LIMIT 100')]
    warnings = list(health.get('warnings', []))
    if now-health.get('checked_at', 0) > 60:
        warnings.insert(0, 'Bus monitoring is offline or stale. Do not rely on the dashboard for an arrival alert.')
    for alert in alerts:
        if alert['status'] == 'pending' and now-alert['received'] > 60:
            alert.update(status='unconfirmed', detail='Email received, but no completed announcement was found within 60 seconds.')
    failures = [a for a in alerts if a['status'] in ('failed', 'unconfirmed') and 0 <= now-a['received'] < 86400]
    if failures:
        warnings.append('A bus announcement failed or could not be confirmed in the last 24 hours. See alert history.')
    active = next((a for a in alerts if a['eligible'] and a['status'] != 'skipped'
                   and a['email_at'] is not None and 0 <= now-a['email_at'] < 600), None)
    return {'checked_at': health.get('checked_at'), 'warnings': list(dict.fromkeys(warnings)),
            'active': active, 'history': alerts, 'retention_days': 30,
            'connected': bool(health.get('connected')) and now-health.get('checked_at', 0) <= 60}


class Observer:
    def __init__(self):
        self.ws = None
        self.sequence = 0
        self.finished = set()

    def receive_event(self, message):
        if message.get('type') == 'event':
            alert = parse_email(message.get('event', {}))
            if alert:
                save_alert(alert)

    def command(self, kind, **args):
        self.sequence += 1
        number = self.sequence
        self.ws.send(json.dumps({'id': number, 'type': kind, **args}))
        deadline = time.monotonic()+15
        while time.monotonic() < deadline:
            message = json.loads(self.ws.recv())
            if message.get('id') == number and message.get('type') == 'result':
                if not message.get('success'):
                    raise RuntimeError('Home Assistant rejected a monitoring request')
                return message.get('result')
            self.receive_event(message)
        raise TimeoutError('Home Assistant monitoring timed out')

    def poll(self):
        summaries = self.command('trace/list', domain='automation', item_id=AUTOMATION_ID)
        for summary in summaries:
            run = summary['run_id']
            if run in self.finished:
                continue
            trace = self.command('trace/get', domain='automation', item_id=AUTOMATION_ID, run_id=run)
            alert = parse_trace(trace)
            if alert:
                save_alert(alert, trace=True)
            if summary.get('state') == 'stopped':
                self.finished.add(run)
        self.finished.intersection_update(s['run_id'] for s in summaries)
        states = {s['entity_id']: s for s in self.command('get_states')}
        entries = self.command('config_entries/get')
        warnings = []
        if states.get(AUTOMATION, {}).get('state') != 'on':
            warnings.append('Bus announcement automation is disabled or unavailable.')
        for entity, label in [(SPEAKER, 'All Speakers'), ('tts.google_translate_en_com', 'Speech provider')]:
            if entity not in states or states[entity].get('state') == 'unavailable' or (entity == SPEAKER and states[entity].get('state') == 'unknown'):
                warnings.append(label+' is unavailable.')
        imap = next((e for e in entries if e.get('entry_id') == IMAP_ENTRY), {})
        if imap.get('state') != 'loaded' or imap.get('disabled_by'):
            warnings.append('Bus email connection is not loaded. Alerts may not arrive.')
        save_health({'connected': True, 'checked_at': time.time(), 'warnings': warnings})

    def run(self):
        while True:
            try:
                if not settings.ha_token:
                    raise RuntimeError('Home Assistant is not configured')
                self.ws = websocket.create_connection(settings.ha_url.replace('http', 'ws', 1)+'/api/websocket', timeout=15)
                if json.loads(self.ws.recv()).get('type') != 'auth_required':
                    raise RuntimeError('Unexpected handshake')
                self.ws.send(json.dumps({'type': 'auth', 'access_token': settings.ha_token}))
                if json.loads(self.ws.recv()).get('type') != 'auth_ok':
                    raise RuntimeError('Authentication failed')
                self.command('subscribe_events', event_type='imap_content')
                while True:
                    self.ws.settimeout(15)
                    self.poll()
                    end = time.monotonic()+10
                    while time.monotonic() < end:
                        self.ws.settimeout(max(0.1, end-time.monotonic()))
                        try:
                            self.receive_event(json.loads(self.ws.recv()))
                        except websocket.WebSocketTimeoutException:
                            break
            except Exception:
                # Never include raw exceptions, tokens, mail, or HA response bodies in logs/API.
                save_health({'connected': False, 'checked_at': time.time(),
                             'warnings': ['Bus monitoring cannot reach Home Assistant or its trace history. Announcement status is unknown.']})
            finally:
                if self.ws:
                    self.ws.close()
            time.sleep(10)


def start_bus_monitor():
    global _started
    with _lock:
        if not _started:
            _started = True
            threading.Thread(target=Observer().run, name='bus-alert-monitor', daemon=True).start()
