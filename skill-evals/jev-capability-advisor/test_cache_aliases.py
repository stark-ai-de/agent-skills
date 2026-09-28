"""Observable cache, identity and confidence boundaries; synthetic data only."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import jev_advisor as advisor
import decision_cache


def skill(identifier='review', name='review', **extra):
    return {'id': identifier, 'name': name, 'kind': 'skill',
            'description': 'Review a supplied change.', **extra}


def response(mode='SINGLE', primary='c000'):
    return {'answers': {'mode': {'type': 'choice', 'choice': mode},
                        'primary': {'type': 'choice', 'choice': primary}},
            'usage': {'input_tokens': 19, 'output_tokens': 2}}


class Transport:
    def __init__(self, value=None):
        self.value = value if value is not None else response()
        self.calls = []

    def __call__(self, payload):
        self.calls.append(payload)
        return copy.deepcopy(self.value)


class CacheTestSupport(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='jev-cache-test-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.options = {'cache_dir': self.root / 'decisions', 'cache_scope': 'synthetic-host-one'}
        self.catalog = [skill()]
        self.transport = Transport()

    def advise(self, query='Review this change', catalog=None, transport=None, **options):
        return advisor.advise(query, self.catalog if catalog is None else catalog,
                              self.transport if transport is None else transport, **(self.options | options))


@unittest.skipUnless(all(hasattr(os, name) for name in ('getuid', 'O_NOFOLLOW', 'O_NONBLOCK')),
                     'private decision cache requires POSIX filesystem primitives')
class CacheTests(CacheTestSupport):
    def test_cold_and_warm_separate_network_usage_and_origin(self):
        cold = self.advise()
        warm = self.advise()
        self.assertEqual(cold['cache']['write_status'], 'stored')
        self.assertEqual(warm['cache']['status'], 'hit')
        self.assertEqual((warm['status'], warm['selected']), ('selected', ['review']))
        self.assertEqual((warm['request_count'], warm['requests'], warm['usage'], warm['usage_total']), (0, [], [], {}))
        self.assertEqual(len(self.transport.calls), 1)
        self.assertEqual(warm['cache']['source_receipt_digest'], cold['receipt_digest'])
        record_path = next(self.options['cache_dir'].glob('jev-*.json'))
        record = record_path.read_text()
        self.assertNotIn('Review this change', record)
        self.assertNotIn('available_capabilities', record)
        self.assertEqual(record_path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.options['cache_dir'].stat().st_mode & 0o777, 0o700)

    def test_full_query_suffix_and_scope_invalidate(self):
        prefix = 'review ' * 110
        first = self.advise(prefix + 'public API')
        different = self.advise(prefix + 'private implementation')
        scoped = self.advise(prefix + 'public API', cache_scope='another-host')
        self.assertEqual(len(self.transport.calls), 3)
        self.assertEqual(len({r['cache']['key'] for r in (first, different, scoped)}), 3)

    def test_current_catalog_changes_invalidate_even_hidden_metadata(self):
        self.advise()
        variants = [{'description': 'Review changed runtime behavior.'}, {'brief': 'Code review.'},
                    {'explicit_only': True}, {'id': 'replacement'}, {'name': 'renamed'},
                    {'source_paths': ['/synthetic/revised/SKILL.md']}, {'host_policy': 'revised'},
                    {'bundle_sha256': 'a' * 64}, {'skill_identity': 'review'}]
        for change in variants:
            with self.subTest(change=change):
                result = self.advise(catalog=[self.catalog[0] | change])
                self.assertNotEqual(result['cache']['status'], 'hit')
                self.assertEqual(result['request_count'], 1)
        disabled = self.advise(catalog=[self.catalog[0] | {'enabled': False}])
        self.assertEqual((disabled['status'], disabled['selected'], disabled['request_count']), ('none', [], 0))

    def test_catalog_reorder_keeps_hit_and_alias_change_invalidates(self):
        proof = {'skill_identity': 'review', 'bundle_sha256': 'c' * 64}
        catalog = [skill(**proof), skill('plugin-review', 'plugin:review', **proof)]
        self.advise(catalog=catalog)
        warm = self.advise(catalog=list(reversed(catalog)))
        self.assertEqual(warm['cache']['status'], 'hit')
        changed = self.advise(catalog=catalog[:1])
        self.assertNotEqual(changed['cache']['status'], 'hit')

    def test_model_rules_and_transport_namespace_invalidate(self):
        self.advise()
        with patch.object(advisor, 'MODEL', 'synthetic-other-model'):
            self.assertEqual(self.advise()['request_count'], 1)
        with patch.object(advisor, 'RULES', advisor.RULES + 'Changed policy.'):
            self.assertEqual(self.advise()['request_count'], 1)
        self.transport.transport_kind = 'https'
        self.assertEqual(self.advise()['request_count'], 1)

    def test_none_and_initial_clarify_can_cache_without_becoming_selected(self):
        for mode in ('NONE', 'CLARIFY'):
            with self.subTest(mode=mode):
                transport = Transport(response(mode, mode))
                cold = self.advise(mode, transport=transport)
                warm = self.advise(mode, transport=transport)
                self.assertEqual((cold['status'], warm['status']), (mode.lower(), mode.lower()))
                self.assertEqual((warm['selected'], warm['request_count']), ([], 0))
                self.assertEqual(len(transport.calls), 1)

    def test_expired_and_clock_reversed_records_miss(self):
        with patch.object(decision_cache.time, 'time', return_value=10000):
            self.advise()
        with patch.object(decision_cache.time, 'time', return_value=10061):
            expired = self.advise(cache_ttl_seconds=60)
        self.assertEqual((expired['cache']['status'], expired['request_count']), ('expired', 1))
        with patch.object(decision_cache.time, 'time', return_value=9999):
            reversed_clock = self.advise()
        self.assertEqual(reversed_clock['cache']['status'], 'expired')

    def test_corrupt_unknown_and_oversized_records_safely_miss(self):
        self.advise()
        path = next(self.options['cache_dir'].glob('jev-*.json'))
        for data in ('{broken', '[' * 2000 + '0' + ']' * 2000, 'x' * (decision_cache.MAX_BYTES + 1)):
            path.write_text(data)
            self.assertEqual(self.advise()['cache']['status'], 'invalid')
        record = json.loads(path.read_text())
        record['decision']['selected'] = ['invented-id']
        record['digest'] = advisor.digest(record['decision'])
        path.write_text(json.dumps(record))
        result = self.advise()
        self.assertEqual((result['cache']['status'], result['selected']), ('invalid', ['review']))

    def test_extreme_json_timestamp_falls_back_to_a_fresh_recommendation(self):
        self.advise()
        path = next(self.options['cache_dir'].glob('jev-*.json'))
        record = json.loads(path.read_text())
        record['created_at'] = 10 ** 400
        path.write_text(json.dumps(record))
        self.transport.calls.clear()
        result = self.advise()
        self.assertEqual(result['cache']['status'], 'invalid')
        self.assertEqual(result['status'], 'selected')
        self.assertEqual(result['selected'], ['review'])
        self.assertEqual(result['request_count'], 1)
        self.assertEqual(len(self.transport.calls), 1)

    def test_symlink_and_shared_directory_never_supply_decisions(self):
        self.advise()
        entry = next(self.options['cache_dir'].glob('jev-*.json'))
        outside = self.root / 'outside'
        outside.write_text(entry.read_text())
        entry.unlink()
        entry.symlink_to(outside)
        result = self.advise()
        self.assertNotEqual(result['cache']['status'], 'hit')
        self.assertFalse(entry.is_symlink())
        self.options['cache_dir'].chmod(0o755)
        result = self.advise()
        self.assertEqual(result['selected'], ['review'])
        self.assertEqual(result['cache']['status'], 'unavailable')
        self.assertEqual(result['cache']['write_status'], 'unavailable')

    def test_entry_count_is_bounded_without_removing_other_files(self):
        self.advise()
        unrelated = self.options['cache_dir'] / 'keep.txt'
        unrelated.write_text('user-owned')
        with patch.object(decision_cache, 'MAX_ENTRIES', 2):
            self.advise('Second query')
            self.advise('Third query')
        self.assertEqual(len(list(self.options['cache_dir'].glob('jev-*.json'))), 2)
        self.assertEqual(unrelated.read_text(), 'user-owned')

    def test_cli_cache_hit_does_not_read_missing_key_or_replay_network(self):
        self.transport.transport_kind = 'https'
        cold = self.advise()
        (self.root / 'catalog.json').write_text(json.dumps(self.catalog))
        environment = dict(os.environ)
        environment.pop('TYPESAFE_API_KEY', None)
        process = subprocess.run([sys.executable, '-B', str(SCRIPTS / 'jev_advisor.py'),
            '--catalog', str(self.root / 'catalog.json'), '--query', 'Review this change',
            '--cache-dir', str(self.options['cache_dir']), '--cache-scope', self.options['cache_scope'],
            '--key-file', str(self.root / 'missing-key')], env=environment, text=True,
            capture_output=True, timeout=10)
        self.assertEqual(process.returncode, 0, process.stderr)
        result = json.loads(process.stdout)
        self.assertEqual(result['selected'], cold['selected'])
        self.assertEqual((result['cache']['status'], result['request_count']), ('hit', 0))


class PortableCacheTests(CacheTestSupport):
    def test_errors_and_incomplete_plans_never_cache(self):
        cases = [({}, 'error'), (response('SINGLE', 'unknown'), 'error')]
        for value, status in cases:
            transport = Transport(value)
            for _ in range(2):
                self.assertEqual(self.advise(str(value), transport=transport)['status'], status)
            self.assertEqual(len(transport.calls), 2)
        calls = []
        def incomplete(payload):
            calls.append(payload)
            return response('PAIR') if 'primary' in payload['questions'] else {
                'answers': {'next': {'type': 'choice', 'choice': 'STOP'}}}
        for _ in range(2):
            result = self.advise('Compound task', transport=incomplete)
            self.assertEqual((result['status'], result['provisional_selected']), ('clarify', ['review']))
        self.assertEqual(len(calls), 4)
        self.assertFalse(self.options['cache_dir'].exists())

    def test_cache_disabled_by_default_and_scope_required_when_enabled(self):
        result = advisor.advise('Review', self.catalog, self.transport)
        self.assertEqual(result['cache']['status'], 'disabled')
        result = self.advise(cache_scope=None)
        self.assertEqual((result['error'], result['request_count']), ('invalid_cache_scope', 0))
        for ttl in (0, -1, float('nan'), float('inf'), 86401, True):
            self.assertEqual(self.advise(cache_ttl_seconds=ttl)['error'], 'invalid_cache_ttl')

    def test_unsupported_platform_uses_fresh_advice_without_cache_files(self):
        # Exercise the real primitive check without depending on this test host.
        with patch.object(decision_cache, 'os', SimpleNamespace()):
            result = self.advise()
        self.assertEqual(result['status'], 'selected')
        self.assertEqual(result['selected'], ['review'])
        self.assertEqual(result['cache']['status'], 'unavailable')
        self.assertEqual(result['cache']['write_status'], 'unavailable')
        self.assertEqual(result['request_count'], 1)
        self.assertEqual(len(self.transport.calls), 1)
        self.assertFalse(self.options['cache_dir'].exists())


class AliasAndConfidenceTests(unittest.TestCase):
    def setUp(self):
        self.proof = {'skill_identity': 'review', 'bundle_sha256': 'd' * 64}
        self.original = skill(**self.proof)
        self.alias = skill('plugin-review', 'ops-kit:review', **self.proof)

    def test_aliases_consolidate_before_retrieval_with_accurate_coverage(self):
        catalog = [self.original] + [skill('copy-%d' % i, 'plugin%d:review' % i, **self.proof) for i in range(250)]
        result = advisor.advise('Inspect a change', catalog, Transport())
        self.assertEqual(result['selected'], ['review'])
        self.assertEqual((result['eligible_count'], result['distinct_capability_count'], result['candidate_count']), (251, 1, 1))
        self.assertEqual((result['deduplicated_count'], result['represented_count'], result['catalog_truncated']), (250, 251, False))
        self.assertEqual(len(result['candidate_aliases']['review']), 251)

    def test_explicit_qualified_name_or_id_preserves_the_requested_alias(self):
        for query in ('Use $ops-kit:review', 'Use plugin-review', 'Use $ops-kit:review.',
                      'Use plugin-review. Then inspect the result.', 'Use $ops-kit:review...'):
            result = advisor.advise(query, [self.original, self.alias], Transport())
            self.assertEqual(result['selected'], ['plugin-review'])
            self.assertEqual({a['id'] for a in result['candidate_aliases']['plugin-review']}, {'review', 'plugin-review'})
        both = advisor.offline_candidates('Compare $review and $ops-kit:review', [self.original, self.alias])
        self.assertEqual({x['id'] for x in both}, {'review', 'plugin-review'})

    def test_alias_prefix_inside_a_longer_identifier_is_not_an_explicit_request(self):
        for query in ('Use plugin-review.extra', 'Use $ops-kit:review.extra',
                      'Use plugin-review/extra', 'Use prefix.plugin-review',
                      'Use plugin-review..extra'):
            with self.subTest(query=query):
                found = advisor.offline_candidates(query, [self.original, self.alias])
                self.assertEqual([candidate['id'] for candidate in found], ['review'])

    def test_same_text_or_skill_md_hash_is_not_whole_bundle_proof(self):
        for proof in ({}, {'content_sha256': 'a' * 64}, {'bundle_sha256': 'bad', 'skill_identity': 'review'},
                      {'bundle_sha256': 'd' * 64}):
            with self.subTest(proof=proof):
                found = advisor.offline_candidates('Inspect', [skill(**proof), skill('alias', 'plugin:review', **proof)])
                self.assertEqual(len(found), 2)

    def test_shared_name_does_not_mean_multiple_explicit_variants(self):
        catalog = [skill('copy-a', **self.proof), skill('copy-b', **self.proof)]
        self.assertEqual(len(advisor.offline_candidates('Use review', catalog)), 1)
        self.assertEqual([x['id'] for x in advisor.offline_candidates('Use review with copy-b', catalog)], ['copy-b'])
        self.assertEqual(len(advisor.offline_candidates('Compare copy-a and copy-b', catalog)), 2)

    def test_different_bundle_restrictions_and_provider_tools_stay_distinct(self):
        for change in ({'bundle_sha256': 'e' * 64}, {'explicit_only': True}, {'description': 'Other workflow'},
                       {'skill_identity': 'other'}, {'dependencies': ['another-connection']}):
            with self.subTest(change=change):
                found = advisor.offline_candidates('Inspect', [self.original, self.alias | change])
                self.assertEqual(len(found), 2)
        tools = [self.original | {'kind': 'mcp_tool'}, self.alias | {'kind': 'mcp_tool'}]
        self.assertEqual(len(advisor.offline_candidates('Inspect', tools)), 2)
        self.assertEqual([x['id'] for x in advisor.offline_candidates('Inspect',
                         [self.original | {'enabled': False}, self.alias])], ['plugin-review'])

    def test_confidence_is_observation_not_an_activation_threshold(self):
        for confidence in (None, 0, 0.49, 0.5, 0.79, 0.8, 1, -1, 2, True, 'high'):
            with self.subTest(confidence=confidence):
                data = response()
                data['answers']['primary']['confidence'] = confidence
                result = advisor.advise('Review', [self.original], Transport(data))
                self.assertEqual((result['status'], result['selected']), ('selected', ['review']))
        invalid = response('SINGLE', 'invented')
        invalid['answers']['primary']['confidence'] = 1
        self.assertEqual(advisor.advise('Review', [self.original], Transport(invalid))['status'], 'error')

    def test_nonfinite_provider_values_fail_without_corrupting_receipts(self):
        for confidence in (float('nan'), float('inf'), -float('inf')):
            data = response()
            data['answers']['primary']['confidence'] = confidence
            result = advisor.advise('Review', [self.original], Transport(data))
            self.assertEqual(result['status'], 'error')
            self.assertEqual(result['selected'], [])
            self.assertIsNone(result['requests'][0]['response'])
            advisor.encode(result)  # Receipt itself must remain strict JSON.


if __name__ == '__main__':
    unittest.main()
