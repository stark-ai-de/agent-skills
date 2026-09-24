"""Observable next-skill contract tests. Synthetic fixtures; networking forbidden."""
import copy
from contextlib import redirect_stderr, redirect_stdout
import io
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import jev_advisor as advisor
import jev_session as session


def skill(identifier='skill:review', name='review', **extra):
    return dict(id=identifier, name=name, kind='skill',
                description='Review the supplied code change.', **extra)


def frame(catalog=None, **extra):
    return dict(id='fixture-1', query='Review the supplied code change.',
                catalog=catalog if catalog is not None else [skill()], **extra)


def answer(payload, value=None, **extra):
    assert len(payload['questions']) == 1, 'next_skill must ask one choice question'
    key, question = next(iter(payload['questions'].items()))
    if value is None:
        value = next(code for code in question['criteria'] if code not in ('NONE', 'CLARIFY'))
    return {'answers': {key: {'type': 'choice', 'choice': value}},
            'usage': {'input_tokens': 37, 'output_tokens': 1}, **extra}


class Recorder:
    def __init__(self, choice=None, reply=None):
        self.choice, self.reply, self.calls, self.closed = choice, reply, [], False
    def __call__(self, payload, **kwargs):
        self.calls.append(copy.deepcopy(payload))
        return copy.deepcopy(self.reply) if self.reply is not None else answer(payload, self.choice)
    def close(self):
        self.closed = True


