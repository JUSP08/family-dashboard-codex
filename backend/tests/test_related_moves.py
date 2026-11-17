import unittest
from services import hermes_school_service as h


class RelatedMoveTests(unittest.TestCase):
    def test_reconciliation_preserves_user_added_recurrence_and_location(self):
        item={'title':'BHS rehearsal','date':'2026-11-12','startTime':'14:00','endTime':'15:00',
              'kind':'event','cancelled':False,'source_received':'2026-11-10T10:00:00-05:00','url':'source'}
        existing,_,_=h.reconcile([],[item])
        for addition in [{'recurrence':'weekly'},{'location':'Gym'}]:
            original=[dict(existing[0],**addition)]
            result,changes,review=h.reconcile(original,[dict(item,endTime='17:00',source_received='2026-11-11T10:00:00-05:00')])
            self.assertEqual(result,original);self.assertEqual(changes,[]);self.assertTrue(review)

    def test_review_resolution_requires_unchanged_item_and_calendar(self):
        item={'title':'Music rehearsal','date':'2026-11-18','startTime':'15:00','endTime':'18:00','source_id':'email'}
        target=dict(item,title='BMS Music rehearsal')
        review={'item':item,'reason':'overlap'}
        resolutions={h.digest(item):{'target_fingerprint':h.digest(h.event_view(target))}}
        self.assertEqual(h.unresolved_calendar_reviews([review],resolutions,[target]),[])
        self.assertEqual(h.unresolved_calendar_reviews([review],resolutions,[]),[review])
        self.assertEqual(h.unresolved_calendar_reviews([review],resolutions,[dict(target,endTime='20:00')]),[review])
        changed={'item':dict(item,date='2026-11-19'),'reason':'overlap'}
        self.assertEqual(h.unresolved_calendar_reviews([changed],resolutions,[target]),[changed])

    def test_repeated_sessions_have_distinct_ids_and_survive(self):
        base={'title':'BHS Music rehearsal','date':'2026-11-12','startTime':'14:00','endTime':'15:00','kind':'event','cancelled':False,'source_id':'x','source_received':'2026-11-10T10:00:00-05:00','url':'source'}
        items=[base,dict(base,startTime='16:00',endTime='17:00'),dict(base,date='2026-11-19')]
        events,_,_=h.reconcile([],items)
        self.assertEqual(len(events),3);self.assertEqual(len({e['id'] for e in events}),3)
        self.assertEqual(h.reconcile(events,items)[1],[])

    def test_equal_timestamp_duplicate_is_cleaned(self):
        item={'title':'BHS Music rehearsal','date':'2026-11-12','startTime':'14:00','endTime':'15:00','kind':'event','cancelled':False,'source_id':'x','source_received':'2026-11-10T10:00:00-05:00','url':'source'}
        events,_,_=h.reconcile([],[item]);events.append(dict(events[0],id='other-copy'))
        cleaned,_,_=h.reconcile(events,[item]);self.assertEqual(len(cleaned),1)

    def fixture(self):
        base={'source':'sportsyou.com','sent':'2026-11-10T09:15:00-05:00'}
        messages=[dict(base,id='post',subject='Joshua Levine posted in BHS Wrestling',text='Preseason will move to Thursday at 2:30pm\n\nNo school Wednesday'),
                  dict(base,id='invite',subject='An event has been added to BHS Wrestling',text='Event:\nPreseason\nDate/Time:\nThu Nov 12, 2026 2:30pm - 4:00pm Eastern Time')]
        items=[{'source_id':'invite','kind':'event','title':'BHS Wrestling preseason','date':'2026-11-12','startTime':'14:30','endTime':'16:00'}]
        outcomes={'move':{'status':'needs_review','team':'BHS Wrestling','blocked_date':'2026-11-11','received':base['sent']}}
        return messages,items,outcomes

    def test_explicit_statement_and_invitation_resolve(self):
        m,i,o=self.fixture();h.resolve_related_moves(m,i,o)
        self.assertEqual(o['move']['status'],'superseded')
        self.assertEqual(o['move']['resolved_source_ids'],['post','invite'])
        self.assertEqual(o['move']['replacement_date'],'2026-11-12')
        self.assertEqual(h.suppress_ambiguous_moves([dict(i[0],date='2026-11-11',source_received=m[0]['sent'])],o),[])

    def test_missing_conflicting_or_unrelated_evidence_stays_review(self):
        for case in ['missing_post','missing_invite','other_team','wrong_time','conflict','truncated','old_post','not_published','cancelled']:
            with self.subTest(case=case):
                m,i,o=self.fixture()
                if case=='missing_post':m=m[1:]
                if case=='missing_invite':m=m[:1]
                if case=='other_team':m[0]['subject']='Coach posted in Other Wrestling'
                if case=='wrong_time':m[0]['text']=m[0]['text'].replace('2:30pm','3:30pm')
                if case=='conflict':m.append(dict(m[0],id='conflict',text='Preseason will move to Friday at 2:30pm'))
                if case=='truncated':m[0]['review_required']=True
                if case=='old_post':m[0]['sent']='2026-11-03T09:15:00-05:00'
                if case=='not_published':i=[]
                if case=='cancelled':i[0]['cancelled']=True
                h.resolve_related_moves(m,i,o)
                self.assertEqual(o['move']['status'],'needs_review')

    def test_safe_to_repeat(self):
        m,i,o=self.fixture();h.resolve_related_moves(m,i,o)
        before=h.digest(o);h.resolve_related_moves(m,i,o)
        self.assertEqual(before,h.digest(o))

    def test_moved_slot_removed_only_after_replacement_is_present(self):
        m,i,o=self.fixture();h.resolve_related_moves(m,i,o)
        old={**h.event_view(i[0]),'date':'2026-11-11','id':'old',
             'hermesOwner':'school-email','hermesReceived':m[0]['sent']}
        old['hermesSnapshot']=h.digest(h.event_view(old))
        self.assertEqual(h.remove_confirmed_moved_slots([old],o),([old],[]))
        replacement={**h.event_view(i[0]),'id':'new'}
        events,changes=h.remove_confirmed_moved_slots([old,replacement],o)
        self.assertEqual(events,[replacement]);self.assertEqual(len(changes),1)
        self.assertEqual(h.remove_confirmed_moved_slots(events,o),(events,[]))

    def test_move_cleanup_preserves_edited_recurring_and_ambiguous_slots(self):
        m,i,o=self.fixture();h.resolve_related_moves(m,i,o)
        old={**h.event_view(i[0]),'date':'2026-11-11','id':'old',
             'hermesOwner':'school-email','hermesReceived':m[0]['sent']}
        old['hermesSnapshot']=h.digest(h.event_view(old))
        replacement={**h.event_view(i[0]),'id':'new'}
        for changed in [dict(old,hermesOwner='manual'),dict(old,endTime='17:00'),
                        dict(old,recurrence='weekly'),dict(old,location='Gym')]:
            with self.subTest(changed=changed):
                events=[changed,replacement]
                self.assertEqual(h.remove_confirmed_moved_slots(events,o),(events,[]))
        events=[old,dict(old,id='second'),replacement]
        self.assertEqual(h.remove_confirmed_moved_slots(events,o),(events,[]))

    def test_move_cleanup_rejects_cancelled_or_different_replacement(self):
        m,i,o=self.fixture();h.resolve_related_moves(m,i,o)
        old={**h.event_view(i[0]),'date':'2026-11-11','id':'old',
             'hermesOwner':'school-email','hermesReceived':m[0]['sent']}
        old['hermesSnapshot']=h.digest(h.event_view(old))
        for replacement in [dict(i[0],endTime='17:00'),dict(i[0],title='CANCELED - '+i[0]['title'])]:
            events=[old,replacement]
            self.assertEqual(h.remove_confirmed_moved_slots(events,o),(events,[]))
