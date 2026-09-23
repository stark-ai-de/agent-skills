#!/usr/bin/env python3
"""Offline session/protocol tests using the installed transport and advisor."""
from contextlib import ExitStack
import io
import json
import os
from pathlib import Path
import socket
import ssl
import sys
import time
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import https_transport as transport
import jev_session as session_module
KEY = 'synthetic-session-test-credential'


def frame(identifier='task-1', query='Perform the current immediate work.', name='one'):
    return {'id': identifier, 'query': query, 'catalog': [
        {'id': 'skill:' + name, 'name': name, 'kind': 'skill', 'description': 'Synthetic available capability.'}]}


def choice(mode='SINGLE', primary='c000'):
    return {'answers': {'mode': {'type': 'choice', 'choice': mode},
                         'primary': {'type': 'choice', 'choice': primary}}}


class FakeContext:
    check_hostname = True
    verify_mode = ssl.CERT_REQUIRED
    def set_alpn_protocols(self, values):
        assert values == ['http/1.1']


class FakeResponse:
    status, will_close = 200, False
    def __init__(self, result):
        self.raw = io.BytesIO(json.dumps(result).encode()); self.length = len(self.raw.getvalue())
    def read1(self, maximum):
        value = self.raw.read(maximum); self.length -= len(value); return value
    def close(self):
        self.raw.close()


class FakeConnection:
    created, payloads, outcomes = [], [], []
    def __init__(self, context, deadline):
        self.created.append(self); self.sock = None; self.closed = False
    def connect(self):
        self.sock = object()
    def use_deadline(self, deadline):
        assert deadline > time.monotonic() and self.sock is not None
    def request(self, method, path, body, headers):
        assert method == 'POST' and path == transport.API_PATH
        assert headers['Authorization'] == 'Bearer ' + KEY
        self.payloads.append(json.loads(body))
        if self.outcomes and isinstance(self.outcomes[0], Exception):
            raise self.outcomes.pop(0)
    def getresponse(self):
        return FakeResponse(self.outcomes.pop(0) if self.outcomes else choice())
    def close(self):
        self.sock = None; self.closed = True


