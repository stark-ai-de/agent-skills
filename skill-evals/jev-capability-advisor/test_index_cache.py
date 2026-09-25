"""Offline index-cache boundaries; all payloads synthetic, no keys or API calls."""
import copy
from concurrent.futures import ProcessPoolExecutor
import hashlib
import json
import multiprocessing
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import index_cache
import jev_advisor as advisor
from retrieval import CandidateIndex


def catalog():
    return [dict(id='skill:alpha', name='alpha', kind='skill', description='Review supplied changes.',
                 skill_identity='alpha', bundle_sha256='a' * 64, explicit_only=False),
            dict(id='tool:records', name='mcp__atlas__read_records', kind='mcp_tool',
                 description='Read records from an existing service.')]


def none_response(_):
    return {'answers': {'mode': {'type': 'choice', 'choice': 'NONE'},
                        'primary': {'type': 'choice', 'choice': 'NONE'}}}


def concurrent_store(arguments):
    directory, number = arguments
    items = catalog()
    items[1]['description'] += ' revision ' + str(number)
    index, receipt = index_cache.get_or_build(items, directory=directory)
    return receipt, [item['id'] for item in index.search('records')]


@unittest.skipUnless(index_cache.supported(), 'private cache requires POSIX filesystem primitives')
class IndexCacheTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='jev-index-test-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.directory = self.root / 'cache'
        self.items = catalog()

    def build(self, items=None, **kwargs):
        return index_cache.get_or_build(self.items if items is None else items,
                                        directory=self.directory, **kwargs)

    def cold_file(self):
        index, receipt = self.build()
        self.assertEqual(receipt['write_status'], 'stored')
        path = self.directory / ('jev-index-' + receipt['key'] + '.json')
        return index, receipt, path

    def test_snapshot_roundtrip_and_policy_preserve_order_and_full_cards(self):
        self.items.extend([dict(id='tool:unicode', name='mcp__atlas__ÖffnenDatei', kind='mcp_tool',
                                description='Öffnen, öffnen, records and files.')])
        for policy in ('current', 'balanced'):
            cold, first = self.build(policy=policy)
            warm, second = self.build(copy.deepcopy(self.items), policy=policy)
            self.assertEqual(second['status'], 'hit')
            self.assertEqual(first['key'], second['key'])
            for query in ('Atlas records', 'ÖffnenDatei', 'unsupported words', 'alpha'):
                expected = CandidateIndex(self.items, policy=policy).search(query)
                self.assertEqual(warm.search(query), expected)
                self.assertEqual(cold.search(query), expected)

    def test_all_catalog_metadata_and_policy_invalidate_both_caches(self):
        kwargs = dict(index_cache_dir=self.directory, cache_dir=self.root / 'decisions', cache_scope='test')
        first = advisor.advise('Task', self.items, none_response, **kwargs)
        warm = advisor.advise('Task', self.items, none_response, **kwargs)
        self.assertEqual((warm['index_cache']['status'], warm['cache']['status']), ('hit', 'hit'))
        variants = [('description', 'Changed public description'), ('id', 'skill:changed'),
                    ('enabled', False), ('explicit_only', True), ('bundle_sha256', 'b' * 64),
                    ('input_schema', {'type': 'object', 'required': ['account']}),
                    ('use_when', ['Review code']), ('avoid_when', 'Requires a missing account'),
                    ('keywords', ['review']), ('parameter_descriptions', {'path': 'Supplied code path'}),
                    ('source_paths', ['/synthetic/skill/SKILL.md']), ('arbitrary_metadata', {'nested': [1, True]})]
        for field, value in variants:
            with self.subTest(field=field):
                changed = copy.deepcopy(self.items)
                changed[0][field] = value
                result = advisor.advise('Task', changed, none_response, **kwargs)
                self.assertNotEqual(result['index_cache']['key'], first['index_cache']['key'])
                self.assertNotEqual(result['cache']['key'], first['cache']['key'])
                self.assertEqual(result['request_count'], 1)
        changed = advisor.advise('Task', self.items, none_response, retrieval_policy='balanced', **kwargs)
        self.assertNotEqual(changed['index_cache']['key'], first['index_cache']['key'])
        self.assertNotEqual(changed['cache']['key'], first['cache']['key'])

    def test_runtime_fingerprint_and_schema_invalidate(self):
        _, first = self.build()
        previous = advisor._cache_key('Task', self.items, 'test', none_response)
        original = Path.read_bytes
        def changed(path):
            value = original(path)
            return value + b'\n# synthetic fingerprint change\n' if path.name == 'routing_metadata.py' else value
        with patch.object(Path, 'read_bytes', changed):
            _, modified = self.build()
            self.assertNotEqual(first['key'], modified['key'])
            self.assertNotEqual(previous, advisor._cache_key('Task', self.items, 'test', none_response))
        with patch.object(index_cache, 'SCHEMA', index_cache.SCHEMA + 1):
            _, modified = self.build()
            self.assertNotEqual(first['key'], modified['key'])

    def test_query_specific_alias_representatives_do_not_cross_contaminate(self):
        self.items.append(dict(self.items[0], id='skill:bundle:alpha', name='bundle:alpha'))
        def inspect(query):
            return advisor._prepare_candidates(query, self.items, index_cache_dir=self.directory)
        first, metadata = inspect('Use alpha')
        second, metadata2 = inspect('Use bundle:alpha')
        both, _ = inspect('Use alpha and bundle:alpha')
        repeated, metadata3 = inspect('Use alpha')
        self.assertEqual(first, repeated)
        self.assertEqual(metadata3['index_cache']['status'], 'hit')
        self.assertNotEqual(metadata['index_cache']['key'], metadata2['index_cache']['key'])
        self.assertIn('skill:bundle:alpha', {item['id'] for item in second})
        self.assertNotIn('skill:alpha', {item['id'] for item in second})
        self.assertTrue({'skill:alpha', 'skill:bundle:alpha'} <= {item['id'] for item in both})

    def test_structurally_corrupt_snapshots_with_matching_digest_rebuild(self):
        native, _, path = self.cold_file()
        record = json.loads(path.read_text())
        term = next(iter(record['snapshot']['postings']))
        gram = next(iter(record['snapshot']['gram_postings']))
        edits = {
            'unknown_field': lambda s: s.update(aliases={'foreign': ['provider']}),
            'missing_identifier_posting': lambda s: s['postings'].pop('alpha'),
            'bool_document_count': lambda s: s.update(document_count=True),
            'negative_index': lambda s: s['postings'][term][0].__setitem__(0, -1),
            'bool_index': lambda s: s['postings'][term][0].__setitem__(0, True),
            'out_of_range_index': lambda s: s['postings'][term][0].__setitem__(0, 999999),
            'bool_weight': lambda s: s['postings'][term][0].__setitem__(1, True),
            'zero_weight': lambda s: s['postings'][term][0].__setitem__(1, 0),
            'unbounded_weight': lambda s: s['postings'][term][0].__setitem__(1, 1e30),
            'duplicate_posting': lambda s: s['postings'][term].append(s['postings'][term][0]),
            'wrong_pair_type': lambda s: s['postings'].__setitem__(term, [{}]),
            'negative_gram_index': lambda s: s['gram_postings'][gram].__setitem__(0, -1),
            'duplicate_gram_posting': lambda s: s['gram_postings'][gram].append(s['gram_postings'][gram][0]),
            'bool_gram_weight': lambda s: s['gram_weights'].__setitem__(gram, True),
            'wrong_gram_weight': lambda s: s['gram_weights'].__setitem__(gram, 1000),
            'missing_gram_weight': lambda s: s['gram_weights'].pop(gram),
        }
        for name, edit in edits.items():
            with self.subTest(corruption=name):
                altered = copy.deepcopy(record)
                edit(altered['snapshot'])
                altered['digest'] = hashlib.sha256(index_cache.encode(altered['snapshot'])).hexdigest()
                path.write_bytes(index_cache.encode(altered))
                rebuilt, receipt = self.build()
                self.assertEqual(receipt['status'], 'invalid')
                self.assertEqual(rebuilt.search('records'), native.search('records'))
                self.assertEqual(receipt['write_status'], 'stored')

    def test_nonfinite_duplicate_json_deep_and_oversized_records_rebuild(self):
        _, _, path = self.cold_file()
        bodies = [b'{broken', b'{"schema":1,"schema":1}', b'{"value":NaN}',
                  b'{"value":Infinity}', b'{"value":1e9999}', b'[' * 2000 + b']' * 2000]
        for body in bodies:
            with self.subTest(body=body[:50]):
                path.write_bytes(body)
                _, receipt = self.build()
                self.assertEqual(receipt['status'], 'invalid')
        with path.open('r+b') as stream:
            stream.truncate(index_cache.MAX_BYTES + 1)
        _, receipt = self.build()
        self.assertEqual(receipt['status'], 'invalid')
        snapshot = CandidateIndex(self.items).snapshot()
        term = next(iter(snapshot['postings']))
        for value in (float('nan'), float('inf'), -float('inf')):
            changed = copy.deepcopy(snapshot)
            changed['postings'][term][0][1] = value
            with self.assertRaises(ValueError):
                CandidateIndex.from_snapshot(self.items, changed)

    def test_private_file_checks_and_symlink_target_protection(self):
        _, _, path = self.cold_file()
        original = path.read_bytes()
        path.chmod(0o644)
        _, receipt = self.build()
        self.assertEqual(receipt['status'], 'invalid')
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        victim = self.root / 'untouched.txt'
        victim.write_text('unchanged')
        path.unlink()
        path.symlink_to(victim)
        _, receipt = self.build()
        self.assertEqual(receipt['status'], 'unavailable')
        self.assertFalse(path.is_symlink())
        self.assertEqual(victim.read_text(), 'unchanged')
        path.write_bytes(original)
        original_fstat = os.fstat
        def foreign_file(fd):
            info = original_fstat(fd)
            if __import__('stat').S_ISREG(info.st_mode):
                values = list(info)
                values[4] = os.getuid() + 1
                return os.stat_result(values)
            return info
        with patch.object(index_cache.os, 'fstat', foreign_file):
            rebuilt, receipt = self.build()
            self.assertEqual(receipt['status'], 'invalid')
            self.assertEqual(receipt['write_status'], 'unavailable')
            self.assertEqual(rebuilt.search('records'), CandidateIndex(self.items).search('records'))

    def test_unavailable_directories_and_write_failures_fall_back(self):
        for shape in ('public', 'symlink', 'regular_file'):
            with self.subTest(shape=shape):
                target = self.root / shape
                if shape == 'public': target.mkdir(mode=0o755)
                elif shape == 'symlink': target.symlink_to(self.root, target_is_directory=True)
                else: target.write_text('untouched')
                result = advisor.advise('Task', self.items, none_response, index_cache_dir=target)
                self.assertEqual(result['status'], 'none')
                self.assertEqual(result['index_cache']['status'], 'unavailable')
        with patch.object(index_cache.os, 'replace', side_effect=PermissionError('private details')):
            result = advisor.advise('Task', self.items, none_response, index_cache_dir=self.directory)
            self.assertEqual(result['status'], 'none')
            self.assertEqual(result['index_cache']['write_status'], 'unavailable')
            self.assertNotIn('private details', json.dumps(result))
        self.assertEqual(list(self.directory.glob('.jev-index-tmp-*')), [])

    def test_entry_and_total_byte_eviction_preserve_unrelated_files(self):
        self.directory.mkdir(mode=0o700)
        unrelated = self.directory / 'keep.txt'
        unrelated.write_text('preserved')
        cache = index_cache.IndexCache(self.directory)
        snapshot = CandidateIndex(self.items).snapshot()
        sample = index_cache.encode({'schema': index_cache.SCHEMA, 'key': 'a' * 64,
                                     'snapshot': snapshot, 'digest': hashlib.sha256(index_cache.encode(snapshot)).hexdigest()})
        with patch.object(index_cache, 'MAX_ENTRIES', 3), patch.object(index_cache, 'MAX_TOTAL_BYTES', len(sample) * 2):
            for number in range(7):
                self.assertEqual(cache.store(format(number, '064x'), snapshot), 'stored')
            entries = list(self.directory.glob('jev-index-*.json'))
            self.assertLessEqual(len(entries), 2)
            self.assertLessEqual(sum(path.stat().st_size for path in entries), len(sample) * 2)
        self.assertEqual(unrelated.read_text(), 'preserved')

    def test_multiple_processes_never_publish_partial_or_unbounded_snapshots(self):
        # The POSIX-only cache uses fork directly; Python's newer forkserver
        # default needs a listening socket unavailable in restricted runners.
        with ProcessPoolExecutor(max_workers=4, mp_context=multiprocessing.get_context('fork')) as pool:
            results = list(pool.map(concurrent_store, [(str(self.directory), i) for i in range(24)]))
        self.assertTrue(all(ids for _, ids in results))
        self.assertTrue(all(receipt.get('write_status') in ('stored', 'unavailable') for receipt, _ in results))
        entries = list(self.directory.glob('jev-index-*.json'))
        self.assertLessEqual(len(entries), index_cache.MAX_ENTRIES)
        self.assertLessEqual(sum(path.stat().st_size for path in entries), index_cache.MAX_TOTAL_BYTES)
        self.assertEqual(list(self.directory.glob('.jev-index-tmp-*')), [])
        for path in entries:
            record = json.loads(path.read_text())
            self.assertEqual(record['digest'], hashlib.sha256(index_cache.encode(record['snapshot'])).hexdigest())

    def test_cli_offline_optin_cache_uses_no_key_or_network(self):
        source = self.root / 'catalog.json'
        source.write_text(json.dumps(self.items))
        environment = {'PATH': os.environ.get('PATH', ''), 'PYTHONDONTWRITEBYTECODE': '1'}
        command = [sys.executable, '-B', str(SCRIPTS / 'jev_advisor.py'), '--catalog', str(source),
                   '--query', 'records', '--offline-candidates', '--key-file', str(self.root / 'must-not-exist')]
        first = subprocess.run(command, env=environment, text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(first.stdout)['index_cache']['status'], 'disabled')
        self.assertFalse(self.directory.exists())
        for expected in ('miss', 'hit'):
            process = subprocess.run(command + ['--index-cache-dir', str(self.directory)], env=environment,
                                     text=True, capture_output=True, check=True)
            result = json.loads(process.stdout)
            self.assertEqual(result['index_cache']['status'], expected)
            self.assertEqual(result['request_count'], 0)


class PortableFallbackTests(unittest.TestCase):
    def test_unsupported_cache_platform_preserves_uncached_core(self):
        with tempfile.TemporaryDirectory(prefix='jev-index-unsupported-') as directory:
            destination = Path(directory) / 'cache'
            with patch.object(index_cache, 'fcntl', None):
                result = advisor.advise('Task', catalog(), none_response, index_cache_dir=destination)
            self.assertEqual(result['status'], 'none')
            self.assertEqual(result['index_cache']['status'], 'unavailable')
            self.assertFalse(destination.exists())

    def test_no_cache_option_does_not_touch_index_filesystem(self):
        with patch.object(index_cache.IndexCache, 'load', side_effect=AssertionError('cache read')):
            with patch.object(index_cache.IndexCache, 'store', side_effect=AssertionError('cache write')):
                result = advisor.advise('Task', catalog(), none_response)
        self.assertEqual(result['status'], 'none')
        self.assertEqual(result['index_cache']['status'], 'disabled')


if __name__ == '__main__':
    unittest.main()
