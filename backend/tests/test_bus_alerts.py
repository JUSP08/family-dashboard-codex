import copy
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from services import bus_alert_service as bus


def event():
    return {'time_fired':'2026-11-09T12:44:45+00:00', 'data': {
        'entry_id':bus.IMAP_ENTRY,'sender':'support@myfirstview.com','username':'jlindst@gmail.com',
        'subject':'First View: Distance-Based Notification','initial':True,'uid':'14085',
        'date':'2026-11-09T12:44:41+00:00','text':'HANNAH notification near private stop'}}


def trace():
    return {'run_id':'abc','state':'stopped','script_execution':'finished',
            'timestamp':{'finish':'2026-11-09T12:44:47+00:00'},'trace':{
                'trigger/0':[{'changed_variables':{'trigger':{'event':event()}}}],
                'action/0':[{'result':{'params':{'domain':'tts','service':'speak'}}}]}}


class BusTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.db=patch.object(bus,'DB_PATH',Path(self.temp.name)/'bus.db');self.db.start()
        self.now=bus.stamp('2026-11-09T12:44:50+00:00')
        self.clock=patch.object(bus.time,'time',return_value=self.now);self.clock.start()
    def tearDown(self):
        self.clock.stop();self.db.stop();self.temp.cleanup()
    def test_fresh_morning_and_privacy(self):
        result=bus.parse_email(event())
        self.assertTrue(result['eligible']);self.assertEqual(result['children'],['Hannah'])
        self.assertNotIn('private',str(result));self.assertNotIn('jlindst',str(result))
    def test_reject_other_mail_and_replayed_updates(self):
        for key,value in [('sender','someone@example.com'),('username','other'),('entry_id','other'),('subject','other'),('initial',False)]:
            e=event();e['data'][key]=value;self.assertIsNone(bus.parse_email(e))
    def test_afternoon_stale_weekend_future(self):
        for sent,fired in [('2026-11-09T20:16:32+00:00','2026-11-09T20:16:41+00:00'),
                           ('2026-11-09T12:40:00+00:00','2026-11-09T12:44:45+00:00'),
                           ('2026-11-08T12:44:41+00:00','2026-11-08T12:44:45+00:00'),
                           ('2026-11-09T12:45:41+00:00','2026-11-09T12:44:45+00:00')]:
            e=event();e['data']['date']=sent;e['time_fired']=fired
            self.assertFalse(bus.parse_email(e)['eligible'])
    def test_completed_not_heard(self):
        a=bus.parse_trace(trace());self.assertEqual(a['status'],'submitted');self.assertIn('not verified',a['detail'])
    def test_manual_test_not_arrival(self):
        t=trace();t['trace'].pop('trigger/0');self.assertIsNone(bus.parse_trace(t))
    def test_error_and_condition_classification(self):
        t=trace();t['error']='sensitive server error';a=bus.parse_trace(t)
        self.assertEqual(a['status'],'failed');self.assertNotIn('sensitive',str(a))
        for index,status in [(2,'skipped'),(3,'failed'),(0,'failed')]:
            t=trace();t['script_execution']='failed_conditions';t['trace'].pop('action/0')
            t['trace'][f'condition/{index}']=[{'result':{'result':False}}]
            self.assertEqual(bus.parse_trace(t)['status'],status)
    def test_duplicate_and_restart_persistence(self):
        bus.save_alert(bus.parse_trace(trace()),trace=True);bus.save_alert(bus.parse_email(event()))
        result=bus.get_bus_status();self.assertEqual(len(result['history']),1)
        self.assertEqual(result['history'][0]['status'],'submitted')
    def test_missing_trace_warning_and_banner_expiry(self):
        bus.save_alert(bus.parse_email(event()))
        with patch.object(bus.time,'time',return_value=self.now+80):
            result=bus.get_bus_status();self.assertEqual(result['history'][0]['status'],'unconfirmed')
            self.assertTrue(result['warnings']);self.assertIsNotNone(result['active'])
        with patch.object(bus.time,'time',return_value=self.now+700):
            self.assertIsNone(bus.get_bus_status()['active'])
    def test_monitor_stale_and_offline(self):
        bus.save_health({'checked_at':self.now-70,'connected':True,'warnings':[]})
        self.assertFalse(bus.get_bus_status()['connected']);self.assertTrue(bus.get_bus_status()['warnings'])
    def test_retention(self):
        a=bus.parse_email(event());a['received']=self.now-31*86400;bus.save_alert(a)
        self.assertEqual(bus.get_bus_status()['history'],[])


if __name__=='__main__':unittest.main()
