import json
import tempfile
import time
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch, MagicMock
from services import school_email_service as s

class SchoolEmailTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.home=patch.object(s,'HOME',Path(self.temp.name));self.home.start()
    def tearDown(self):self.home.stop();self.temp.cleanup()
    def test_stale_and_wrong_day_omitted(self):
        for day,stamp in [('2026-11-09',time.time()),('2026-11-10',time.time()-22000)]:
            s.save({'date':day,'checked_at':stamp,'items':[{'text':'old'}]})
            self.assertEqual(s.get_school_email(date(2026,11,10))['items'],[])
    def test_sources_evidence_dates_and_private_text(self):
        messages=[{'id':'abc','text':'Bring snacks for rehearsal.','subject':'Rehearsal','sent':'2026-11-09','source':'parentsquare.com'}]
        good={'source_id':'abc','date':'2026-11-10','text':'Bring snacks for rehearsal.','evidence':'Bring snacks for rehearsal.'}
        variants=[dict(good,source_id='fake'),dict(good,date='2026-11-09'),dict(good,evidence='Invented source evidence'),dict(good,text='Read the medical report now.')]
        self.assertEqual(len(s.validate_items([good,good]+variants,messages,date(2026,11,10))),1)
    def test_readonly_peek_and_sender_allowlist(self):
        (s.HOME/'credentials.json').write_text(json.dumps({'username':'test','app_password':'fake'}))
        client=MagicMock();client.__enter__.return_value=client
        client.select.return_value=('OK',[])
        mail=b'From: School <notice@parentsquare.com>\r\nSubject: Bring snacks\r\nDate: Mon, 09 Nov 2026 12:00:00 -0500\r\nContent-Type: text/plain\r\n\r\nBring snacks for rehearsal.'
        client.uid.side_effect=[('OK',[b'1']),('OK',[(b'1 (X-GM-MSGID 123)',mail)])]
        with patch.object(s.imaplib,'IMAP4_SSL',return_value=client):
            messages,_=s.read_mail()
        client.select.assert_called_once_with('INBOX',readonly=True)
        self.assertEqual(client.uid.call_args.args[2],'(X-GM-MSGID BODY.PEEK[]<0.200000>)')
        self.assertEqual(len(messages),1)
        client.store.assert_not_called()
    def test_links_and_addresses_removed(self):
        self.assertEqual(s.clean_text('Visit https://private/link?token=secret or person@example.com'),'Visit [link] or [email]')

if __name__=='__main__':unittest.main()
