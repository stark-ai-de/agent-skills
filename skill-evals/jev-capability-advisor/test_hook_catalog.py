"""Offline hook-catalog provenance consistency; no host attestation or provider access."""
from contextlib import redirect_stdout
import copy
import io
import json
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import hook_catalog
import jev_advisor


def fixture(*, tools=True, host='codex'):
    catalog = [{'id': 'skill:review', 'kind': 'skill', 'name': 'review',
                'description': 'Review supplied changes.', 'enabled': True, 'explicit_only': False}]
    if tools:
        catalog.append({'id': 'tool:fixture.read', 'kind': 'tool', 'name': 'fixture.read',
                        'description': 'Read fixture requirements.', 'enabled': True, 'explicit_only': False})
    evidence = {
        'version': 1, 'host': host, 'host_version': '1.2.3',
        'capture': {'token': 'local-capture-1', 'binding': 'agent_asserted_current_session'},
        'catalog_sha256': jev_advisor.digest(catalog),
        'coverage': {'completeness': 'bounded', 'omissions': [] if tools else [
            {'kind': 'tool', 'reason': 'no_current_definitions', 'count': 0}]},
        'entries': [{'snapshot': copy.deepcopy(item),
                     'source': {'surface': 'model_skill_card' if item['kind'] == 'skill' else 'loaded_mcp_definition',
                                'reference': 'local-card-1'},
                     'restriction': {'basis': 'host_metadata', 'reference': 'local-policy-1',
                                     'explicit_request': False}} for item in catalog],
    }
    return catalog, evidence


def rebind(catalog, evidence):
    evidence['catalog_sha256'] = jev_advisor.digest(catalog)
    for item, entry in zip(catalog, evidence['entries']):
        entry['snapshot'] = copy.deepcopy(item)


