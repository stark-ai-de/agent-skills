"""Optional guidance and experimental allocation; no labels or external services."""
from collections import Counter
import copy
import json
import sys
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import jev_advisor as advisor
from retrieval import CandidateIndex
from routing_metadata import MAX_TEXT


def skill(number):
    return dict(id='skill:%03d' % number, name='workflow-%03d' % number,
                kind='skill', description='Workflow instructions.')


def tool(provider, number):
    name = 'mcp__%s__operation_%03d' % (provider, number)
    return dict(id=name, name=name, kind='mcp_tool', description='Search records.')


class RoutingMetadataTests(unittest.TestCase):
    def test_compact_initial_and_legacy_followup_formats_are_stable(self):
        # The compact initial wire format intentionally replaces the old golden.
        # Conditioned follow-ups retain the pre-compaction format byte for byte.
        catalog = [dict(id='skill:alpha', name='alpha', kind='skill', description='Review a provided diff.'),
                   dict(id='tool:beta', name='beta', kind='mcp_tool', description='Read records.')]
        initial, _ = advisor.build_request('Review alpha.', catalog)
        following, _ = advisor.build_request('Review alpha.', catalog, selected=[catalog[0]],
                                             phase='followup', planned_count=2)
        self.assertEqual(advisor.digest(initial), '9a1d95184df0933ad92bb39fec3be34f1e190606e19300fde30830230b1a2f03')
        self.assertEqual(advisor.digest(following), '4783bea687641d200c83c46bf3dd326535fa8e8d67567f5b654640627a156d9b')
        self.assertEqual(following['questions']['next']['instructions'], advisor.FOLLOWUP_RULES)
        self.assertEqual(following['state']['already_selected'][0]['name'], 'alpha')
        self.assertEqual(list(following['state']['available_capabilities']), ['c000'])
        self.assertIn('beta', following['state']['available_capabilities']['c000'])
        empty = [dict(item, use_when=[], avoid_when='', keywords=[], parameter_descriptions={}) for item in catalog]
        self.assertEqual(advisor.build_request('Review alpha.', empty)[0], initial)

    def test_singleton_fastpath_preserves_identity_without_matching_query(self):
        items = [skill(i) for i in range(25)]
        with patch.object(advisor, '_mentioned', side_effect=AssertionError('singleton needs no regex scan')):
            representatives, aliases = advisor._consolidate('Any task', items)
        self.assertEqual(representatives, items)
        self.assertTrue(all(aliases[item['id']] == [item] for item in items))

    def test_each_positive_field_adds_relevance_without_changing_availability(self):
        base = [tool('atlas', i) for i in range(5)]
        values = {'use_when': ['quasar telemetry'], 'keywords': ['quasar'],
                  'parameter_descriptions': {'filter': 'quasar telemetry'}}
        for field, value in values.items():
            with self.subTest(field=field):
                changed = copy.deepcopy(base)
                changed[-1][field] = value
                self.assertEqual(CandidateIndex(changed).search('quasar', limit=1)[0]['id'], changed[-1]['id'])
                changed[-1]['enabled'] = False
                self.assertNotIn(changed[-1]['id'], {item['id'] for item in advisor.offline_candidates('quasar', changed)})
        restricted = dict(base[-1], use_when='quasar telemetry', explicit_only=True)
        payload, _ = advisor.build_request('quasar', [restricted])
        self.assertIn('explicit_only=true', payload['state']['available_capabilities']['c000'])

    def test_avoid_conditions_are_not_positive_lexical_terms(self):
        base = [tool('atlas', i) for i in range(5)]
        changed = copy.deepcopy(base)
        changed[-1]['avoid_when'] = ['quasar telemetry']
        ordinary, avoided = CandidateIndex(base), CandidateIndex(changed)
        self.assertEqual(ordinary.snapshot(), avoided.snapshot())
        self.assertEqual([i['id'] for i in ordinary.search('quasar')], [i['id'] for i in avoided.search('quasar')])
        payload, _ = advisor.build_request('quasar', changed)
        self.assertTrue(any('avoid_when: quasar telemetry' in card
                            for card in payload['state']['available_capabilities'].values()))

    def test_labeled_metadata_stays_bounded_and_local_provenance_is_not_sent(self):
        path = '/synthetic/private/workspace/resources/instructions.md'
        item = dict(tool('atlas', 1), source_paths=[path], use_when=path + ' lookup',
                    avoid_when=['Unconfigured service'], keywords=['records'],
                    parameter_descriptions={'account': 'Existing account identifier'},
                    routing_source={'local': path, 'internal_note': 'DO_NOT_SEND_INTERNAL_METADATA'})
        payload, _ = advisor.build_request('Find records', [item])
        text = advisor.encode(payload).decode()
        for expected in ('use_when:', 'avoid_when:', 'keywords:', 'parameter_descriptions:'):
            self.assertIn(expected, text)
        self.assertNotIn('/synthetic/private', text)
        self.assertNotIn('routing_source', text)
        self.assertNotIn('DO_NOT_SEND_INTERNAL_METADATA', text)
        self.assertIn('[local source]', text)
        selected, _ = advisor.build_request('Another step', [item, tool('boreal', 1)], selected=[item],
                                             phase='followup', planned_count=2)
        self.assertIn('routing_guidance', selected['state']['already_selected'][0])
        self.assertNotIn(path, advisor.encode(selected).decode())

    def test_many_long_fields_cannot_bypass_payload_budgets(self):
        items = [dict(tool('atlas', i), use_when='x' * 2000, avoid_when='y' * 2000,
                      keywords=['z' * 1000], parameter_descriptions={'filter': 'q' * 2000}) for i in range(240)]
        payload, mapping = advisor.build_request('Task', items)
        self.assertEqual(len(mapping), 240)
        self.assertLessEqual(len(advisor.encode(payload)), advisor.MAX_REQUEST_BYTES)
        self.assertLessEqual(advisor._criteria_state_bytes(payload), advisor.MAX_CRITERIA_STATE_BYTES)
        for card in payload['state']['available_capabilities'].values():
            self.assertLessEqual(len(card.split(' | ', 3)[3]), 240)

    def test_malformed_metadata_fails_before_transport(self):
        values = [('use_when', {'unexpected': 'object'}), ('avoid_when', 7),
                  ('keywords', [None]), ('keywords', ['x' * (MAX_TEXT + 1)]),
                  ('parameter_descriptions', {'account': float('nan')}),
                  ('parameter_descriptions', ['not a mapping']), ('parameter_descriptions', {1: 'numeric key'})]
        for field, value in values:
            with self.subTest(field=field, value_type=type(value).__name__):
                item = dict(tool('atlas', 1), **{field: value})
                result = advisor.advise('Task', [item], lambda _: self.fail('network must not be reached'))
                self.assertEqual(result['status'], 'error')
                self.assertEqual(result['error'], 'invalid_routing_metadata')
                self.assertEqual(result['request_count'], 0)


