import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from services import sparkle_service as s
from services.sparkle_collection import SPARKLES

class LocalSparkleTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.path=Path(self.tmp.name)/'state.db'
        with self.connect() as db:
            db.execute('CREATE TABLE app_state (key TEXT PRIMARY KEY,json_value TEXT,updated_at TEXT)')
        self.mock=patch.object(s,'get_connection',self.connect);self.mock.start()
    def tearDown(self):self.mock.stop();self.tmp.cleanup()
    def connect(self):
        db=sqlite3.connect(self.path);db.row_factory=sqlite3.Row;return db
    def test_no_network_and_collection_quality(self):
        self.assertFalse(hasattr(s,'requests'))
        self.assertEqual(len(SPARKLES),len({text for _,text in SPARKLES}))
        self.assertTrue(all(len(text.split())<=30 for _,text in SPARKLES))
    def test_daily_cache_and_next(self):
        first=s.get_current_sparkle('2026-11-09')
        self.assertEqual(s.get_current_sparkle('2026-11-09')['content'],first['content'])
        self.assertNotEqual(s.get_next_sparkle('2026-11-09')['content'],first['content'])
    def test_full_cycle_and_automatic_refill(self):
        cards=[s.get_next_sparkle('2026-11-09')['content'] for _ in SPARKLES]
        self.assertEqual(len(set(cards)),len(SPARKLES))
        self.assertEqual(s.get_next_sparkle('2026-11-09')['content'],cards[0])
    def test_legacy_pool_migrates_and_unrelated_state_survives(self):
        with self.connect() as db:
            for key,value in [(s.SPARKLE_POOL_KEY,{'week':'2026-W43','items':[{'content':'Old generated card'}]}),('family',{'keep':True})]:
                db.execute('INSERT INTO app_state VALUES (?,?,?)',(key,json.dumps(value),'old'))
        card=s.get_current_sparkle('2026-11-09')
        self.assertEqual(card['source'],'local');self.assertNotEqual(card['content'],'Old generated card')
        self.assertEqual(s._load_json_state('family',{}),{'keep':True})
    def test_week_change_does_not_discard_unused_cards(self):
        s.get_next_sparkle('2026-11-09')
        remaining=s.refresh_sparkle_pool_if_due('2026-11-16')
        self.assertEqual(remaining['count'],len(SPARKLES)-1)
        self.assertTrue(s.get_current_sparkle('2026-11-16')['success'])

if __name__=='__main__':unittest.main()