class NextSkillContractTests(unittest.TestCase):
    def setUp(self):
        self.addCleanup(patch.stopall)
        patch.object(socket, 'socket', side_effect=AssertionError('network forbidden')).start()
        temporary = tempfile.TemporaryDirectory(prefix='jev-next-contract-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
    def advise(self, query='Review this change.', catalog=None, transport=None, **options):
        return advisor.advise(query, [skill()] if catalog is None else catalog,
                              Recorder() if transport is None else transport,
                              selection_profile='next_skill', **options)
    def assert_next_scope(self, result):
        self.assertEqual(result.get('selection_profile'), 'next_skill')
        self.assertEqual(result.get('additional_work'), 'unassessed')
    def assert_no_ids(self, result):
        self.assertEqual(result.get('selected'), [])
        self.assertEqual(result.get('provisional_selected', []), [])

    def test_one_primary_call_is_not_a_complete_compound_plan(self):
        catalog = [skill(), skill('skill:diagram', 'diagram')]
        transport = Recorder()
        result = self.advise('Review this diff and independently draw the supplied process.', catalog, transport)
        self.assertEqual((result['status'], result['mode']), ('next_skill', 'NEXT_SKILL'))
        self.assertEqual(len(result['selected']), 1)
        self.assertIn(result['selected'][0], {item['id'] for item in catalog})
        self.assertEqual((result['request_count'], len(transport.calls)), (1, 1))
        self.assertEqual(len(transport.calls[0]['questions']), 1)
        self.assertEqual(result['usage_total']['input_tokens'], 37)
        self.assert_next_scope(result)

    def test_none_and_clarify_remain_distinct_one_call_outcomes(self):
        for sentinel in ('NONE', 'CLARIFY'):
            with self.subTest(sentinel=sentinel):
                transport = Recorder(sentinel)
                result = self.advise(transport=transport)
                self.assertEqual((result['status'], result['mode']), (sentinel.lower(), sentinel))
                self.assert_no_ids(result)
                self.assertEqual((result['request_count'], len(transport.calls)), (1, 1))
                self.assert_next_scope(result)

    def test_empty_and_disabled_catalogs_require_no_provider(self):
        for catalog in ([], [skill(enabled=False)]):
            with self.subTest(catalog=catalog):
                transport = Recorder()
                result = self.advise(catalog=catalog, transport=transport)
                self.assertEqual((result['status'], result['request_count']), ('none', 0))
                self.assert_no_ids(result)
                self.assertEqual(transport.calls, [])
                self.assert_next_scope(result)

    def test_enabled_tool_is_rejected_before_key_or_client_creation(self):
        catalog = [skill(), dict(id='tool:read', name='read', kind='tool', description='Read a value.')]
        load = unittest.mock.Mock(side_effect=AssertionError('must not read a key'))
        factory = unittest.mock.Mock(side_effect=AssertionError('must not create a client'))
        with session.AdvisorSession(selection_profile='next_skill', key_loader=load, client_factory=factory) as owner:
            result = owner.recommend(frame(catalog))
        self.assertEqual(result['status'], 'error')
        self.assert_no_ids(result)
        self.assertEqual(result['request_count'], 0)
        load.assert_not_called(); factory.assert_not_called()
        self.assert_next_scope(result)

    def test_disabled_tool_does_not_invalidate_skill_only_profile(self):
        transport = Recorder()
        catalog = [skill(), dict(id='tool:disabled', name='DISABLED_UNAVAILABLE_TOOL', kind='tool',
                                 description='Disabled tool.', enabled=False)]
        result = self.advise(catalog=catalog, transport=transport)
        self.assertEqual((result['status'], result['selected']), ('next_skill', ['skill:review']))
        self.assertNotIn('DISABLED_UNAVAILABLE_TOOL', json.dumps(transport.calls))

    def test_invalid_profile_is_local_error_and_never_calls_provider(self):
        for value in ('', 'fastest', None, True, 1, ['next_skill']):
            with self.subTest(profile=value):
                transport = Recorder()
                result = advisor.advise('Review this change.', [skill()], transport, selection_profile=value)
                self.assertEqual(result['status'], 'error')
                self.assert_no_ids(result)
                self.assertEqual(transport.calls, [])
                with self.assertRaises((ValueError, TypeError)):
                    session.AdvisorSession(selection_profile=value)

    def test_invalid_and_duplicate_catalog_ids_fail_without_dispatch(self):
        for catalog in ([skill(), skill()], [dict(id='invalid', kind='unknown', name='bad', description='Bad.')]):
            with self.subTest(catalog=catalog):
                transport = Recorder()
                result = self.advise(catalog=catalog, transport=transport)
                self.assertEqual(result['status'], 'error')
                self.assert_no_ids(result)
                self.assertEqual(transport.calls, [])

    def test_untrusted_choice_ids_and_multiselections_never_escape(self):
        for value in ('invented', 'skill:review', 'STOP', ['c000', 'c000'], ['c000', 'c001'], 0, None, True):
            with self.subTest(choice=value):
                def transport(payload):
                    key = next(iter(payload['questions']))
                    return {'answers': {key: {'type': 'choice', 'choice': value}}}
                result = self.advise(transport=transport)
                self.assertEqual(result['status'], 'error')
                self.assert_no_ids(result)
                self.assertEqual(result['request_count'], 1)

    def test_nonfinite_provider_data_is_an_error_not_a_recommendation(self):
        for value in (float('nan'), float('inf'), -float('inf')):
            with self.subTest(value=value):
                def transport(payload):
                    return answer(payload, usage={'input_tokens': value})
                result = self.advise(transport=transport)
                self.assertEqual(result['status'], 'error')
                self.assert_no_ids(result)

    def test_metadata_restrictions_survive_request_and_summary(self):
        catalog = [skill(explicit_only=True, use_when=['explicit change review'],
                         avoid_when=['deployment execution'], keywords=['review'],
                         source_paths=['/synthetic/private/review/SKILL.md'])]
        transport = Recorder()
        result = self.advise('Use review to examine this supplied diff.', catalog, transport)
        summary = advisor.summarize(result, catalog)
        wire = json.dumps(transport.calls)
        self.assertIn('explicit_only', wire)
        self.assertIn('deployment execution', wire)
        self.assertNotIn('/synthetic/private', wire)
        card = summary['selected_capabilities'][0]
        self.assertTrue(card['explicit_only'])
        self.assertEqual(card['avoid_when'], ['deployment execution'])
        self.assert_next_scope(summary)

    def test_profile_scoped_cache_cannot_cross_in_either_direction(self):
        options = dict(cache_dir=self.root / 'cache', cache_scope='synthetic-owner')
        next_transport = Recorder()
        cold_next = self.advise(transport=next_transport, **options)
        def general_transport(payload):
            return {'answers': {'mode': {'type': 'choice', 'choice': 'SINGLE'},
                                'primary': {'type': 'choice', 'choice': 'c000'}}}
        cold_general = advisor.advise('Review this change.', [skill()], general_transport, **options)
        self.assertNotEqual(cold_next['cache']['key'], cold_general['cache']['key'])
        self.assertEqual(cold_general['request_count'], 1)
        self.assertEqual(cold_general['status'], 'selected')
        warm_next = self.advise(transport=next_transport, **options)
        self.assertEqual((warm_next['cache']['status'], warm_next['request_count']), ('hit', 0))
        self.assertEqual(warm_next['status'], 'next_skill')
        self.assert_next_scope(warm_next)
        with patch.object(advisor, 'make_transport', side_effect=AssertionError('network forbidden')):
            warm_general = advisor.advise('Review this change.', [skill()], general_transport, **options)
        self.assertEqual((warm_general['cache']['status'], warm_general['request_count']), ('hit', 0))
        self.assertNotIn('selection_profile', warm_general)

    def test_forged_general_decision_under_next_key_is_not_accepted(self):
        options = dict(cache_dir=self.root / 'cache', cache_scope='synthetic-owner')
        transport = Recorder()
        first = self.advise(transport=transport, **options)
        path = next(options['cache_dir'].glob('jev-*.json'))
        record = json.loads(path.read_text())
        record['decision'].update(status='selected', mode='SINGLE', stopped_reason='planned_selection_complete')
        record['decision'].pop('selection_profile', None)
        record['decision'].pop('additional_work', None)
        record['digest'] = advisor.digest(record['decision'])
        path.write_text(json.dumps(record))
        second = self.advise(transport=transport, **options)
        self.assertNotEqual(second['cache']['status'], 'hit')
        self.assertEqual(second['request_count'], 1)
        self.assertEqual(second['status'], 'next_skill')
        self.assertEqual(len(transport.calls), 2)

    def test_current_disabled_catalog_invalidates_previous_next_decision(self):
        options = dict(cache_dir=self.root / 'cache', cache_scope='synthetic-owner')
        transport = Recorder()
        self.advise(transport=transport, **options)
        result = self.advise(catalog=[skill(enabled=False)], transport=transport, **options)
        self.assertEqual(result['status'], 'none')
        self.assert_no_ids(result)
        self.assertEqual(len(transport.calls), 1)

    def test_model_errors_never_populate_next_decision_cache(self):
        options = dict(cache_dir=self.root / 'cache', cache_scope='synthetic-owner')
        transport = Recorder('unknown')
        for _ in range(2):
            result = self.advise(transport=transport, **options)
            self.assertEqual(result['status'], 'error')
            self.assert_no_ids(result)
        self.assertEqual(len(transport.calls), 2)
        self.assertEqual(list(options['cache_dir'].glob('jev-*.json')), [])

    def test_session_one_choice_profile_is_explicit_and_inventory_is_fresh(self):
        transport = Recorder()
        load = unittest.mock.Mock(return_value='synthetic-key-not-real')
        with session.AdvisorSession(selection_profile='next_skill', key_loader=load,
                                    client_factory=lambda *a, **k: transport) as owner:
            first = owner.recommend(frame())
            second = owner.recommend(frame([skill('skill:new', 'new')]))
        self.assertEqual(first['selected'], ['skill:review'])
        self.assertEqual(second['selected'], ['skill:new'])
        self.assertEqual((first['transport_call_count'], second['transport_call_count']), (1, 1))
        self.assert_next_scope(first); self.assert_next_scope(second)
        self.assertEqual(load.call_count, 1)
        self.assertTrue(transport.closed)

    def test_ndjson_rejects_duplicate_nonfinite_and_profile_override_then_recovers(self):
        transport = Recorder()
        owner = session.AdvisorSession(selection_profile='next_skill', key_loader=lambda: 'synthetic',
                                       client_factory=lambda *a, **k: transport)
        rows = [b'{"id":"x","id":"y","query":"q","catalog":[]}',
                b'{"id":"x","query":"q","catalog":[NaN]}',
                json.dumps(frame(selection_profile='general')).encode(), json.dumps(frame()).encode()]
        output = io.BytesIO()
        session.serve(io.BytesIO(b'\n'.join(rows) + b'\n'), output, owner)
        replies = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(len(replies), 4)
        for result in replies[:3]:
            self.assertEqual(result['status'], 'error'); self.assert_no_ids(result)
            self.assert_next_scope(result)
        self.assertEqual(replies[-1]['status'], 'next_skill')
        self.assert_next_scope(replies[-1])
        self.assertEqual(len(transport.calls), 1)

    def test_cli_summary_full_receipt_and_cache_hit_preserve_profile(self):
        catalog_path = self.root / 'catalog.json'; catalog_path.write_text(json.dumps([skill()]))
        receipt_path = self.root / 'receipt.json'
        argv = ['--catalog', str(catalog_path), '--query', 'Review this change.', '--selection-profile', 'next_skill',
                '--summary', '--output', str(receipt_path), '--cache-dir', str(self.root / 'cache'),
                '--cache-scope', 'synthetic-owner', '--key-file', str(self.root / 'key')]
        (self.root / 'key').write_text('synthetic-not-a-real-key')
        transport = Recorder()
        with patch.object(advisor, 'make_transport', return_value=transport), redirect_stdout(io.StringIO()) as stdout:
            code = advisor.main(argv)
        self.assertEqual(code, 0)
        summary = json.loads(stdout.getvalue()); full = json.loads(receipt_path.read_text())
        self.assert_next_scope(summary); self.assert_next_scope(full)
        self.assertEqual(summary['status'], 'next_skill')
        (self.root / 'key').unlink()
        with patch.object(advisor, 'make_transport', side_effect=AssertionError('must not create client')), redirect_stdout(io.StringIO()) as stdout:
            code = advisor.main(argv)
        self.assertEqual(code, 0)
        warm = json.loads(stdout.getvalue())
        self.assertEqual((warm['cache']['status'], warm['request_count']), ('hit', 0))
        self.assert_next_scope(warm)

    def test_cli_rejects_invalid_profile_before_reading_missing_files(self):
        for module, argv in ((advisor, ['--catalog', str(self.root / 'missing'), '--query', 'q']), (session, [])):
            with self.subTest(module=module.__name__), redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
                module.main([*argv, '--selection-profile', 'unknown'])
            self.assertEqual(error.exception.code, 2)

    def test_extra_provider_question_is_not_silently_ignored(self):
        def transport(payload):
            result = answer(payload)
            result['answers']['mode'] = {'type': 'choice', 'choice': 'PAIR'}
            return result
        result = self.advise(transport=transport)
        self.assertEqual(result['status'], 'error')
        self.assert_no_ids(result)
        self.assertEqual(result['request_count'], 1)

    def test_session_rejects_forged_multi_or_unavailable_next_ids(self):
        raw = self.advise()
        for identifiers in (['skill:review', 'skill:review'], ['skill:missing'], ['skill:review', 'skill:other']):
            with self.subTest(identifiers=identifiers):
                forged = copy.deepcopy(raw); forged['selected'] = identifiers
                calls = []
                key_calls = []
                def inject(*args, **kwargs):
                    calls.append((args, kwargs))
                    return forged
                def key_loader():
                    key_calls.append(True)
                    return 'unused-test-key'
                with session.AdvisorSession(selection_profile='next_skill', advisor=inject,
                        key_loader=key_loader) as owner:
                    result = owner.recommend(frame())
                self.assertEqual(len(calls), 1)
                self.assertEqual(calls[0][1]['selection_profile'], 'next_skill')
                self.assertEqual(key_calls, [])
                self.assertEqual(result['status'], 'error')
                self.assertEqual(result['error'], 'advisor_invalid_reply')
                self.assert_no_ids(result)
                self.assert_next_scope(result)

    def test_truncated_next_none_does_not_claim_complete_catalog_search(self):
        catalog = [skill('skill:item-%03d' % i, 'item-%03d' % i) for i in range(241)]
        transport = Recorder('NONE')
        result = self.advise(catalog=catalog, transport=transport)
        self.assertEqual(result['status'], 'none')
        self.assertTrue(result['catalog_truncated'])
        self.assertEqual((result['candidate_count'], result['eligible_count']), (240, 241))
        self.assertEqual(result['none_scope'], 'retrieved_candidates')
        self.assert_next_scope(result)

    def test_none_and_clarify_cache_hits_keep_next_profile(self):
        for sentinel in ('NONE', 'CLARIFY'):
            with self.subTest(sentinel=sentinel):
                transport = Recorder(sentinel)
                options = dict(cache_dir=self.root / sentinel, cache_scope='synthetic-owner')
                self.advise(transport=transport, **options)
                warm = self.advise(transport=transport, **options)
                self.assertEqual((warm['cache']['status'], warm['status'], warm['request_count']),
                                 ('hit', sentinel.lower(), 0))
                self.assert_no_ids(warm); self.assert_next_scope(warm)

    def test_http_failure_is_one_error_without_retry_or_successful_none(self):
        calls = []
        def transport(payload):
            calls.append(payload)
            raise urllib.error.HTTPError('https://invalid.example/synthetic', 402, 'synthetic', {}, None)
        result = self.advise(transport=transport)
        self.assertEqual((result['status'], result['error'], result['request_count']), ('error', 'http_402', 1))
        self.assertEqual(len(calls), 1)
        self.assert_no_ids(result); self.assert_next_scope(result)

    def test_default_general_request_and_replay_match_frozen_baseline(self):
        # Separate interpreter avoids module-cache contamination between source trees.
        script = r'''
import json,sys
sys.dont_write_bytecode=True
sys.path.insert(0,sys.argv[1])
import jev_advisor as a
fixture=json.loads(sys.argv[2]);calls=[];replies=iter(fixture['replies'])
def transport(payload):
 calls.append(payload);return next(replies)
r=a.advise(fixture['query'],fixture['catalog'],transport)
fields=('status','mode','selected','provisional_selected','error','stopped_reason','request_count','candidate_count','eligible_count','represented_count','catalog_truncated','none_scope')
print(json.dumps({'calls':calls,'outcome':{k:r.get(k) for k in fields}},sort_keys=True))
'''
        def choice(**choices):
            return {'answers': {key: {'type': 'choice', 'choice': value} for key, value in choices.items()}}
        fixtures = [
            dict(query='Review this change.', catalog=[skill()], replies=[choice(mode='SINGLE', primary='c000')]),
            dict(query='Translate hello.', catalog=[skill()], replies=[choice(mode='NONE', primary='NONE')]),
            dict(query='Review and read independently.', catalog=[skill(), dict(id='tool:read', name='read', kind='tool', description='Read values.')], replies=[choice(mode='PAIR', primary='c000'), choice(next='c000')]),
            dict(query='Review and read independently.', catalog=[skill(), dict(id='tool:read', name='read', kind='tool', description='Read values.')], replies=[choice(mode='PAIR', primary='c000'), choice(next='STOP')]),
        ]
        # Frozen baseline outputs: request bytes, cardinality and failure outcomes.
        expected = ['7bd85a05f432d46d371989a80f65a551d653dd931992b11f17b11bed1b6f2f7a', 'a14171d8c009138e7d6b6d97e78c3ff38350e1e68188dac53d441910036d4096', 'b78209dec4b7a4514b747ce87ffc21dee3bb8e296ab9d3cf62367da66ffa49a5', '80b1c07f9dd5b961275184a91fec988b59129f063469c897f872780f48189c29']
        for fixture, digest in zip(fixtures, expected):
            with self.subTest(query=fixture['query'], replies=fixture['replies']):
                run = subprocess.run([sys.executable, '-B', '-c', script, str(SCRIPTS), json.dumps(fixture)],
                                     capture_output=True, text=True, timeout=15, check=True)
                self.assertEqual(hashlib.sha256(run.stdout.encode()).hexdigest(), digest)



if __name__ == '__main__':
    unittest.main()
