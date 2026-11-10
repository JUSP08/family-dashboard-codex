"""Source-based morning briefing; schedule is opt-in and disabled by default."""
from __future__ import annotations
import json
import os
import re
import sqlite3
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, time as clock_time
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from config import settings, PROJECT_ROOT
from services.state_service import get_full_state
from services.calendar_service import fetch_calendar_events
from services.bus_alert_service import get_bus_status
from services.home_assistant_service import _request
from services.school_email_service import get_school_email, start_school_email_worker
from services.sparkle_service import get_current_sparkle

LOCAL = ZoneInfo('America/New_York')
ENABLED = os.getenv('MORNING_BRIEFING_ENABLED', 'false').lower() == 'true'
SCHEDULE = {'time':'07:30', 'days':['Monday','Tuesday','Wednesday','Thursday','Friday'],
            'timezone':'America/New_York','speaker':'All Speakers','enabled':ENABLED}
DB_PATH = Path(settings.sqlite_path).with_name('morning_briefing.db')
_lock = threading.Lock()
_started = False


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('CREATE TABLE IF NOT EXISTS briefings (day TEXT PRIMARY KEY, generated REAL, payload TEXT)')
    db.execute('CREATE TABLE IF NOT EXISTS deliveries (day TEXT PRIMARY KEY, attempted REAL, status TEXT)')
    return db


def next_weekday(now=None):
    now = now or datetime.now(LOCAL)
    day = now.date()
    if now.time() >= clock_time(7,30): day += timedelta(days=1)
    while day.weekday() >= 5: day += timedelta(days=1)
    return day


def weather_for(day):
    params={'latitude':41.3712,'longitude':-73.414,'timezone':'America/New_York',
            'temperature_unit':'fahrenheit','daily':'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
            'start_date':day.isoformat(),'end_date':day.isoformat()}
    try:
        r=requests.get('https://api.open-meteo.com/v1/forecast',params=params,timeout=12)
        r.raise_for_status(); data=r.json()['daily']
        if data['time'][0] != day.isoformat(): raise ValueError('Wrong day')
        high=data['temperature_2m_max'][0];low=data['temperature_2m_min'][0];rain=data['precipitation_probability_max'][0]
        if any(not isinstance(value,(int,float)) for value in (high,low,rain)): raise ValueError('Incomplete forecast')
        code=data['weather_code'][0]
        label = ('clear skies' if code==0 else 'partly cloudy skies' if code in (1,2) else 'overcast skies' if code==3
                 else 'fog' if code in (45,48) else 'drizzle' if code in (51,53,55,56,57)
                 else 'rain' if code in (61,63,65,66,67,80,81,82) else 'snow' if code in (71,73,75,77,85,86)
                 else 'thunderstorms' if code in (95,96,99) else 'mixed conditions')
        return {'available':True,'high_f':round(high),'low_f':round(low),'precipitation_percent':round(rain),
                'summary':f'Bethel: {label}, a high of {round(high)} and a low of {round(low)} degrees Fahrenheit. Chance of precipitation: {round(rain)} percent.',
                'source':'Open-Meteo','source_url':'https://open-meteo.com/'}
    except Exception:
        return {'available':False,'summary':'Weather is unavailable. Check the forecast before leaving.','source':'Open-Meteo'}