class BalancedPolicyTests(unittest.TestCase):
    def setUp(self):
        self.skills = [skill(i) for i in range(132)]
        self.catalog = self.skills + [tool('atlas', i) for i in range(300)] + [tool('boreal', i) for i in range(100)]

    def test_current_stays_default_and_balanced_reserves_twenty_percent(self):
        default = CandidateIndex(self.catalog).search('Atlas records')
        current = CandidateIndex(self.catalog, policy='current').search('Atlas records')
        balanced = CandidateIndex(self.catalog, policy='balanced').search('Atlas records')
        self.assertEqual(default, current)
        counts = Counter(item['name'].split('__')[1] for item in balanced if item['kind'] != 'skill')
        self.assertEqual(counts, {'atlas': 86, 'boreal': 22})
        self.assertTrue({item['id'] for item in self.skills} <= {item['id'] for item in balanced})
        self.assertEqual(len(balanced), 240)

    def test_named_providers_and_transports_share_the_reserved_pool(self):
        catalog = self.catalog + [tool('cinder', i) for i in range(100)]
        balanced = CandidateIndex(catalog, policy='balanced').search('Atlas and Boreal records')
        counts = Counter(item['name'].split('__')[1] for item in balanced if item['kind'] != 'skill')
        self.assertEqual(counts, {'atlas': 43, 'boreal': 43, 'cinder': 22})

    def test_exact_tool_id_survives_provider_pressure(self):
        target = dict(tool('cinder', 1), description='Unrelated tiny description.')
        query = 'Atlas records and ' + target['id']
        found = CandidateIndex(self.catalog + [target], policy='balanced').search(query)
        self.assertIn(target['id'], {item['id'] for item in found})
        self.assertEqual(len(found), 240)

    def test_balanced_membership_is_deterministic_and_invalid_policy_is_rejected(self):
        query = 'Atlas and Boreal records'
        first = CandidateIndex(self.catalog, policy='balanced').search(query)
        second = CandidateIndex(list(reversed(self.catalog)), policy='balanced').search(query)
        self.assertEqual([item['id'] for item in first], [item['id'] for item in second])
        result = advisor.advise(query, self.catalog, lambda _: self.fail('unexpected transport'), retrieval_policy='invented')
        self.assertEqual(result['error'], 'invalid_retrieval_policy')


if __name__ == '__main__':
    unittest.main()
