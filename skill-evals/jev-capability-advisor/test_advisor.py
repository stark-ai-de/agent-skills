"""Offline invariants for recommendation-only routing; no API or secret access."""
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import jev_advisor as advisor


def item(identifier, name=None, **extra):
    return dict(id=identifier, name=name or identifier, kind='skill',
                description='Performs the named task directly.', **extra)


def answer(**choices):
    return {'answers': {key: {'type': 'choice', 'choice': value} for key, value in choices.items()},
            'usage': {'input_tokens': 10, 'output_tokens': 1}}


class Scripted:
    def __init__(self, *steps):
        self.steps = list(steps)
        self.payloads = []

    def __call__(self, payload):
        self.payloads.append(payload)
        step = self.steps.pop(0)
        return step(payload) if callable(step) else step


def code(payload, name):
    question = payload['questions'].get('primary') or payload['questions']['next']
    return next(key for key, value in question['criteria'].items()
                if key.startswith('c') and value == name + ' (skill)')


class AdvisorTests(unittest.TestCase):
    def setUp(self):
        self.catalog = [item('alpha'), item('beta'), item('gamma')]

    def test_single_is_one_request_and_one_result(self):
        transport = Scripted(lambda payload: answer(mode='SINGLE', primary=code(payload, 'alpha')))
        result = advisor.advise('Use alpha for the next step', self.catalog, transport)
        self.assertEqual((result['status'], result['selected'], result['request_count']),
                         ('selected', ['alpha'], 1))
        self.assertEqual(len(transport.payloads), 1)

    def test_pair_conditions_followup_on_primary(self):
        transport = Scripted(lambda p: answer(mode='PAIR', primary=code(p, 'alpha')),
                             lambda p: answer(next=code(p, 'beta')))
        result = advisor.advise('Use alpha and beta for independent tasks', self.catalog, transport)
        self.assertEqual(result['selected'], ['alpha', 'beta'])
        followup = transport.payloads[1]
        self.assertEqual(followup['state']['already_selected'][0]['name'], 'alpha')
        self.assertEqual(followup['state']['already_selected'][0]['brief'], 'Performs the named task directly.')
        self.assertNotIn('alpha (skill)', followup['questions']['next']['criteria'].values())
        self.assertEqual(result['request_count'], 2)

    def test_pair_retains_uncovered_capability_when_primary_order_changes(self):
        transport = Scripted(lambda p: answer(mode='PAIR', primary=code(p, 'beta')),
                             lambda p: answer(next=code(p, 'alpha')))
        result = advisor.advise('Use alpha and beta independently', self.catalog, transport)
        self.assertEqual(result['selected'], ['beta', 'alpha'])
        following = transport.payloads[1]
        self.assertEqual(following['state']['already_selected'][0]['name'], 'beta')
        self.assertIn('alpha (skill)', following['questions']['next']['criteria'].values())
        self.assertNotIn('beta (skill)', following['questions']['next']['criteria'].values())
        self.assertEqual(result['request_count'], 2)

    def test_followup_clarification_preserves_only_provisional_advice(self):
        transport = Scripted(lambda p: answer(mode='TRIPLE', primary=code(p, 'alpha')),
                             answer(next='CLARIFY'))
        result = advisor.advise('Three independent tasks with an unclear remaining step',
                                self.catalog, transport)
        self.assertEqual(result['status'], 'clarify')
        self.assertEqual(result['selected'], [])
        self.assertEqual(result['selected_ids'], [])
        self.assertEqual(result['provisional_selected'], ['alpha'])
        self.assertEqual(result['stopped_reason'], 'model_clarify')
        self.assertEqual(result['request_count'], 2)
        self.assertEqual(len(transport.payloads), 2)

    def test_triple_completes_within_three_requests(self):
        transport = Scripted(lambda p: answer(mode='TRIPLE', primary=code(p, 'alpha')),
                             lambda p: answer(next=code(p, 'beta')), lambda p: answer(next=code(p, 'gamma')))
        result = advisor.advise('Use alpha, beta, and gamma independently', self.catalog, transport)
        self.assertEqual(result['status'], 'selected')
        self.assertEqual(result['selected'], ['alpha', 'beta', 'gamma'])
        self.assertEqual(result['request_count'], 3)

    def test_none_and_clarify_remain_distinct(self):
        for mode in ('NONE', 'CLARIFY'):
            with self.subTest(mode=mode):
                result = advisor.advise('Task data', self.catalog, Scripted(answer(mode=mode, primary=mode)))
                self.assertEqual(result['status'], mode.lower())
                self.assertEqual(result['selected'], [])
                self.assertEqual(result['request_count'], 1)

    def test_empty_and_disabled_catalog_need_no_transport(self):
        def forbidden(_): raise AssertionError('transport must not be called')
        for catalog in ([], [item('disabled', enabled=False)]):
            result = advisor.advise('Task data', catalog, forbidden)
            self.assertEqual(result['status'], 'none')
            self.assertEqual(result['request_count'], 0)

    def test_malformed_or_inconsistent_answers_fail_closed(self):
        for response in ({}, answer(mode='SINGLE', primary='NONE'),
                         answer(mode='NONE', primary='CLARIFY'),
                         answer(mode='SINGLE', primary='invented')):
            with self.subTest(response=response):
                result = advisor.advise('Task data', self.catalog, Scripted(response))
                self.assertEqual(result['status'], 'error')
                self.assertEqual(result['selected'], [])
                self.assertIsNotNone(result['error'])
                self.assertEqual(result['requests'][0]['response'], response)

    def test_early_stop_does_not_claim_complete_or_none(self):
        transport = Scripted(lambda p: answer(mode='PAIR', primary=code(p, 'alpha')), answer(next='STOP'))
        result = advisor.advise('Task data', self.catalog, transport)
        self.assertEqual(result['status'], 'clarify')
        self.assertEqual(result['selected'], [])
        self.assertEqual(result['provisional_selected'], ['alpha'])
        self.assertEqual(result['stopped_reason'], 'incomplete_cardinality_plan')

    def test_verified_bundles_are_excluded_from_followup(self):
        proof = dict(skill_identity='same-name', bundle_sha256='a' * 64)
        catalog = [item('one', 'same-name', **proof),
                   item('alias', 'plugin:same-name', **proof),
                   item('different'), item('unproven', 'Same Name'),
                   item('changed', 'same-name', skill_identity='same-name', bundle_sha256='b' * 64)]
        payload, mapping = advisor.build_request('Task', catalog, selected=[catalog[0]],
                                                 phase='followup', planned_count=2)
        self.assertEqual(set(mapping.values()), {'different', 'unproven', 'changed'})

    def test_card_metadata_is_shared_but_paths_stay_local(self):
        path = '/private/test-skill/SKILL.md'
        catalog = [item('one', 'Restricted skill', explicit_only=True, source_paths=[path],
                        brief='Read ' + path + ' for workflow instructions.')]
        payload, mapping = advisor.build_request('Task', catalog)
        cards = payload['state']['available_capabilities']
        self.assertIn('Restricted skill', cards[next(iter(mapping))])
        self.assertIn('explicit_only=true', cards[next(iter(mapping))])
        self.assertNotIn(path, advisor.encode(payload).decode())
        self.assertEqual(advisor.local_card(catalog[0])['source_paths'], [path])
        self.assertEqual(set(payload['questions']), {'mode', 'primary'})

    def test_shortlist_none_reports_coverage_limits(self):
        catalog = [item(str(i)) for i in range(241)]
        result = advisor.advise('Task', catalog, Scripted(answer(mode='NONE', primary='NONE')))
        self.assertEqual(result['eligible_count'], 241)
        self.assertEqual(result['candidate_count'], 240)
        self.assertTrue(result['catalog_truncated'])
        self.assertEqual(result['none_scope'], 'retrieved_candidates')

    def test_usage_and_receipts_account_for_each_attempt_without_headers(self):
        transport = Scripted(lambda p: answer(mode='PAIR', primary=code(p, 'alpha')),
                             lambda p: answer(next=code(p, 'beta')))
        result = advisor.advise('Task', self.catalog, transport)
        self.assertEqual(result['usage_total'], {'input_tokens': 20, 'output_tokens': 2})
        self.assertEqual(len(result['receipt_digest']), 64)
        for receipt in result['requests']:
            self.assertEqual(receipt['request_sha256'], advisor.digest(receipt['request']))
            self.assertEqual(receipt['response_sha256'], advisor.digest(receipt['response']))
            self.assertNotIn('Authorization', json.dumps(receipt))

    def test_transport_error_has_no_retry_and_does_not_echo_secret(self):
        def forbidden(_): raise RuntimeError('secret-like-error-body')
        result = advisor.advise('Task', self.catalog, forbidden)
        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['request_count'], 1)
        self.assertNotIn('secret-like-error-body', json.dumps(result))

    def test_query_and_payload_bounds_fail_before_transport(self):
        result = advisor.advise('x' * (advisor.MAX_QUERY_CHARS + 1), self.catalog,
                                lambda _: self.fail('unexpected transport'))
        self.assertEqual(result['error'], 'invalid_query')
        catalog = [item(str(i), name='Capability ' + str(i), brief='long description ' * 100)
                   for i in range(300)]
        payload, mapping = advisor.build_request('Task', catalog)
        self.assertEqual(len(mapping), 240)
        self.assertLessEqual(len(advisor.encode(payload)), advisor.MAX_REQUEST_BYTES)
        self.assertLessEqual(advisor._criteria_state_bytes(payload), advisor.MAX_CRITERIA_STATE_BYTES)
        self.assertTrue(all(len(q['criteria']) <= 255 for q in payload['questions'].values()))


if __name__ == '__main__':
    unittest.main()