def calendar_for(day):
    state=get_full_state()
    start=datetime.combine(day,clock_time(),LOCAL)
    end=datetime.combine(day+timedelta(days=1),clock_time(),LOCAL)
    sources=[s for s in state.get('calendarSources',[]) if s.get('type')=='google_api']
    warnings=[]
    def fetch(source):
        try:
            data,status=fetch_calendar_events(source['id'],start.isoformat(),end.isoformat())
            if status != 200:return {**source,'items':[]},f"{source.get('label','Calendar')} could not be checked."
            warning=f"{source.get('label','Calendar')} has more events than the preview retrieved." if data.get('nextPageToken') else None
            return {**source,'items':data.get('items',[])},warning
        except Exception:return {**source,'items':[]},f"{source.get('label','Calendar')} could not be checked."
    with ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(fetch,sources))
    if not sources: warnings.append('No connected calendar sources are configured.')
    warnings += [w for _,w in results if w]
    payload={'date':day.isoformat(),'sources':[s for s,_ in results],
             **{k:state.get(k,[]) for k in ('customEvents','hiddenEventIds','calendarFilters')}}
    try:
        process=subprocess.run(['node',str(PROJECT_ROOT/'ops/briefing-calendar-filter.mjs')],
            input=json.dumps(payload),capture_output=True,text=True,timeout=10,
            env={**os.environ,'TZ':'America/New_York'},check=True)
        events=json.loads(process.stdout)
    except Exception:
        events=[];warnings.append('Calendar filtering is unavailable; no schedule was inferred.')
    return events,warnings,[s.get('label','Calendar') for s in sources]


def spoken_event(event):
    if event['all_day']: return event['title']+'.'
    try:
        date=datetime.fromisoformat(event['start'].replace('Z','+00:00')).astimezone(LOCAL)
        label=date.strftime('%I:%M %p').lstrip('0')
    except (TypeError,ValueError):label='Time unspecified'
    return f"At {label}, {event['title']}."


def sparkle_for(day, now=None):
    if day != (now or datetime.now(LOCAL)).date():
        return {'available':False,'pending':True,'content':None,
                'speech':"The day's Sparkle will be selected that morning."}
    try:
        result=get_current_sparkle(today_key=day.isoformat())
        if result.get('success') and result.get('source')=='local' and result.get('content'):
            return {'available':True,'content':result['content'],
                    'speech':"Today's Sparkle: "+result['content']}
    except Exception:pass
    return {'available':False,'content':None,'speech':"Today's Sparkle is temporarily unavailable."}


def generate(day):
    weather=weather_for(day)
    events,warnings,sources=calendar_for(day)
    reminders=[];agenda=[]
    for event in events:
        school = re.search(r'\b(school|BHS|BMS|JES|RES|Johnson|Rockwell|Berry)\b',' '.join(event['sources'])+' '+event['title'],re.I)
        reminder = school and (event['all_day'] or re.search(r'\b(bring|wear|pack|permission|deadline|early dismissal|no school|closed)\b',event['title'],re.I))
        (reminders if reminder else agenda).append(event)
    bus=get_bus_status()
    bus_text = ('Bus alert monitoring is connected. This checks the system, not whether the bus is approaching.'
                if bus['connected'] and not bus['warnings'] else 'Bus alerts need attention. '+ ' '.join(bus['warnings'][:2]))
    greeting=f"Good morning, Lindstrom family. Here is your briefing for {day.strftime('%A, %B')} {day.day}."
    pieces=[greeting,weather['summary']]
    if warnings: pieces.append('Some calendar information is unavailable. Please check the dashboard notices.')
    pieces.append('On the calendar: '+ ' '.join(spoken_event(e) for e in agenda[:5]) if agenda else
                  ('No other events were found in the calendars checked.' if not warnings else 'The calendar may be incomplete.'))
    if len(agenda)>5:pieces.append(f'{len(agenda)-5} more events are on the dashboard.')
    pieces.append('School reminders: '+' '.join(spoken_event(e) for e in reminders[:3]) if reminders else
                  'No school reminders were found in the calendars checked. This does not confirm that school is open.')
    school_email = get_school_email(day)
    if school_email.get('warning'):
        pieces.append(school_email['warning'])
    if school_email['items']:
        pieces.append('From school and team emails: '+' '.join(i['text'] for i in school_email['items'][:3]))
        if len(school_email['items'])>3: pieces.append('More email reminders are on the dashboard.')
    if len(reminders)>3:pieces.append(f'{len(reminders)-3} more school reminders are on the dashboard.')
    pieces.append(bus_text)
    sparkle=sparkle_for(day)
    pieces.append(sparkle['speech'])
    speech='\n\n'.join(pieces)
    if len(speech)>2800:
        # Keep a bounded announcement without cutting away source-health caveats.
        pieces=[greeting,weather['summary'],'Please check the dashboard for today\'s calendar and school reminders.',bus_text]
        if warnings:pieces.append('Some calendar sources could not be checked.')
        if school_email.get('warning'):pieces.append(school_email['warning'])
        pieces.append(sparkle['speech'])
        speech='\n\n'.join(pieces)
    return {'date':day.isoformat(),'generated_at':time.time(),'weather':weather,'agenda':agenda,
            'school_reminders':reminders,'calendar_sources':sources,'warnings':warnings,
            'bus':{'checked_at':bus['checked_at'],'connected':bus['connected'],'warnings':bus['warnings'],'summary':bus_text},
            'speech':speech,'schedule':SCHEDULE,'school_email':school_email,'sparkle':sparkle,
            'school_note':'Calendar reminders and locally extracted dated notices from school, ParentSquare and sportsYou emails. Check source emails for details. Ambiguous dates, attachments and private student reports are excluded.',
            'estimated_seconds':round(len(speech.split())/2.4)}


