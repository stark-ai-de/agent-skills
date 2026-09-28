"""Synthetic offline retrieval and CLI boundaries; no real API or holdout data."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import urllib.error

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS as ROOT
sys.path.insert(0, str(ROOT))
import jev_advisor as advisor
from retrieval import CandidateIndex, tokenize




def skill(number, **extra):
    return {'id': 'skill:%03d' % number, 'name': 'skill-%03d' % number,
            'kind': 'skill', 'description': 'Specialized workflow instructions.', **extra}


def tool(provider, number, *, namespace=None, **extra):
    namespace = namespace or provider
    name = 'mcp__%s__%s_operation_%03d' % (namespace, provider, number)
    return {'id': name, 'name': name, 'kind': 'mcp_tool',
            'description': 'Search records. This tool is part of plugin "%s".' % provider, **extra}


def none_response(_):
    return {'answers': {'mode': {'type': 'choice', 'choice': 'NONE'},
                        'primary': {'type': 'choice', 'choice': 'NONE'}}}


class RetrievalBoundaryTests(unittest.TestCase):
    def test_unicode_and_identifier_token_boundaries(self):
        cases = [
            ('mcp__AtlasAPI__listHTTP2Records', ['mcp', 'atlas', 'api', 'list', 'http2', 'records']),
            ('Caf\u00e9 cafe\u0301 \u00c4nderungen A\u0308nderungen',
             ['cafe', 'cafe', 'anderungen', 'anderungen']),
            ('Stra\u00dfe STRASSE \u0130stanbul', ['strasse', 'strasse', 'istanbul']),
            ('\ufb03 \uff21\uff22\uff23 \u2460', ['ffi', 'abc', '1']),
            ('\u03a3\u03c3\u03c2 \u6771\u4eac \u041f\u0440\u0438\u0432\u0435\u0442',
             ['\u03c3\u03c3\u03c3', '\u6771\u4eac', '\u043f\u0440\u0438\u0432\u0435\u0442']),
            ('snake_case-dotted.ID/123\x00end', ['snake', 'case', 'dotted', 'id', '123', 'end']),
            ('\u0301\u0308 _---', []),
        ]
        for value, expected in cases:
            with self.subTest(value=value):
                self.assertEqual(tokenize(value), expected)

    def test_canonical_unicode_forms_have_identical_lexical_data(self):
        composed = [skill(1, name='Caf\u00e9API', description='\u00c4nderungen und Stra\u00dfe')]
        decomposed = [skill(1, name='Cafe\u0301API', description='A\u0308nderungen und Stra\u00dfe')]
        left, right = CandidateIndex(composed), CandidateIndex(decomposed)
        self.assertEqual(left.snapshot(), right.snapshot())
        self.assertEqual(left._scores('cafe anderungen'), right._scores('cafe anderungen'))

    def test_name_and_description_remain_separate_token_fields(self):
        index = CandidateIndex([skill(1, name='getHTTP', description='Server Cafe\u0301')])
        self.assertIn('http', index.postings)
        self.assertIn('server', index.postings)
        self.assertIn('cafe', index.postings)
        self.assertNotIn('httpserver', index.postings)
        self.assertNotIn('pse', index.gram_postings)

    def test_repeated_normalized_words_keep_document_frequency(self):
        catalog = [skill(1, name='x', description='Café café cafe\u0301'),
                   skill(2, name='y', description='cafe records')]
        index = CandidateIndex(catalog)
        for gram in ('^ca', 'caf', 'afe', 'fe$'):
            self.assertEqual(index.gram_postings[gram], [0, 1])
        self.assertEqual(index.gram_postings['rec'], [1])
        # Ngram membership is unique, but BM25 still sees repeated terms.
        self.assertGreater(index._scores('cafe')[0], index._scores('cafe')[1])
        self.assertEqual(index._scores('cafe'), index._scores('Café cafe\u0301 café'))

    def test_successive_queries_and_snapshot_restore_keep_identical_ranking(self):
        catalog = [skill(1, description='Inspect café records'),
                   skill(2, description='Analyze shipment reports'),
                   tool('atlas', 1), tool('boreal', 1)]
        queries = ['Atlas records', 'Boreal shipments',
                   'Café ' * 1500 + 'mcp__boreal__boreal_operation_001',
                   '', 'Atlas records']
        for policy in ('current', 'balanced'):
            index = CandidateIndex(catalog, policy=policy)
            snapshot = index.snapshot()
            restored = CandidateIndex.from_snapshot(catalog, snapshot, policy=policy)
            for query in queries:
                with self.subTest(policy=policy, query_length=len(query)):
                    fresh = CandidateIndex(catalog, policy=policy)
                    self.assertEqual(index._scores(query), fresh._scores(query))
                    self.assertEqual(index.search(query, limit=3), fresh.search(query, limit=3))
                    self.assertEqual(restored.search(query, limit=3), fresh.search(query, limit=3))
            self.assertEqual(index.snapshot(), snapshot)

    def test_all_skills_survive_tool_competition_at_240_budget(self):
        skills = [skill(i) for i in range(132)]
        catalog = skills + [tool('atlas', i) for i in range(600)]
        found = CandidateIndex(catalog).search('atlas search records', limit=240)
        self.assertEqual(len(found), 240)
        self.assertTrue({item['id'] for item in skills} <= {item['id'] for item in found})
        self.assertEqual(len({item['id'] for item in found}), 240)

    def test_more_than_240_skills_is_bounded_and_coverage_is_disclosed(self):
        catalog = [skill(i) for i in range(260)]
        index = CandidateIndex(catalog)
        self.assertEqual(len(index.search('workflow', limit=999)), 240)
        self.assertEqual(len(index.search('workflow', limit=12)), 12)
        result = advisor.advise('workflow', catalog, none_response)
        self.assertEqual((result['eligible_count'], result['candidate_count']), (260, 240))
        self.assertTrue(result['catalog_truncated'])
        self.assertEqual(result['none_scope'], 'retrieved_candidates')

    def test_two_named_providers_receive_fair_capacity(self):
        catalog = ([skill(i) for i in range(132)] +
                   [tool('atlas', i) for i in range(500)] +
                   [tool('boreal', i) for i in range(100)])
        found = CandidateIndex(catalog).search('Search Atlas and Boreal records')
        counts = {provider: sum(item['name'].startswith('mcp__' + provider + '__') for item in found)
                  for provider in ('atlas', 'boreal')}
        self.assertGreater(counts['atlas'], 0)
        self.assertGreater(counts['boreal'], 0)
        self.assertLessEqual(abs(counts['atlas'] - counts['boreal']), 1)
        self.assertEqual(sum(counts.values()), 108)

    def test_provider_fairness_includes_distinct_transports(self):
        catalog = ([skill(i) for i in range(238)] +
                   [tool('atlas', i, namespace='atlas_raw') for i in range(50)] +
                   [tool('atlas', i, namespace='codex_apps') for i in range(2)])
        found = CandidateIndex(catalog).search('Search Atlas records')
        names = [item['name'] for item in found if item['kind'] != 'skill']
        self.assertEqual(len(names), 2)
        self.assertTrue(any(name.startswith('mcp__atlas_raw__') for name in names))
        self.assertTrue(any(name.startswith('mcp__codex_apps__') for name in names))

    def test_disabled_records_are_removed_before_retrieval(self):
        catalog = [skill(1), skill(2, enabled=False), tool('atlas', 1, enabled=False), tool('boreal', 1)]
        found = advisor.offline_candidates('atlas skill-002', catalog)
        self.assertEqual({item['id'] for item in found}, {catalog[0]['id'], catalog[3]['id']})
        result = advisor.advise('atlas skill-002', catalog, none_response)
        self.assertEqual(result['eligible_count'], 2)
        self.assertFalse(result['catalog_truncated'])

    def test_duplicate_ids_are_rejected_without_transport(self):
        duplicate = [skill(1), skill(1, enabled=True)]
        with self.assertRaises(ValueError):
            CandidateIndex(duplicate)
        result = advisor.advise('workflow', duplicate, lambda _: self.fail('unexpected transport'))
        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['error'], 'duplicate_candidate_id')
        self.assertEqual(result['request_count'], 0)

    def test_membership_and_order_are_deterministic(self):
        catalog = [skill(i) for i in range(20)] + [tool('atlas', i) for i in range(260)]
        query = 'Search Atlas records using workflow instructions'
        index = CandidateIndex(catalog)
        first = [item['id'] for item in index.search(query)]
        self.assertEqual(first, [item['id'] for item in index.search(query)])
        self.assertEqual(first, [item['id'] for item in CandidateIndex(list(reversed(catalog))).search(query)])

    def test_cli_offline_does_not_read_key_or_create_side_files(self):
        with tempfile.TemporaryDirectory(prefix='jev-offline-cli-') as temporary:
            fixture = Path(temporary)
            for source in ROOT.glob('*.py'):
                shutil.copyfile(source, fixture / source.name)
            (fixture / 'catalog.json').write_text(json.dumps([skill(1)]), encoding='utf-8')
            (fixture / 'query.txt').write_text('Find workflow instructions', encoding='utf-8')
            missing_key = fixture / 'key-must-not-be-read'
            before = {path.relative_to(fixture) for path in fixture.rglob('*')}
            environment = dict(os.environ)
            environment.pop('TYPESAFE_API_KEY', None)
            # Deliberately omit -B: the CLI itself must suppress local bytecode writes.
            process = subprocess.run([sys.executable, str(fixture / 'jev_advisor.py'),
                                      '--catalog', str(fixture / 'catalog.json'),
                                      '--query-file', str(fixture / 'query.txt'),
                                      '--key-file', str(missing_key), '--offline-candidates',
                                      '--output', str(fixture / 'result.json')], cwd=fixture,
                                     env=environment, capture_output=True, text=True, timeout=10)
            self.assertEqual(process.returncode, 0, process.stderr)
            result = json.loads(process.stdout)
            self.assertEqual(result['status'], 'candidates')
            self.assertEqual(result['candidate_ids'], ['skill:001'])
            self.assertEqual(result['request_count'], 0)
            self.assertEqual((result['eligible_count'], result['candidate_count'], result['catalog_truncated']), (1, 1, False))
            self.assertEqual(result, json.loads((fixture / 'result.json').read_text(encoding='utf-8')))
            self.assertFalse(missing_key.exists())
            after = {path.relative_to(fixture) for path in fixture.rglob('*')}
            self.assertEqual(after - before, {Path('result.json')})

    def test_malformed_choice_types_fail_closed(self):
        choices = [None, 4, ['c000'], {'type': 'text', 'choice': 'c000'},
                   {'type': 'choice', 'choice': 0}, {'type': 'choice'}]
        for primary in choices:
            with self.subTest(primary=primary):
                response = {'answers': {'mode': {'type': 'choice', 'choice': 'SINGLE'}, 'primary': primary}}
                result = advisor.advise('workflow', [skill(1)], lambda _, response=response: response)
                self.assertEqual(result['status'], 'error')
                self.assertEqual(result['selected'], [])
                self.assertEqual(result['request_count'], 1)
                self.assertIn(result['error'], {'malformed_choice', 'unknown_choice'})

    def assert_http_failure_is_bounded(self, status):
        calls = []
        failure = urllib.error.HTTPError(advisor.ENDPOINT, status, 'private server message', {}, None)
        def transport(payload):
            calls.append(payload)
            raise failure
        try:
            result = advisor.advise('workflow', [skill(1)], transport)
        finally:
            failure.close()
        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['error'], 'http_' + str(status))
        self.assertEqual(result['request_count'], 1)
        self.assertEqual(len(calls), 1)
        self.assertEqual(result['selected'], [])
        self.assertEqual(result['requests'][0]['error'], 'http_' + str(status))
        self.assertNotIn('private server message', json.dumps(result))

    def test_http_401_records_error_without_retry(self):
        self.assert_http_failure_is_bounded(401)

    def test_http_429_records_error_without_retry(self):
        self.assert_http_failure_is_bounded(429)


if __name__ == '__main__':
    unittest.main()
