import json
import sqlite3
import tempfile
import unittest
from datetime import datetime,date
from pathlib import Path
from unittest.mock import patch
from services import morning_briefing_service as m


class BriefingTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.db=patch.object(m,'DB_PATH',Path(self.temp.name)/'briefing.db');self.db.start()
    def tearDown(self):self.db.stop();self.temp.cleanup()
    def test_database_connection_closes_after_use(self):
        with m.connect() as connection:
            connection.execute('SELECT 1')
        with self.assertRaises(sqlite3.ProgrammingError):
            connection.execute('SELECT 1')
    def test_disabled_schedule_never_sends(self):
        with patch.object(m,'ENABLED',False),patch.object(m,'_request') as request:
            self.assertEqual(m.deliver_due(datetime(2026,11,10,7,30,tzinfo=m.LOCAL)),'disabled_or_outside_window')
            request.assert_not_called()
    def test_future_sparkle_preview_does_not_advance_home_card(self):
        with patch.object(m,'get_current_sparkle') as current:
            result=m.sparkle_for(date(2026,11,10),datetime(2026,11,9,20,tzinfo=m.LOCAL))
            self.assertTrue(result['pending']);current.assert_not_called()
    def test_today_sparkle_uses_current_card_and_handles_failure(self):
        now=datetime(2026,11,10,7,30,tzinfo=m.LOCAL)
        with patch.object(m,'get_current_sparkle',return_value={'success':True,'source':'local','content':'Local card.'}) as current:
            result=m.sparkle_for(now.date(),now)
            self.assertEqual(result['speech'],"Today's Sparkle: Local card.")
            current.assert_called_once_with(today_key='2026-11-10')
        with patch.object(m,'get_current_sparkle',side_effect=RuntimeError):
            self.assertFalse(m.sparkle_for(now.date(),now)['available'])
    def test_sparkle_included_even_when_long_briefing_shortened(self):
        with patch.object(m,'weather_for',return_value={'summary':'Weather.'}),patch.object(m,'calendar_for',return_value=([{'title':'Long event '*400,'sources':['Family'],'all_day':True}],[],[])),patch.object(m,'get_bus_status',return_value={'connected':True,'warnings':[],'checked_at':1}),patch.object(m,'sparkle_for',return_value={'speech':"Today's Sparkle: Local card."}),patch.object(m,'get_school_email',return_value={'items':[]}):
            result=m.generate(date(2026,11,10))
            self.assertIn("Today's Sparkle: Local card.",result['speech'])
            self.assertLess(len(result['speech']),2800)
    def test_weekdays_and_late_restart(self):
        with patch.object(m,'ENABLED',True):
            for stamp,expected in [('2026-11-10T07:30:00',True),('2026-11-10T07:34:59',True),('2026-11-10T07:35:00',False),('2026-11-14T07:30:00',False),('2026-11-10T08:00:00',False)]:
                self.assertEqual(m.is_due(datetime.fromisoformat(stamp).replace(tzinfo=m.LOCAL)),expected)
    def test_next_weekday_and_dst(self):
        self.assertEqual(m.next_weekday(datetime(2026,11,6,20,tzinfo=m.LOCAL)),date(2026,11,9))
        self.assertEqual(m.next_weekday(datetime(2026,11,9,7,29,tzinfo=m.LOCAL)),date(2026,11,9))
        self.assertEqual(m.next_weekday(datetime(2026,3,6,20,tzinfo=m.LOCAL)),date(2026,3,9))
    def test_preview_is_read_only_and_no_empty_calendar_claim(self):
        with patch.object(m,'weather_for',return_value={'available':False,'summary':'Weather unavailable.'}),patch.object(m,'calendar_for',return_value=([],['Family could not be checked.'],['Family'])),patch.object(m,'get_bus_status',return_value={'connected':False,'warnings':['Bus offline.'],'checked_at':None}),patch.object(m,'_request') as request:
            result=m.generate(date(2026,11,10))
            self.assertIn('incomplete',result['speech']);self.assertNotIn('No other events',result['speech'])
            self.assertIn('Bus offline',result['speech']);request.assert_not_called()
    def test_school_reminders_and_timed_events(self):
        events=[{'title':'Bring costume','sources':['BMS Calendar'],'all_day':True,'start':None},
                {'title':'CANCELED soccer','sources':['Family'],'all_day':False,'start':'2026-11-10T18:45:00-05:00'}]
        with patch.object(m,'weather_for',return_value={'summary':'Forecast.'}),patch.object(m,'calendar_for',return_value=(events,[],['Family','BMS Calendar'])),patch.object(m,'get_bus_status',return_value={'connected':True,'warnings':[],'checked_at':1}):
            result=m.generate(date(2026,11,10));self.assertEqual(len(result['school_reminders']),1)
            self.assertIn('6:45 PM',result['speech']);self.assertIn('CANCELED',result['speech'])
    def test_bus_alert_takes_priority(self):
        with patch.object(m,'is_due',return_value=True),patch.object(m,'get_briefing',return_value={'speech':'Test'}),patch.object(m,'get_bus_status',return_value={'active':{'key':'bus'}}),patch.object(m,'_request') as request:
            self.assertEqual(m.deliver_due(),'skipped_for_bus_alert');request.assert_not_called()
    def test_once_only_and_fixed_target(self):
        with patch.object(m,'is_due',return_value=True),patch.object(m,'get_briefing',return_value={'speech':'Test'}),patch.object(m,'get_bus_status',return_value={'active':None}),patch.object(m,'_request',side_effect=[{'state':'off'},[]]) as request:
            self.assertEqual(m.deliver_due(),'speech_action_completed');self.assertEqual(m.deliver_due(),'already_attempted')
            self.assertEqual(request.call_args.args[2]['media_player_entity_id'],'media_player.all_speakers')
            self.assertEqual(request.call_count,2)
    def test_busy_speakers_not_interrupted(self):
        with patch.object(m,'is_due',return_value=True),patch.object(m,'get_briefing',return_value={'speech':'Test'}),patch.object(m,'get_bus_status',return_value={'active':None}),patch.object(m,'_request',return_value={'state':'playing'}) as request:
            self.assertEqual(m.deliver_due(),'speaker_busy_or_unavailable');self.assertEqual(request.call_count,1)
    def test_weather_nulls_do_not_become_zero(self):
        class Response:
            def raise_for_status(self):pass
            def json(self):return {'daily':{'time':['2026-11-10'],'temperature_2m_max':[None],'temperature_2m_min':[2],'precipitation_probability_max':[None]}}
        with patch.object(m.requests,'get',return_value=Response()):self.assertFalse(m.weather_for(date(2026,11,10))['available'])


if __name__=='__main__':unittest.main()
