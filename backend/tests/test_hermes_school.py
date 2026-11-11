import unittest
from datetime import date
from services import hermes_school_service as h

class HermesSchoolTests(unittest.TestCase):
    def item(self,**changes):
        return dict({'title':'BMS Musical rehearsal','date':'2026-11-12','startTime':'15:00','endTime':'18:00','kind':'event','cancelled':False,'source_id':'abc','source_received':'2026-11-10T12:00:00-05:00','url':'https://mail.google.com/mail/u/0/#all/abc'},**changes)
    def test_idempotent_and_updates_owned(self):
        events,changes,_=h.reconcile([],[self.item()]);self.assertEqual(len(changes),1)
        again,changes,_=h.reconcile(events,[self.item()]);self.assertEqual(changes,[])
        newer=self.item(startTime='16:00',source_received='2026-11-11T12:00:00-05:00')
        updated,changes,_=h.reconcile(again,[newer]);self.assertEqual(updated[0]['id'],events[0]['id']);self.assertEqual(changes[0]['action'],'updated')
    def test_manual_events_and_manual_edits_preserved(self):
        manual={'id':'manual','title':'BMS Musical rehearsal','date':'2026-11-12'}
        events,changes,review=h.reconcile([manual],[self.item()]);self.assertEqual(events,[manual]);self.assertFalse(changes);self.assertTrue(review)
        events,_,_=h.reconcile([],[self.item()]);events[0]['startTime']='14:00'
        result,changes,review=h.reconcile(events,[self.item()]);self.assertEqual(result,events);self.assertFalse(changes);self.assertTrue(review)
    def test_connected_calendar_duplicates_and_cancellations(self):
        external=[{'title':'BMS Musical rehearsal','date':'2026-11-12'}]
        self.assertEqual(h.reconcile([],[self.item()],external)[0],[])
        self.assertTrue(h.reconcile([],[self.item(cancelled=True)],external)[2])
    def test_validation_requires_source_and_valid_time(self):
        message={'id':'abc','text':'Rehearsal November 12 from 3 to 6 PM.','sent':'2026-11-10T12:00:00-05:00','subject':'Rehearsal','source':'parentsquare.com'}
        good={**self.item(),'evidence':message['text']}
        valid,rejected=h.validate({'items':[good,{**good,'source_id':'wrong'},{**good,'startTime':'25:00'}]},[message],date(2026,11,10))
        self.assertEqual(len(valid),1);self.assertEqual(rejected,2)
    def test_aliases_and_school_closures_deduplicate(self):
        self.assertTrue(h.similar('Hannah: U15 soccer practice','U15 Bethel Girls soccer practice'))
        self.assertTrue(h.similar('Veterans Day - No School','Bethel schools closed'))
        self.assertFalse(h.similar('U15 soccer practice','U10 soccer practice'))
    def test_optional_preseason_stays_a_reminder(self):
        message={'id':'abc','text':'Wrestling preseason November 12 at 2:30 PM.','sent':'2026-11-10T12:00:00-05:00','subject':'School digest','source':'parentsquare.com'}
        good={**self.item(title='BHS Wrestling preseason'),'evidence':message['text']}
        items,_=h.validate({'items':[good]},[message],date(2026,11,10))
        self.assertEqual(items[0]['kind'],'reminder');self.assertTrue(items[0]['title'].startswith('If participating:'))
    def test_cached_weekend_closures_do_not_reappear(self):
        item=self.item(title='Rockwell School closed - Holiday Recess',date='2026-12-26',startTime='',endTime='')
        event={'id':'hermes-test','hermesOwner':'school-email',**{k:item[k] for k in ('title','date','startTime','endTime')}}
        event['hermesSnapshot']=h.digest(h.event_view(event))
        events,changes,_=h.reconcile([event],[item])
        self.assertEqual(events,[]);self.assertEqual(len(changes),1)
        self.assertEqual(h.reconcile(events,[item])[1],[])
    def test_sports_preseason_is_event_and_tentative_retained(self):
        message={'id':'abc','text':'Preseason November 12 from 2:30 to 4 PM.','sent':'2026-11-10T12:00:00-05:00','subject':'Invitation','source':'sportsyou.com'}
        item={**self.item(title='BHS Wrestling preseason'),'evidence':message['text'],'tentative':True}
        accepted,_=h.validate({'items':[item]},[message],date(2026,11,10))
        self.assertEqual(accepted[0]['kind'],'event');self.assertTrue(accepted[0]['title'].startswith('TENTATIVE'))
    def test_silent_model_omission_becomes_review(self):
        message={'id':'abc','text':'Team update','sent':'2026-11-10','subject':'News','source':'sportsyou.com'}
        result=h.outcomes_for({'items':[]},[message],[])
        self.assertEqual(result['abc']['status'],'needs_review')
    def test_moved_notice_blocks_old_commitment(self):
        message={'id':'abc','text':'Date/Time: Wed Nov 11, 2026 2:30pm - 4:00pm','sent':'2026-11-10T12:00:00-05:00','subject':"Moved has been updated on BHS Wrestling's calendar",'source':'sportsyou.com'}
        result=h.outcomes_for({'items':[]},[message],[])
        item=self.item(title='BHS Wrestling Preseason',date='2026-11-11',source_received='2026-11-09T12:00:00-05:00')
        self.assertEqual(h.suppress_ambiguous_moves([item],result),[])

if __name__=='__main__':unittest.main()