class HookCatalogTests(unittest.TestCase):
    def assert_code(self, code, catalog, evidence, **kwargs):
        with self.assertRaisesRegex(ValueError, '^' + code + '$'):
            hook_catalog.check_catalog(catalog, evidence, **kwargs)

    def run_cli(self, catalog, evidence, *extra):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path, evidence_path = root / 'catalog.json', root / 'provenance.json'
            catalog_path.write_text(json.dumps(catalog), encoding='utf-8')
            evidence_path.write_text(json.dumps(evidence), encoding='utf-8')
            before = {path.name: path.read_bytes() for path in root.iterdir()}
            output = io.StringIO()
            with redirect_stdout(output):
                code = hook_catalog.main(['--catalog', str(catalog_path), '--provenance', str(evidence_path), *extra])
            self.assertEqual(before, {path.name: path.read_bytes() for path in root.iterdir()})
        return code, json.loads(output.getvalue())

    def test_both_hosts_mixed_catalog_is_consistent_without_claiming_attestation(self):
        for host in ('codex', 'claude-code'):
            with self.subTest(host=host):
                catalog, evidence = fixture(host=host)
                result = hook_catalog.check_catalog(catalog, evidence, expected_capture_token='local-capture-1')
                self.assertEqual(result['status'], 'catalog_evidence_consistent')
                self.assertEqual((result['skills'], result['mcp_tools'], result['eligible_count']), (1, 1, 2))
                self.assertEqual(result['capture_token_check'], 'matched')
                self.assertEqual(result['capture_binding'], 'agent_asserted_current_session')
                self.assertEqual(result['host_attestation'], 'not_verified')

    def test_capture_token_checks_continuity_and_rejects_native_attestation_claim(self):
        catalog, evidence = fixture()
        self.assertEqual(hook_catalog.check_catalog(catalog, evidence)['capture_token_check'], 'not_checked')
        self.assert_code('capture_token_mismatch', catalog, evidence, expected_capture_token='another-turn')
        self.assert_code('invalid_arguments', catalog, evidence, expected_capture_token='bad token')
        evidence['capture']['binding'] = 'host_verified'
        self.assert_code('invalid_provenance', catalog, evidence)

    def test_catalog_bytes_and_all_card_metadata_are_bound(self):
        catalog, evidence = fixture()
        catalog[0]['description'] = 'Rewritten description.'
        self.assert_code('catalog_digest_mismatch', catalog, evidence)
        evidence['catalog_sha256'] = jev_advisor.digest(catalog)
        self.assert_code('catalog_entry_mismatch', catalog, evidence)
        for field, value in (('brief', 'Different provider wording'), ('use_when', ['Different relevance']),
                             ('keywords', ['hidden']), ('avoid_when', ['Skip other tasks']),
                             ('parameter_descriptions', {'input': 'Changed input'})):
            with self.subTest(field=field):
                catalog, evidence = fixture()
                catalog[0][field] = value
                evidence['catalog_sha256'] = jev_advisor.digest(catalog)
                self.assert_code('catalog_entry_mismatch', catalog, evidence)
                rebind(catalog, evidence)
                self.assertEqual(hook_catalog.check_catalog(catalog, evidence)['status'], 'catalog_evidence_consistent')

    def test_missing_extra_duplicate_and_foreign_snapshots_are_rejected(self):
        for variant in ('missing', 'extra', 'duplicate', 'foreign'):
            with self.subTest(variant=variant):
                catalog, evidence = fixture()
                if variant == 'missing':
                    evidence['entries'].pop()
                elif variant == 'extra':
                    evidence['entries'].append(copy.deepcopy(evidence['entries'][0]))
                elif variant == 'duplicate':
                    evidence['entries'][1] = copy.deepcopy(evidence['entries'][0])
                else:
                    evidence['entries'][0]['snapshot']['id'] = 'skill:unknown'
                self.assert_code('catalog_entry_mismatch', catalog, evidence)

    def test_builtins_files_or_wrong_source_kinds_cannot_claim_mcp(self):
        for surface in ('builtin_tool', 'installed_file', 'model_skill_card', 'other_session'):
            with self.subTest(surface=surface):
                catalog, evidence = fixture()
                evidence['entries'][1]['source']['surface'] = surface
                self.assert_code('invalid_source', catalog, evidence)
        catalog, evidence = fixture()
        evidence['entries'][0]['source']['reference'] = ''
        self.assert_code('invalid_source', catalog, evidence)

    def test_restrictions_unknown_disabled_and_nonboolean_flags_fail_closed(self):
        catalog, evidence = fixture()
        evidence['entries'][0]['restriction']['basis'] = 'unknown'
        self.assert_code('invalid_restriction', catalog, evidence)
        for field, value in (('enabled', False), ('enabled', None), ('explicit_only', 'false')):
            with self.subTest(field=field, value=value):
                catalog, evidence = fixture()
                catalog[0][field] = value
                rebind(catalog, evidence)
                self.assert_code('invalid_catalog_item', catalog, evidence)
        catalog, evidence = fixture()
        catalog[0].pop('explicit_only')
        rebind(catalog, evidence)
        self.assert_code('invalid_catalog_item', catalog, evidence)

    def test_explicit_only_needs_local_invocation_evidence(self):
        catalog, evidence = fixture()
        catalog[0]['explicit_only'] = True
        rebind(catalog, evidence)
        self.assert_code('invalid_restriction', catalog, evidence)
        policy = evidence['entries'][0]['restriction']
        policy['explicit_request'] = True
        self.assert_code('invalid_restriction', catalog, evidence)
        policy['explicit_request_reference'] = 'local-user-invocation-reference'
        self.assertEqual(hook_catalog.check_catalog(catalog, evidence)['status'], 'catalog_evidence_consistent')

    def test_documented_default_requires_version_reference_and_skill_kind(self):
        catalog, evidence = fixture()
        policy = evidence['entries'][0]['restriction']
        policy['basis'] = 'verified_host_default'
        self.assertEqual(hook_catalog.check_catalog(catalog, evidence)['host_attestation'], 'not_verified')
        evidence['host_version'] = 'unknown'
        self.assert_code('invalid_restriction', catalog, evidence)
        evidence['host_version'] = '1.2.3'
        policy['reference'] = ''
        self.assert_code('invalid_restriction', catalog, evidence)
        catalog, evidence = fixture()
        evidence['entries'][1]['restriction']['basis'] = 'verified_host_default'
        self.assert_code('invalid_restriction', catalog, evidence)

    def test_missing_mcp_is_explicit_without_claiming_complete_inventory(self):
        catalog, evidence = fixture(tools=False)
        result = hook_catalog.check_catalog(catalog, evidence)
        self.assertEqual((result['mcp_tools'], result['omission_records']), (0, 1))
        evidence['coverage']['omissions'] = []
        self.assert_code('missing_tool_coverage', catalog, evidence)
        evidence['coverage'] = {'completeness': 'unknown', 'omissions': [
            {'kind': 'tool', 'reason': 'deferred_definitions', 'count': None}]}
        self.assertEqual(hook_catalog.check_catalog(catalog, evidence)['completeness'], 'unknown')
        evidence['coverage']['completeness'] = 'complete'
        self.assert_code('invalid_coverage', catalog, evidence)

    def test_malformed_coverage_counts_and_unknown_fields_fail_closed(self):
        for value in (True, -1, 1.5, 'unknown', hook_catalog.MAX_ITEMS + 1):
            with self.subTest(value=value):
                catalog, evidence = fixture(tools=False)
                evidence['coverage']['omissions'][0]['count'] = value
                self.assert_code('invalid_coverage', catalog, evidence)
        catalog, evidence = fixture()
        evidence['host_attestation'] = 'verified'
        self.assert_code('invalid_provenance', catalog, evidence)
        evidence.pop('host_attestation')
        evidence['version'] = True
        self.assert_code('invalid_provenance', catalog, evidence)

    def test_original_catalog_contract_is_reused_without_permissive_wrappers(self):
        catalog, evidence = fixture()
        self.assert_code('invalid_catalog', {'capabilities': catalog}, evidence)
        self.assert_code('duplicate_candidate_id', catalog + [catalog[0]], evidence)
        self.assert_code('empty_catalog', [], evidence)
        catalog[0]['description'] = []
        self.assert_code('invalid_description', catalog, evidence)

    def test_no_credentials_network_cache_or_mutation_and_no_private_stdout(self):
        catalog, evidence = fixture()
        marker = 'SYNTHETIC-PRIVATE-REFERENCE-NEVER-PRINT'
        evidence['entries'][0]['source']['reference'] = '/private/' + marker
        evidence['entries'][0]['restriction']['reference'] = marker
        catalog[0]['source_paths'] = ['/private/' + marker]
        rebind(catalog, evidence)
        with patch.object(jev_advisor, 'make_transport', side_effect=AssertionError('provider forbidden')), \
                patch.object(socket, 'socket', side_effect=AssertionError('network forbidden')), \
                patch.dict(jev_advisor.os.environ, {'TYPESAFE_API_KEY': marker}):
            code, result = self.run_cli(catalog, evidence, '--expected-capture-token', 'local-capture-1')
        self.assertEqual(code, 0)
        self.assertNotIn(marker, json.dumps(result))
        self.assertNotIn('Review supplied', json.dumps(result))
        self.assertNotIn('local-capture-1', json.dumps(result))
        self.assertNotIn('source_paths', json.dumps(result))
        self.assertEqual(result['host_attestation'], 'not_verified')
        evidence['catalog_sha256'] = '0' * 64
        code, result = self.run_cli(catalog, evidence)
        self.assertEqual((code, result['error']), (1, 'catalog_digest_mismatch'))
        self.assertNotIn(marker, json.dumps(result))

    def test_bounded_json_rejects_duplicates_nonfinite_and_invalid_bytes(self):
        cases = (b'{"version":1,"version":1}', b'{"value":NaN}', b'{"value":Infinity}', b'{"value":1e400}', b'{"value":-1e400}',
                 b'\xff', b'{' + b'[' * 1200)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.json'
            for raw in cases:
                with self.subTest(raw=raw[:40]):
                    path.write_bytes(raw)
                    with self.assertRaisesRegex(ValueError, '^invalid_json$'):
                        hook_catalog.read_json(path)
            path.write_bytes(b'x' * (hook_catalog.MAX_JSON_BYTES + 1))
            with self.assertRaisesRegex(ValueError, '^input_too_large$'):
                hook_catalog.read_json(path)

    def test_cli_argument_and_io_errors_never_echo_paths_or_values(self):
        for args, expected in (([], 'invalid_arguments'),
                               (['--unknown-secret-like-value'], 'invalid_arguments'),
                               (['--catalog', '/__synthetic_missing_private__/catalog',
                                 '--provenance', '/__synthetic_missing_private__/provenance'], 'input_unavailable')):
            output = io.StringIO()
            with redirect_stdout(output):
                code = hook_catalog.main(args)
            result = json.loads(output.getvalue())
            self.assertEqual((code, result['error']), (1, expected))
            self.assertNotIn('synthetic_missing_private', output.getvalue())
            self.assertNotIn('secret-like-value', output.getvalue())


if __name__ == '__main__':
    unittest.main()