def get_briefing(date_text=None, force=False):
    now=datetime.now(LOCAL)
    default_day=now.date() if ENABLED and now.weekday()<5 and now.hour<12 else next_weekday(now)
    day=datetime.fromisoformat(date_text).date() if date_text else default_day
    if not now.date() <= day <= now.date()+timedelta(days=7): raise ValueError('Choose today or a date within the next seven days')
    with _lock:
        with connect() as db:
            row=db.execute('SELECT generated,payload FROM briefings WHERE day=?',(day.isoformat(),)).fetchone()
        if not force and row and time.time()-row['generated']<300:
            result=json.loads(row['payload']);result['schedule']=SCHEDULE;return with_delivery(result)
        result=generate(day)
        with connect() as db:
            db.execute('INSERT OR REPLACE INTO briefings VALUES (?,?,?)',(day.isoformat(),result['generated_at'],json.dumps(result)))
            db.execute('DELETE FROM briefings WHERE day < ?',((now.date()-timedelta(days=30)).isoformat(),))
        return with_delivery(result)


def with_delivery(result):
    with connect() as db:
        row=db.execute('SELECT status,attempted FROM deliveries WHERE day=?',(result['date'],)).fetchone()
    result['delivery']=dict(row) if row else None
    return result


def is_due(now):
    return ENABLED and now.weekday()<5 and now.hour==7 and 30<=now.minute<35


def deliver_due(now=None):
    now=now or datetime.now(LOCAL)
    if not is_due(now):return 'disabled_or_outside_window'
    day=now.date().isoformat()
    # Claim before any speech: restarts and uncertain responses never cause a duplicate.
    with connect() as db:
        if db.execute('SELECT day FROM deliveries WHERE day=?',(day,)).fetchone():return 'already_attempted'
        db.execute('INSERT INTO deliveries VALUES (?,?,?)',(day,time.time(),'preparing'))
    status='failed'
    try:
        briefing=get_briefing(day,force=True)
        if not is_due(datetime.now(LOCAL)):
            status='missed_window'
        elif get_bus_status().get('active'):
            status='skipped_for_bus_alert'
        else:
            # Avoid interrupting the higher-priority bus alert. Fixed target and fixed TTS provider.
            speaker=_request('GET','/api/states/media_player.all_speakers')
            if speaker.get('state') in ('playing','buffering','unavailable','unknown'):
                status='speaker_busy_or_unavailable'
            else:
                _request('POST','/api/services/tts/speak',{'entity_id':'tts.google_translate_en_com',
                    'media_player_entity_id':'media_player.all_speakers','message':briefing['speech'],'cache':False})
                status='speech_action_completed'
    except Exception: status='failed_or_unconfirmed'
    with connect() as db:db.execute('UPDATE deliveries SET status=? WHERE day=?',(status,day))
    return status


def start_morning_briefing():
    global _started
    start_school_email_worker()
    if _started or not ENABLED:return
    _started=True
    def loop():
        while True:
            try:deliver_due()
            except Exception:pass
            time.sleep(20)
    threading.Thread(target=loop,name='morning-briefing',daemon=True).start()
