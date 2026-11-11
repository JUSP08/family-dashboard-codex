"""Read-only Gmail feed. Mail is untrusted data; extraction has no tools/actions."""
import email
import html
import imaplib
import json
import os
import re
import threading
import time
from datetime import datetime, timedelta
from email import policy
from email.utils import parseaddr, parsedate_to_datetime
from pathlib import Path
from zoneinfo import ZoneInfo


LOCAL = ZoneInfo('America/New_York')
PRIVATE = re.compile(r'attendance report|grade report|report card|disciplin|medical|diagnos|student.{0,25}distress|hallway closure|\bIEP\b|\b504\b', re.I)
HOME = Path.home() / '.config/family-dashboard-school-email'
DOMAINS = {'parentsquare.com', 'bethel.k12.ct.us', 'sportsyou.com'}
_started = False


def clean_text(text):
    text = html.unescape(text)
    text = re.sub(r'https?://\S+', '[link]', text)
    text = re.sub(r'\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b', '[email]', text)
    return re.sub(r'[ \t]+', ' ', text).strip()


def read_mail():
    credentials = json.loads((HOME / 'credentials.json').read_text())
    messages = []
    with imaplib.IMAP4_SSL('imap.gmail.com', 993, timeout=25) as client:
        client.login(credentials['username'], credentials['app_password'])
        if client.select('"[Gmail]/All Mail"', readonly=True)[0] != 'OK':
            raise RuntimeError('Gmail All Mail unavailable')
        status, data = client.uid('search', None, 'X-GM-RAW', '"newer_than:14d {from:parentsquare.com from:bethel.k12.ct.us from:sportsyou.com} -in:spam -in:trash"')
        if status != 'OK': raise RuntimeError('Search unavailable')
        ids = data[0].split()
        for uid in ids:
            status, parts = client.uid('fetch', uid, '(X-GM-MSGID BODY.PEEK[]<0.200000>)')
            if status != 'OK': raise RuntimeError('Message unavailable')
            for part in parts:
                if not isinstance(part, tuple): continue
                match = re.search(rb'X-GM-MSGID (\d+)', part[0])
                if not match: continue
                msg = email.message_from_bytes(part[1], policy=policy.default)
                domain = parseaddr(str(msg.get('From', '')))[1].rsplit('@', 1)[-1].lower()
                subject = str(msg.get('Subject', ''))
                if domain not in DOMAINS or PRIVATE.search(subject): continue
                body = msg.get_body(preferencelist=('plain',))
                if body is None: continue  # Attachments and login-only content are not read.
                text = clean_text(body.get_content())
                # Remove private digest sections before extracting reminders.
                sections = re.split(r'(?m)(?=^\s*\d+\.\s)', text)
                text = '\n'.join(s for s in sections if not PRIVATE.search(s))
                if not text or PRIVATE.search(text): continue
                try: sent = parsedate_to_datetime(str(msg['Date'])).astimezone(LOCAL).isoformat()
                except (ValueError, TypeError): continue
                messages.append({'id':format(int(match[1]), 'x'), 'source':domain,
                                 'sent':sent, 'subject':clean_text(subject), 'text':text[:14000]})
    return messages, False


def validate_items(items, messages, day):
    sources = {m['id']:m for m in messages}
    valid = []; seen = set()
    if not isinstance(items, list): raise ValueError('Invalid reminders')
    for item in items[:30]:
        if not isinstance(item, dict): continue
        source = sources.get(item.get('source_id'))
        text = item.get('text', ''); evidence = item.get('evidence', '')
        if not source or not isinstance(text,str) or not 10 <= len(text) <= 260: continue
        if not isinstance(evidence,str) or len(evidence) < 15 or evidence not in source['text'] and evidence != source['subject']: continue
        if PRIVATE.search(text) or re.search(r'https?://|@|[<>]', text): continue
        try: when = datetime.strptime(item['date'], '%Y-%m-%d').date()
        except (ValueError, KeyError, TypeError): continue
        if not day <= when <= day + timedelta(days=7): continue
        key = re.sub(r'\W+', '', text.lower())
        if key in seen: continue
        seen.add(key)
        valid.append({'text':text, 'date':when.isoformat(), 'source':source['source'],
                      'source_subject':source['subject'], 'source_received':source['sent'],
                      'url':'https://mail.google.com/mail/u/0/#all/'+source['id'],
                      'evidence':evidence[:500]})
    return sorted(valid, key=lambda i:i['date'])[:12]


