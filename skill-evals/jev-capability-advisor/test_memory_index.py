"""Focused semantic/lifecycle checks only; no provider calls or timing loops."""
import copy
import json
import socket
import sys
import unittest
from unittest.mock import patch
sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS as ROOT
sys.path.insert(0, str(ROOT))
import index_cache
import jev_advisor as advisor
import jev_session as session
import retrieval


def catalog():
    return [{'id':'a','name':'alpha','kind':'skill','description':'Review Python changes and correctness.',
             'enabled':True,'explicit_only':False,'source_paths':['local/alpha/SKILL.md'],
             'keywords':['python','review'],'avoid_when':['do not deploy']},
            {'id':'b','name':'beta','kind':'tool','description':'Inspect deployment logs and traces.',
             'parameter_descriptions':{'service':'Deployment service identifier'}}]


def prepare(query,items,memo=None,policy='current'):
    chosen,metadata=advisor._prepare_candidates(query,items,memory_index=memo,retrieval_policy=policy)
    payload,mapping=advisor.build_request(query,chosen)
    return chosen,metadata,payload,mapping


class Tests(unittest.TestCase):
    def setUp(self):
        self.network=patch.object(socket,'socket',side_effect=AssertionError('network forbidden'))
        self.network.start();self.addCleanup(self.network.stop)

    def test_hit_preserves_fresh_objects_order_payload_and_no_side_effects(self):
        memo=index_cache.MemoryIndex();old=catalog()
        _,first,_,_=prepare('Review Python changes.',old,memo)
        fresh=copy.deepcopy(old)
        with patch.object(retrieval.CandidateIndex,'_build_lexical',side_effect=AssertionError('unexpected rebuild')), \
             patch.object(index_cache.IndexCache,'load',side_effect=AssertionError('disk forbidden')), \
             patch.object(index_cache.IndexCache,'store',side_effect=AssertionError('disk forbidden')):
            chosen,meta,payload,mapping=prepare('Inspect deployment logs.',fresh,memo)
        expected=prepare('Inspect deployment logs.',fresh)
        self.assertEqual(first['index_cache']['status'],'miss')
        self.assertEqual(meta['index_cache']['status'],'hit')
        self.assertEqual((payload,mapping),(expected[2],expected[3]))
        self.assertTrue(all(item is next(x for x in fresh if x['id']==item['id']) for item in chosen))
        self.assertLessEqual(meta['index_cache']['retained_bytes'],index_cache.MAX_MEMORY_INDEX_BYTES)

    def test_mutated_prior_input_and_returned_records_cannot_poison_equal_new_input(self):
        memo=index_cache.MemoryIndex();old=catalog();fresh=copy.deepcopy(old)
        chosen,_,_,_=prepare('Review Python changes.',old,memo)
        old[0]['name']='poisoned name';old[0]['keywords'].append('poisoned hint')
        chosen[0]['description']='poisoned description'
        new=prepare('Review Python changes.',fresh,memo);expected=prepare('Review Python changes.',fresh)
        self.assertEqual(new[1]['index_cache']['status'],'hit')
        self.assertEqual(new[2:],expected[2:])
        self.assertNotIn('poisoned',json.dumps(new[2]))

    def test_full_metadata_order_policy_and_source_identity_invalidate(self):
        alterations=(lambda c:c[0].update(explicit_only=True),lambda c:c[0].update(enabled=False),
                     lambda c:c[0].update(source_paths=['different/local/source']),
                     lambda c:c[0].update(content_sha256='a'*64),
                     lambda c:c[0].update(avoid_when=['different negative condition']),
                     lambda c:c[1]['parameter_descriptions'].update(service='Different parameter'),
                     lambda c:c.reverse())
        for change in alterations:
            with self.subTest(change=change):
                memo=index_cache.MemoryIndex();base=catalog();prepare('Review Python changes.',base,memo)
                current=copy.deepcopy(base);change(current)
                fresh=prepare('Review Python changes.',current,memo)
                self.assertEqual(fresh[1]['index_cache']['status'],'miss')
                self.assertEqual(fresh[2:],prepare('Review Python changes.',current)[2:])
        memo=index_cache.MemoryIndex();prepare('Inspect logs.',catalog(),memo)
        self.assertEqual(prepare('Inspect logs.',catalog(),memo,'balanced')[1]['index_cache']['status'],'miss')
        with patch.object(index_cache,'SCHEMA',index_cache.SCHEMA+1):
            self.assertEqual(prepare('Inspect logs.',catalog(),memo,'balanced')[1]['index_cache']['status'],'miss')

    def test_query_specific_alias_representatives_and_both_aliases(self):
        common={'kind':'skill','description':'Review Python changes.', 'skill_identity':'alpha','bundle_sha256':'a'*64}
        items=[dict(common,id='user-alpha',name='alpha'),dict(common,id='plugin-alpha',name='plugin:alpha')]
        memo=index_cache.MemoryIndex()
        for query,expected in [('Review Python changes.',{'user-alpha'}),
                               ('Use plugin:alpha to review.',{'plugin-alpha'}),
                               ('Use user-alpha and plugin-alpha separately.',{'user-alpha','plugin-alpha'})]:
            actual=prepare(query,copy.deepcopy(items),memo);fresh=prepare(query,copy.deepcopy(items))
            self.assertEqual(actual[1]['index_cache']['status'],'miss')
            self.assertEqual(set(actual[3].values()),expected)
            self.assertEqual(actual[2:],fresh[2:])

    def test_one_entry_replacement_and_empty_clear(self):
        memo=index_cache.MemoryIndex();first=catalog();second=catalog();second[0]['description']='Different'
        prepare('Review Python.',first,memo);prepare('Review Python.',second,memo)
        self.assertEqual(prepare('Review Python.',first,memo)[1]['index_cache']['status'],'miss')
        empty=prepare('No capability.',[],memo)
        self.assertEqual(empty[1]['index_cache']['status'],'empty');self.assertIsNone(memo._index)
        self.assertEqual(prepare('Review Python.',first,memo)[1]['index_cache']['status'],'miss')

    def test_retention_limits_bypass_without_changing_fresh_results(self):
        for cap in ('MAX_MEMORY_CATALOG_BYTES','MAX_MEMORY_INDEX_BYTES'):
            memo=index_cache.MemoryIndex();items=catalog();expected=prepare('Inspect logs.',items)
            with patch.object(index_cache,cap,1):actual=prepare('Inspect logs.',items,memo)
            self.assertEqual(actual[1]['index_cache']['status'],'bypass')
            self.assertEqual(actual[2:],expected[2:]);self.assertIsNone(memo._index)

    def test_key_failure_falls_back_without_persistent_state(self):
        memo=index_cache.MemoryIndex();prepare('Review Python.',catalog(),memo)
        with patch.object(index_cache,'cache_key',side_effect=OSError('unavailable')):
            actual=prepare('Inspect logs.',catalog(),memo)
        self.assertEqual(actual[1]['index_cache']['status'],'unavailable')
        self.assertEqual(actual[2:],prepare('Inspect logs.',catalog())[2:]);self.assertIsNone(memo._index)

    def test_no_queries_decisions_credentials_or_restrictions_in_private_index_cards(self):
        memo=index_cache.MemoryIndex();prepare('unique sensitive synthetic query',catalog(),memo)
        indexed=memo._index.catalog
        self.assertTrue(all(set(card)<=set(index_cache._LEXICAL_FIELDS) for card in indexed))
        self.assertNotIn('unique sensitive',repr(memo.__dict__))
        self.assertNotIn('source_paths',json.dumps(indexed));self.assertNotIn('explicit_only',json.dumps(indexed))
        self.assertNotIn('enabled',json.dumps(indexed));self.assertNotIn('avoid_when',json.dumps(indexed))

    def fixture_session(self,**kwargs):
        receipts=[];clients=[];original=advisor.advise
        def capture(*args,**values):
            result=original(*args,**values);receipts.append(result);return result
        self.enterContext(patch.object(advisor,'advise',side_effect=capture))
        class Client:
            def __init__(self,credential,timeout_seconds):self.calls=0;self.closed=False;clients.append(self)
            def __call__(self,payload,*,timeout_seconds=None):
                self.calls+=1
                return {'answers':{'mode':{'type':'choice','choice':'NONE'},'primary':{'type':'choice','choice':'NONE'}}}
            def close(self):self.closed=True
        owner=session.AdvisorSession(key_loader=lambda:'synthetic-unused',client_factory=Client,**kwargs)
        self.addCleanup(owner.close)
        return owner,receipts,clients

    def test_default_session_reuses_index_but_every_task_calls_model_and_fresh_validates(self):
        owner,receipts,clients=self.fixture_session()
        for count in (1,2):
            reply=owner.recommend({'id':str(count),'query':'Review Python changes.','catalog':catalog()})
            self.assertEqual(reply['status'],'none')
        self.assertEqual([r['index_cache']['status'] for r in receipts],['miss','hit'])
        self.assertEqual(len(clients),1);self.assertEqual(clients[0].calls,2)
        bad=catalog();bad[0]['enabled']='yes'
        self.assertEqual(owner.recommend({'id':'bad','query':'Review.','catalog':bad})['error'],'invalid_catalog')
        self.assertIsNone(owner._memory_index._index);self.assertEqual(clients[0].calls,2)
        owner.recommend({'id':'3','query':'Review.','catalog':catalog()})
        self.assertEqual(receipts[-1]['index_cache']['status'],'miss')
        owner.reset_transport();self.assertIsNone(owner._memory_index._index)
        owner.recommend({'id':'4','query':'Review.','catalog':catalog()})
        owner.close();self.assertIsNone(owner._memory_index._index)
        self.assertTrue(all(c.closed for c in clients))

    def test_disabled_ablation_and_custom_three_argument_advisor(self):
        owner,receipts,clients=self.fixture_session(reuse_index=False)
        for i in (1,2):owner.recommend({'id':str(i),'query':'Review.','catalog':catalog()})
        self.assertTrue(all(r['index_cache']['status']=='disabled' for r in receipts))
        self.assertIsNone(owner._memory_index);self.assertEqual(clients[0].calls,2)
        def custom(query,items,transport):return advisor.advise(query,items,transport)
        custom_owner=session.AdvisorSession(advisor=custom,key_loader=lambda:'synthetic-unused',client_factory=type(clients[0]))
        self.addCleanup(custom_owner.close)
        self.assertIsNone(custom_owner._memory_index)
        self.assertEqual(custom_owner.recommend({'id':'custom','query':'Review.','catalog':catalog()})['status'],'none')

    def test_empty_disabled_catalogs_and_cancellation_clear_without_retaining_old_state(self):
        owner,receipts,clients=self.fixture_session()
        disabled=[dict(item,enabled=False) for item in catalog()]
        for label,revoked in [('empty',[]),('disabled',disabled)]:
            owner.recommend({'id':label+'-warm','query':'Review.','catalog':catalog()})
            calls=sum(client.calls for client in clients)
            reply=owner.recommend({'id':label,'query':'Review.','catalog':revoked})
            self.assertEqual(reply['status'],'none');self.assertIsNone(owner._memory_index._index)
            self.assertEqual(reply['request_count'],0)
            self.assertEqual(sum(client.calls for client in clients),calls)
        owner.recommend({'id':'3','query':'Review.','catalog':catalog()})
        with patch.object(advisor,'advise',side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):owner.recommend({'id':'4','query':'Review.','catalog':catalog()})
        self.assertTrue(owner._closed);self.assertIsNone(owner._memory_index._index)
        self.assertTrue(all(c.closed for c in clients))

    def test_sessions_have_independent_entries(self):
        first=index_cache.MemoryIndex();second=index_cache.MemoryIndex()
        prepare('Review.',catalog(),first);prepare('Review.',catalog(),second)
        self.assertIsNot(first._index,second._index)
        first.clear();self.assertIsNotNone(second._index)


if __name__=='__main__':unittest.main(verbosity=2)
