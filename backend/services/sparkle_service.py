"""Local Daily Sparkle collection: no model, credentials or network calls."""
from __future__ import annotations
import json
import random
import re
import threading
from datetime import datetime
from zoneinfo import ZoneInfo
from db import get_connection, utc_now_iso
from services.sparkle_collection import SPARKLES

SPARKLE_TODAY_KEY = "dailySparkleToday"
SPARKLE_HISTORY_KEY = "dailySparkleHistory"
SPARKLE_POOL_KEY = "weeklySparklePool"
MAX_HISTORY_ITEMS = 120
_POOL_REFRESH_LOCK = threading.Lock()

def _today_key():
    return datetime.now(ZoneInfo('America/New_York')).date().isoformat()

def _week_key(today):
    value=datetime.fromisoformat(today).isocalendar()
    return f"{value.year}-W{value.week:02d}"

def _clean_sparkle(text):
    return re.sub(r'\s+', ' ', text).strip()

def _normalize_sparkle(text):
    return re.sub(r'[^a-z0-9]+',' ',text.casefold()).strip()

def _history_records(history):
    return [item for item in history if isinstance(item,dict) and item.get('content')]

def _load_json_state(key, default):
    with get_connection() as conn:
        row=conn.execute('SELECT json_value FROM app_state WHERE key=?',(key,)).fetchone()
    if row:
        try:return json.loads(row['json_value'])
        except (ValueError,TypeError):pass
    return default

def refresh_sparkle_pool_if_due(today_key=None, force=False):
    today=today_key or _today_key()
    with _POOL_REFRESH_LOCK:
        with get_connection() as conn:
            conn.execute('BEGIN IMMEDIATE')
            row=conn.execute('SELECT json_value FROM app_state WHERE key=?',(SPARKLE_POOL_KEY,)).fetchone()
            try:pool=json.loads(row['json_value']) if row else {}
            except (ValueError,TypeError):pool={}
            if not force and pool.get('source')=='local' and pool.get('items'):
                return {'success':True,'status':'current','count':len(pool['items']),'source':'local'}
            row=conn.execute('SELECT json_value FROM app_state WHERE key=?',(SPARKLE_HISTORY_KEY,)).fetchone()
            try:history=_history_records(json.loads(row['json_value'])) if row else []
            except (ValueError,TypeError):history=[]
            # Unseen cards first; after exhaustion recycle least-recently-shown first.
            recency={}
            for index,record in enumerate(history):recency.setdefault(_normalize_sparkle(record['content']),index)
            items=[{'content':text,'topic':f'local-{index}','category':category} for index,(category,text) in enumerate(SPARKLES)]
            random.SystemRandom().shuffle(items)
            items.sort(key=lambda item: -recency.get(_normalize_sparkle(item['content']),len(history)+1))
            pool={'source':'local','week':_week_key(today),'generatedAt':utc_now_iso(),'items':items}
            conn.execute('INSERT INTO app_state(key,json_value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET json_value=excluded.json_value,updated_at=excluded.updated_at',
                         (SPARKLE_POOL_KEY,json.dumps(pool),utc_now_iso()))
            return {'success':True,'status':'refreshed','count':len(items),'source':'local'}

def _consume_pool_item(today: str) -> dict | None:
    week = _week_key(today)
    now = utc_now_iso()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        pool_row = conn.execute(
            "SELECT json_value FROM app_state WHERE key = ?",
            (SPARKLE_POOL_KEY,),
        ).fetchone()
        if not pool_row:
            return None
        try:
            pool = json.loads(pool_row["json_value"])
        except json.JSONDecodeError:
            return None
        items = pool.get("items", []) if isinstance(pool, dict) else []
        if pool.get("source") != "local" or not isinstance(items, list) or not items:
            return None

        item = items.pop(0)
        if not isinstance(item, dict) or not item.get("content"):
            return None
        pool["items"] = items

        history_row = conn.execute(
            "SELECT json_value FROM app_state WHERE key = ?",
            (SPARKLE_HISTORY_KEY,),
        ).fetchone()
        try:
            history = json.loads(history_row["json_value"]) if history_row else []
        except json.JSONDecodeError:
            history = []

        record = {
            "date": today,
            "content": _clean_sparkle(str(item["content"])),
            "topic": str(item.get("topic", "weekly-pool")),
            "category": str(item.get("category", "Sparkle")),
            "source": "local",
        }
        prior_records = [
            prior for prior in _history_records(history)
            if _normalize_sparkle(prior["content"]) != _normalize_sparkle(record["content"])
        ]
        next_history = [record, *prior_records][:MAX_HISTORY_ITEMS]

        for key, value in (
            (SPARKLE_POOL_KEY, pool),
            (SPARKLE_TODAY_KEY, record),
            (SPARKLE_HISTORY_KEY, next_history),
        ):
            conn.execute(
                """
                INSERT INTO app_state (key, json_value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    json_value=excluded.json_value,
                    updated_at=excluded.updated_at
                """,
                (key, json.dumps(value, ensure_ascii=False), now),
            )

    return {
        "success": True,
        "status": "pool",
        **record,
        "remaining": len(items),
    }


def get_next_sparkle(today_key=None):
    today=today_key or _today_key()
    for _ in range(2):
        refresh_sparkle_pool_if_due(today)
        item=_consume_pool_item(today)
        if item:return item
    return {'success':False,'status':'empty','error':'Sparkles are temporarily unavailable','date':today}

def get_current_sparkle(today_key=None):
    today=today_key or _today_key()
    saved=_load_json_state(SPARKLE_TODAY_KEY,{})
    if isinstance(saved,dict) and saved.get('source')=='local' and saved.get('date')==today and saved.get('content'):
        return {'success':True,'status':'cached',**saved}
    return get_next_sparkle(today)

def get_or_create_daily_sparkle(force_refresh=False,today_key=None):
    return get_next_sparkle(today_key) if force_refresh else get_current_sparkle(today_key)
