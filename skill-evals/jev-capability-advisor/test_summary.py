"""Real CLI presentation boundaries; injected transport, no provider access."""
from contextlib import redirect_stderr, redirect_stdout
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import jev_advisor as advisor


def answer(**choices):
    return {'answers': {key: {'type': 'choice', 'choice': value}
                        for key, value in choices.items()}}


class SummaryTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='jev-summary-test-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.catalog = self.root / 'catalog.json'
        self.catalog.write_text(json.dumps([
            {'id': 'review', 'name': 'review', 'kind': 'skill', 'explicit_only': True,
             'description': 'Review the supplied diff.', 'source_paths': ['/synthetic/review/SKILL.md']},
            *({'id': 'tool-%03d' % i, 'name': 'example.read_%03d' % i, 'kind': 'tool',
               'description': 'Read a different synthetic resource. ' * 8} for i in range(300))
        ]))

    def run_cli(self, replies, *extra):
        stdout = io.StringIO()
        with patch.dict(os.environ, {'TYPESAFE_API_KEY': 'synthetic-test-value'}, clear=True), \
                patch.object(advisor, 'make_transport', return_value=lambda payload: next(replies)), \
                redirect_stdout(stdout):
            code = advisor.main(['--catalog', str(self.catalog), '--query', 'Use review', *extra])
        return code, json.loads(stdout.getvalue()), len(stdout.getvalue().encode())

    def test_summary_limits_host_context_but_preserves_complete_receipt(self):
        receipt = self.root / 'receipt.json'
        code, summary, size = self.run_cli(iter([answer(mode='SINGLE', primary='c000')]),
                                           '--summary', '--output', str(receipt))
        full = json.loads(receipt.read_text())
        self.assertEqual((code, summary['status'], summary['selected']), (0, 'selected', ['review']))
        self.assertGreater(full['candidate_count'], 200)
        self.assertLess(size, receipt.stat().st_size / 20)
        self.assertNotIn('requests', summary)
        self.assertNotIn('candidates', summary)
        self.assertEqual(summary['candidate_digest'], full['candidate_digest'])
        self.assertEqual(summary['receipt_digest'], full['receipt_digest'])
        self.assertTrue(summary['catalog_truncated'])
        selected = summary['selected_capabilities'][0]
        self.assertEqual(selected['id'], 'review')
        self.assertTrue(selected['explicit_only'])
        self.assertEqual(selected['source_paths'], ['/synthetic/review/SKILL.md'])
        self.assertEqual(full['requests'][0]['request']['state']['query'], 'Use review')

    def test_default_stdout_still_contains_full_receipt(self):
        code, result, _ = self.run_cli(iter([answer(mode='NONE', primary='NONE')]))
        self.assertEqual((code, result['status']), (0, 'none'))
        self.assertIn('requests', result)
        self.assertIn('candidates', result)

    def test_incomplete_and_failed_plans_keep_provisional_ids_separate(self):
        for followup, status, code in [(answer(next='STOP'), 'clarify', 0),
                                       (answer(next='not-a-choice'), 'error', 1)]:
            with self.subTest(status=status):
                actual, result, _ = self.run_cli(iter([answer(mode='PAIR', primary='c000'), followup]),
                                                 '--summary')
                self.assertEqual((actual, result['status']), (code, status))
                self.assertEqual(result['selected'], [])
                self.assertEqual(result['selected_capabilities'], [])
                self.assertEqual(result['provisional_selected'], ['review'])
                self.assertEqual(result['provisional_capabilities'][0]['id'], 'review')
                self.assertEqual(result['request_count'], 2)
                if status == 'error':
                    self.assertEqual(result['error'], 'unknown_choice')

    def test_summary_preserves_negative_and_ambiguous_outcomes(self):
        for mode in ('NONE', 'CLARIFY'):
            code, result, _ = self.run_cli(iter([answer(mode=mode, primary=mode)]), '--summary')
            self.assertEqual((code, result['status']), (0, mode.lower()))
            self.assertEqual(result['selected_capabilities'], [])
            self.assertEqual(result['request_count'], 1)

    def test_full_selected_description_retains_late_conditions_and_different_brief(self):
        items = json.loads(self.catalog.read_text())
        condition = 'Requires workspace-owner authorization; unavailable for guest accounts.'
        items[0]['description'] = 'Review applicable workspace resources. ' * 15 + condition
        items[0]['brief'] = 'Review workspace resources.'
        self.catalog.write_text(json.dumps(items))
        code, result, _ = self.run_cli(iter([answer(mode='SINGLE', primary='c000')]), '--summary')
        self.assertEqual(code, 0)
        card = result['selected_capabilities'][0]
        self.assertEqual(card['description'], items[0]['description'])
        self.assertEqual(card['brief'], items[0]['brief'])
        self.assertIn(condition, card['description'])

    @unittest.skipUnless(os.name == 'posix', 'Private decision cache requires POSIX')
    def test_cached_summary_preserves_current_cards_without_reading_credentials(self):
        options = ('--summary', '--cache-dir', str(self.root / 'cache'), '--cache-scope', 'synthetic-host')
        # Both calls use HTTPS transport identity; the fake key is never sent.
        key = self.root / 'key'
        key.write_text('synthetic-test-value')
        _, first, _ = self.run_cli(iter([answer(mode='SINGLE', primary='c000')]),
                                   *options, '--key-file', str(key))
        key.unlink()
        stdout = io.StringIO()
        with patch.dict(os.environ, {}, clear=True), \
                patch.object(advisor, 'make_transport', side_effect=AssertionError('network forbidden')), \
                redirect_stdout(stdout):
            code = advisor.main(['--catalog', str(self.catalog), '--query', 'Use review',
                                 *options, '--key-file', str(key)])
        result = json.loads(stdout.getvalue())
        self.assertEqual((code, result['cache']['status'], result['request_count']), (0, 'hit', 0))
        self.assertEqual(result['selected_capabilities'], first['selected_capabilities'])
        self.assertEqual(result['cache']['source_receipt_digest'], first['receipt_digest'])

    def test_invalid_catalog_summary_fails_closed_without_transport(self):
        self.catalog.write_text('null')
        code, result, _ = self.run_cli(iter([]), '--summary')
        self.assertEqual((code, result['status'], result['request_count']), (1, 'error', 0))
        self.assertEqual(result['selected_capabilities'], [])
        self.assertTrue(result['error'])
        self.assertNotIn('synthetic-test-value', json.dumps(result))

    def test_offline_inspection_requires_its_full_candidate_view(self):
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()), \
                self.assertRaises(SystemExit) as error:
            advisor.main(['--catalog', str(self.root / 'missing.json'), '--query', 'inspect',
                          '--summary', '--offline-candidates'])
        self.assertEqual(error.exception.code, 2)


if __name__ == '__main__':
    unittest.main()