MONTHS = {name.lower(): index for index, name in enumerate(
    ['January','February','March','April','May','June','July','August','September','October','November','December'], 1)}
DATE = re.compile(r'\b('+'|'.join(MONTHS)+r')\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b',re.I)
ACTION = re.compile(r'\b(deadline|due|registration|register|reminder|bring|wear|pack|rehearsal|practice|game|meeting|assembly|no school|closed|early dismissal|lost and found|must be claimed)\b',re.I)


def extract_local(messages, day):
    candidates = []
    # Newest first so repeated notices use the latest source link.
    for message in sorted(messages,key=lambda m:m['sent'],reverse=True):
        sent = datetime.fromisoformat(message['sent']).date()
        # Do not interpret long prose, relative dates, signatures or quoted replies.
        body = re.split(r'(?im)^On .+wrote:|^From:|^Sent:',message['text'])[0]
        for raw in [message['subject']] + body.splitlines():
            line = re.sub(r'^\s*\d+\.\s*', '', raw).strip(' *#_-\t')
            line = re.sub(r'\s*\[link\]\s*', ' ', line).strip()
            if not 15 <= len(line) <= 200 or not ACTION.search(line): continue
            if PRIVATE.search(line) or re.search(r'\[email\]|[<>@]|https?://|\b(ignore|assistant|password|sign in|log in)\b',line,re.I): continue
            matches = list(DATE.finditer(line))
            if len(matches) != 1: continue
            match = matches[0]
            # Ambiguous date ranges/lists are not interpreted as a single-day event.
            if re.match(r'\s*(?:[-–/&]|and\b|,\s*\d)',line[match.end():],re.I): continue
            month = MONTHS[match[1].lower()]
            year = int(match[3]) if match[3] else sent.year + (1 if month==1 and sent.month==12 else 0)
            try: when = datetime(year,month,int(match[2])).date()
            except ValueError: continue
            if not day <= when <= day+timedelta(days=7): continue
            deadline = bool(re.search(r'deadline|\bdue\b|must be claimed',line,re.I))
            # Events are spoken only on their date; deadlines may be announced in advance.
            if when != day and not deadline: continue
            text = ('If this applies to your family: ' if re.search(r'registr|club',line,re.I) else 'School notice: ') + line.rstrip('.') + '.'
            evidence = raw if raw in message['text'] else message['subject']
            candidates.append({'source_id':message['id'],'date':when.isoformat(),'text':text,'evidence':evidence})
    return validate_items(candidates,messages,day)


def refresh(day):
    messages, truncated = read_mail()
    # All extraction is local. No model, AI service, or third-party API is called.
    items = extract_local(messages,day)
    result = {'date':day.isoformat(),'checked_at':time.time(),'items':items,
              'processing':'server-only','messages_checked':len(messages),
              'warning':'Only the latest 60 matching emails were checked.' if truncated else None}
    save(result)
    return result


def save(result):
    HOME.mkdir(mode=0o700, parents=True, exist_ok=True)
    temp = HOME/'feed.tmp'
    fd = os.open(temp, os.O_WRONLY|os.O_CREAT|os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as output: json.dump(result, output)
    os.replace(temp, HOME/'feed.json')


def get_school_email(day):
    try:
        result = json.loads((HOME/'feed.json').read_text())
        if result['date'] != day.isoformat() or time.time()-result['checked_at'] > 6*3600:
            raise ValueError('Stale feed')
        return result
    except (OSError, ValueError, KeyError):
        return {'items':[], 'checked_at':None, 'warning':'School email reminders are unavailable or out of date. Check your inbox.'}


def start_school_email_worker():
    global _started
    if _started or os.getenv('SCHOOL_EMAIL_OWNER')=='hermes' or not (HOME/'credentials.json').exists(): return
    _started = True
    def loop():
        while True:
            now = datetime.now(LOCAL)
            day = now.date() + timedelta(days=1 if now.hour>=12 else 0)
            while day.weekday()>=5: day += timedelta(days=1)
            try: refresh(day)
            except Exception:
                # Never log credentials, raw mail or provider response bodies.
                save({'date':day.isoformat(),'checked_at':time.time(),'items':[],
                      'warning':'School email refresh failed. Check your inbox; email reminders were omitted.'})
            time.sleep(900)  # Includes a fresh check within 15 minutes before 7:30.
    threading.Thread(target=loop,name='school-email-reader',daemon=True).start()