class SessionTests(unittest.TestCase):
    def setUp(self):
        FakeConnection.created, FakeConnection.payloads, FakeConnection.outcomes = [], [], []
        self.stack = ExitStack()
        self.stack.enter_context(patch.object(transport, '_Connection', FakeConnection))
        self.stack.enter_context(patch.object(ssl, 'create_default_context', FakeContext))
        self.stack.enter_context(patch.object(urllib.request, 'getproxies', return_value={}))
        self.stack.enter_context(patch.object(socket, 'socket', side_effect=AssertionError('network forbidden')))
        self.loads = 0
        def load_key():
            self.loads += 1
            return KEY
        self.owner = session_module.AdvisorSession(key_loader=load_key)

    def tearDown(self):
        self.owner.close(); self.stack.close()

    def test_distinct_frames_reuse_one_real_jsonclient_without_catalog_cache(self):
        a = self.owner.recommend(frame('first', 'First synthetic task.', 'one'))
        b = self.owner.recommend(frame('second', 'Different second synthetic task.', 'two'))
        self.assertEqual(a['selected'], ['skill:one'])
        self.assertEqual(b['selected'], ['skill:two'])
        self.assertEqual(self.loads, 1)
        self.assertEqual(len(FakeConnection.created), 1)
        self.assertNotIn('one', json.dumps(FakeConnection.payloads[1]['state']['available_capabilities']))
        self.assertIn('two', json.dumps(FakeConnection.payloads[1]['state']['available_capabilities']))
        self.assertNotEqual(FakeConnection.payloads[0]['state']['query'], FakeConnection.payloads[1]['state']['query'])
        self.assertTrue(self.owner._client.last_receipt['connection_reused'])
        self.assertFalse(any(name in vars(self.owner) for name in ('query', 'catalog', 'result', 'history')))

    def test_summary_preserves_truncated_none_scope_and_fresh_coverage(self):
        request = frame()
        request['catalog'] = [
            {'id': 'skill:item-%03d' % i, 'name': 'item-%03d' % i, 'kind': 'skill',
             'description': 'Read a synthetic resource.'} for i in range(300)]
        FakeConnection.outcomes = [choice('NONE', 'NONE'), choice('NONE', 'NONE')]
        first = self.owner.recommend(request)
        self.assertEqual((first['status'], first['candidate_count'], first['eligible_count'],
                          first['represented_count'], first['catalog_truncated'], first['none_scope']),
                         ('none', 240, 300, 240, True, 'retrieved_candidates'))
        second = self.owner.recommend(frame('task-2'))
        self.assertEqual((second['status'], second['eligible_count'], second['candidate_count'],
                          second['catalog_truncated']), ('none', 1, 1, False))
        self.assertNotIn('description', json.dumps(second))

    def test_inconsistent_coverage_cannot_claim_complete_advice(self):
        original = session_module.jev_advisor.advise
        def forged(query, catalog, transport):
            result = original(query, catalog, transport)
            result['represented_count'] = result['eligible_count'] + 1
            return result
        with session_module.AdvisorSession(key_loader=lambda: KEY, advisor=forged) as owner:
            result = owner.recommend(frame())
        self.assertEqual((result['status'], result['error'], result['selected']),
                         ('error', 'advisor_invalid_reply', []))
        self.assertIsNone(result['catalog_truncated'])

    def test_empty_and_disabled_catalogs_never_load_key(self):
        empty = frame(); empty['catalog'] = []
        self.assertEqual(self.owner.recommend(empty)['status'], 'none')
        disabled = frame(); disabled['catalog'][0]['enabled'] = False
        self.assertEqual(self.owner.recommend(disabled)['status'], 'none')
        self.assertEqual(self.loads, 0)
        self.assertEqual(FakeConnection.created, [])

    def test_error_closes_client_and_next_frame_starts_fresh(self):
        FakeConnection.outcomes = [choice(), urllib.error.HTTPError(transport.ENDPOINT, 401, KEY, None, None), choice()]
        self.assertEqual(self.owner.recommend(frame('first'))['status'], 'selected')
        result = self.owner.recommend(frame('failure'))
        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['error'], 'http_401')
        self.assertIsNone(self.owner._client)
        self.assertTrue(FakeConnection.created[0].closed)
        self.assertEqual(self.owner.recommend(frame('after'))['status'], 'selected')
        self.assertEqual(len(FakeConnection.created), 2)
        self.assertEqual(self.loads, 2)
        self.assertNotIn(KEY, json.dumps(result))

    def test_original_triple_protocol_uses_one_connection_with_three_calls(self):
        request = frame()
        request['catalog'] += frame(name='two')['catalog'] + frame(name='three')['catalog']
        FakeConnection.outcomes = [choice('TRIPLE'), {'answers': {'next': {'type': 'choice', 'choice': 'c000'}}},
                                    {'answers': {'next': {'type': 'choice', 'choice': 'c000'}}}]
        result = self.owner.recommend(request)
        self.assertEqual(result['status'], 'selected')
        self.assertEqual(set(result['selected']), {'skill:one', 'skill:two', 'skill:three'})
        self.assertEqual(result['request_count'], 3)
        self.assertEqual(result['transport_call_count'], 3)
        self.assertEqual(len(FakeConnection.created), 1)
        self.assertEqual([len(p['state']['available_capabilities']) for p in FakeConnection.payloads], [3, 2, 1])

    def test_advisor_cannot_exceed_its_request_cap(self):
        def excessive(query, catalog, request):
            for _ in range(4): request({'synthetic': True})
        with session_module.AdvisorSession(key_loader=lambda: KEY, advisor=excessive) as owner:
            result = owner.recommend(frame())
            self.assertEqual(result['error'], 'advisor_invalid_reply')
            self.assertEqual(result['transport_call_count'], 3)
            self.assertEqual(len(FakeConnection.payloads), 3)

    def test_summary_never_echoes_query_paths_receipts_or_headers(self):
        request = frame(query='Unique private task content stays out of the reply.')
        request['catalog'][0]['source_paths'] = ['/__synthetic_path__/source.md']
        result = self.owner.recommend(request)
        rendered = json.dumps(result)
        for value in (request['query'], '/__synthetic_path__/', KEY, 'Authorization', 'available_capabilities', 'requests'):
            self.assertNotIn(value, rendered)
        self.assertEqual(set(result), {'id', 'status', 'mode', 'selected', 'provisional_selected', 'request_count',
                                      'transport_call_count', 'elapsed_ms', 'stopped_reason', 'error',
                                      'candidate_count', 'eligible_count', 'represented_count',
                                      'catalog_truncated', 'none_scope'})

    def test_strict_schema_and_inventory_reject_before_key_access(self):
        bad = [None, [], {'id': 'ok', 'query': 'task'}, frame(identifier='../bad'), frame(identifier='a' * 81),
               frame(query=' '), frame(query='x' * 16_001)]
        extra = frame(); extra['ignored'] = True; bad.append(extra)
        duplicate = frame(); duplicate['catalog'] *= 2; bad.append(duplicate)
        unknown = frame(); unknown['catalog'][0]['unknown_field'] = 'x'; bad.append(unknown)
        metadata = frame(); metadata['catalog'][0]['avoid_when'] = [42]; bad.append(metadata)
        for item in bad:
            with self.subTest(item=type(item).__name__):
                result = self.owner.recommend(item)
                self.assertEqual(result['status'], 'error')
                self.assertFalse(result['selected'])
        self.assertEqual(self.loads, 0)

    def test_current_catalog_membership_and_complete_cardinality_are_validated(self):
        for fake in ({'status': 'selected', 'mode': 'SINGLE', 'selected': ['skill:old']},
                     {'status': 'selected', 'mode': 'PAIR', 'selected': ['skill:one']},
                     {'status': 'none', 'mode': 'NONE', 'selected': ['skill:one']}):
            with session_module.AdvisorSession(advisor=lambda *a, fake=fake: fake) as owner:
                self.assertEqual(owner.recommend(frame())['error'], 'advisor_invalid_reply')

    def test_one_budget_spans_preparation_and_multiple_calls(self):
        clock = [100.0]
        observed = []
        class Client:
            def __init__(self, key, timeout_seconds): self.closed = False
            def __call__(self, payload, timeout_seconds):
                observed.append(timeout_seconds); clock[0] += .3; return {}
            def close(self): self.closed = True
        def advisor(query, catalog, request):
            clock[0] += .2
            request({}); request({})
            clock[0] += .3
            return {'status': 'selected', 'mode': 'SINGLE', 'selected': ['skill:one'], 'request_count': 2}
        with patch.object(time, 'monotonic', side_effect=lambda: clock[0]):
            with session_module.AdvisorSession(total_budget_seconds=1, client_factory=Client,
                    key_loader=lambda: KEY, advisor=advisor) as owner:
                reply = owner.recommend(frame())
                self.assertEqual(reply['error'], 'recommendation_budget_exhausted')
                self.assertEqual(reply['selected'], [])
                self.assertEqual(reply['transport_call_count'], 2)
                self.assertIsNone(owner._client)
        self.assertAlmostEqual(observed[0], .8)
        self.assertAlmostEqual(observed[1], .5)

    def test_preparation_exhaustion_prevents_key_load(self):
        clock = [100.0]
        def advisor(query, catalog, request):
            clock[0] += 9
            request({})
        with patch.object(time, 'monotonic', side_effect=lambda: clock[0]), patch.object(self.owner, '_advisor', advisor):
            reply = self.owner.recommend(frame())
        self.assertEqual(reply['error'], 'recommendation_budget_exhausted')
        self.assertEqual(self.loads, 0)

    def test_cli_eof_closes_reused_connection(self):
        data = b''.join((json.dumps(item) + '\n').encode() for item in (frame('first'), frame('second', name='two')))
        output = io.BytesIO()
        self.assertEqual(session_module.serve(io.BytesIO(data), output, self.owner), 0)
        rows = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([row['id'] for row in rows], ['first', 'second'])
        self.assertEqual(len(FakeConnection.created), 1)
        self.assertTrue(FakeConnection.created[0].closed)
        self.assertTrue(self.owner._closed)

    def test_cli_main_runs_binary_ndjson_and_closes_at_eof(self):
        source = io.TextIOWrapper(io.BytesIO((json.dumps(frame('cli')) + '\n').encode()))
        sink = io.TextIOWrapper(io.BytesIO())
        with patch.object(sys, 'stdin', source), patch.object(sys, 'stdout', sink), \
                patch.dict(os.environ, {'TYPESAFE_API_KEY': KEY}, clear=True):
            code = session_module.main([])
            output = json.loads(sink.buffer.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual(output['id'], 'cli')
        self.assertEqual(output['status'], 'selected')
        self.assertTrue(FakeConnection.created[0].closed)
        source.close(); sink.close()

    def test_bad_json_followed_by_valid_frame_closes_then_recovers(self):
        valid = (json.dumps(frame()) + '\n').encode()
        data = valid + b'{"id":"wrong","id":"duplicate"}\n' + b'{"catalog": NaN}\n' + b'\xff\n' + valid
        output = io.BytesIO()
        self.assertEqual(session_module.serve(io.BytesIO(data), output, self.owner), 0)
        rows = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([row['status'] for row in rows], ['selected', 'error', 'error', 'error', 'selected'])
        self.assertEqual([row['error'] for row in rows[1:4]], ['invalid_json'] * 3)
        self.assertEqual(len(FakeConnection.created), 2)

    def test_oversized_frame_is_bounded_before_decode_and_stops(self):
        limit = session_module.MAX_FRAME_BYTES
        source = io.BytesIO(b'x' * (limit + 50) + b'\n' + (json.dumps(frame()) + '\n').encode())
        output = io.BytesIO()
        with patch.object(session_module, 'decode_frame', side_effect=AssertionError('must not decode oversize')):
            self.assertEqual(session_module.serve(source, output, self.owner), 2)
        self.assertEqual(source.tell(), limit + 1)
        self.assertEqual(json.loads(output.getvalue())['error'], 'frame_too_large')
        self.assertEqual(self.loads, 0)

    def test_broken_pipe_and_cancellation_close_client(self):
        class Broken(io.BytesIO):
            def write(self, value): raise BrokenPipeError(KEY)
        source = io.BytesIO((json.dumps(frame()) + '\n').encode())
        with self.assertRaises(BrokenPipeError):
            session_module.serve(source, Broken(), self.owner)
        self.assertTrue(self.owner._closed)
        self.assertTrue(FakeConnection.created[0].closed)
        def cancel(*args): raise KeyboardInterrupt()
        with session_module.AdvisorSession(advisor=cancel) as owner:
            with self.assertRaises(KeyboardInterrupt): owner.recommend(frame())
            self.assertTrue(owner._closed)

    def test_lazy_default_environment_and_bounded_key_file_read(self):
        with patch.dict(os.environ, {}, clear=True):
            with session_module.AdvisorSession() as owner:
                empty = frame(); empty['catalog'] = []
                self.assertEqual(owner.recommend(empty)['status'], 'none')
                self.assertEqual(owner.recommend(frame())['error'], 'credential_unavailable')
        with patch.dict(os.environ, {'TYPESAFE_API_KEY': KEY}, clear=True):
            with session_module.AdvisorSession() as owner:
                self.assertEqual(owner.recommend(frame())['status'], 'selected')
        stream = io.BytesIO((KEY + '\n').encode())
        original_open = Path.open
        key_reads = []
        def open_fixture_or_source(path, *args, **kwargs):
            if path == Path('synthetic-key-fixture'):
                key_reads.append((args, kwargs))
                return stream
            return original_open(path, *args, **kwargs)
        # Runtime fingerprints read source files too; intercept only the key.
        with patch.object(Path, 'open', autospec=True, side_effect=open_fixture_or_source):
            with session_module.AdvisorSession(key_file=Path('synthetic-key-fixture')) as owner:
                self.assertEqual(owner.recommend(frame())['status'], 'selected')
                self.assertEqual(owner.recommend(frame())['status'], 'selected')
                self.assertEqual(key_reads, [(('rb',), {})])
        with patch.object(Path, 'open', return_value=io.BytesIO(b'x' * 8193)):
            self.assertRaises(session_module.SessionError, session_module._load_key, Path('synthetic-key-fixture'))

    def test_sessions_do_not_share_credentials_or_clients(self):
        self.owner.recommend(frame())
        with session_module.AdvisorSession(key_loader=lambda: KEY) as other:
            other.recommend(frame())
            self.assertIsNot(self.owner._client, other._client)
            self.assertEqual(len(FakeConnection.created), 2)


if __name__ == '__main__':
    unittest.main()
