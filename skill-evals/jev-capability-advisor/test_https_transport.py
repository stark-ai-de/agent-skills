"""Offline session transport boundaries; synthetic credentials and HTTP bytes only."""
from collections import deque
import http.client
import io
import json
import socket
import ssl
import sys
import time
import traceback
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import https_transport as transport


KEY = 'synthetic-test-credential-not-real'
OTHER_KEY = 'second-synthetic-test-credential'
PROXY_PASSWORD = 'synthetic-proxy-password'


def response(body=b'{"ok":true}', *, status=200, framing='length', declared=None,
             close=False, headers=()):
    lines = [f'HTTP/1.1 {status} Fixture']
    if framing == 'length':
        lines.append(f'Content-Length: {len(body) if declared is None else declared}')
    elif framing == 'chunked':
        lines.append('Transfer-Encoding: chunked')
        body = f'{len(body):x}\r\n'.encode() + body + b'\r\n0\r\n\r\n'
    lines.append('Connection: ' + ('close' if close else 'keep-alive'))
    lines.extend(headers)
    return ('\r\n'.join(lines) + '\r\n\r\n').encode() + body


class FixtureSocket:
    """Replace only socket I/O; HTTPConnection and HTTPResponse remain real."""
    def __init__(self, replies):
        self.replies = replies
        self.sent = []
        self.send_attempts = 0
        self.timeouts = []
        self.options = []
        self.files = []
        self.closed = False
        self.send_error = None

    def setsockopt(self, *args):
        self.options.append(args)

    def settimeout(self, value):
        if value <= 0:
            raise AssertionError('nonpositive socket budget')
        self.timeouts.append(value)

    def sendall(self, data):
        self.send_attempts += 1
        if self.send_error is not None:
            raise self.send_error
        self.sent.append(bytes(data))

    def makefile(self, mode='rb', buffering=0):
        if mode != 'rb' or buffering != 0:
            raise AssertionError('unexpected socket file mode')
        item = self.replies.popleft()
        raw = item() if callable(item) else io.BytesIO(item)
        self.files.append(raw)
        return raw

    def close(self):
        self.closed = True

    def requests(self):
        """Decode the actual wire requests, including each distinct JSON body."""
        pending = b''.join(self.sent)
        result = []
        while pending:
            header, pending = pending.split(b'\r\n\r\n', 1)
            first, *fields = header.decode().split('\r\n')
            headers = dict(field.split(': ', 1) for field in fields)
            length = int(headers['Content-Length'])
            body, pending = pending[:length], pending[length:]
            result.append((first, headers, json.loads(body)))
        return result


class FixtureContext:
    check_hostname = True
    verify_mode = ssl.CERT_REQUIRED

    def __init__(self, harness):
        self.harness = harness
        self.alpn = None
        self.wrap_calls = []
        self.wrap_error = None

    def set_alpn_protocols(self, protocols):
        self.alpn = protocols

    def wrap_socket(self, sock, server_hostname):
        self.wrap_calls.append((sock, server_hostname, sock.timeouts[-1]))
        self.harness.clock += self.harness.tls_delay
        if self.wrap_error is not None:
            raise self.wrap_error
        return sock


class HttpsTransportTests(unittest.TestCase):
    def setUp(self):
        self.replies = deque()
        self.sockets = []
        self.contexts = []
        self.tcp_calls = []
        self.clock = 100.0
        self.tcp_delay = 0.0
        self.tls_delay = 0.0
        self.patch(socket, 'create_connection', side_effect=self.connect)
        self.patch(ssl, 'create_default_context', side_effect=self.context)
        self.patch(urllib.request, 'getproxies', return_value={})
        self.patch(time, 'monotonic', side_effect=lambda: self.clock)

    def patch(self, target, name, **kwargs):
        patcher = patch.object(target, name, **kwargs)
        self.addCleanup(patcher.stop)
        return patcher.start()

    def context(self):
        context = FixtureContext(self)
        self.contexts.append(context)
        return context

    def connect(self, address, timeout, source_address=None):
        self.assertEqual(address, (transport.HOST, transport.PORT))
        self.assertIsNone(source_address)
        self.tcp_calls.append((address, timeout))
        self.clock += self.tcp_delay
        sock = FixtureSocket(self.replies)
        self.sockets.append(sock)
        return sock

    def client(self, key=KEY, **kwargs):
        client = transport.JsonClient(key, **kwargs)
        self.addCleanup(client.close)
        return client

    def assert_safe_failure(self, client, kind, payload=None, **kwargs):
        try:
            client({'fixture': True} if payload is None else payload, **kwargs)
        except kind as error:
            rendered = ''.join(traceback.format_exception(error))
            if isinstance(error, urllib.error.HTTPError):
                # HTTPError is also a response; the caller owns this safe copy.
                error.close()
            for secret in (KEY, OTHER_KEY, PROXY_PASSWORD):
                self.assertNotIn(secret, rendered)
                self.assertNotIn(secret, repr(client))
                self.assertNotIn(secret, json.dumps(client.last_receipt))
            self.assertIsNone(client._connection)
            return error
        self.fail(f'expected {kind.__name__}')

    def test_tls_is_lazy_and_repr_never_contains_credential(self):
        client = self.client()
        self.assertNotIn(KEY, repr(client))
        self.assertEqual(self.contexts, [])
        self.assertEqual(self.sockets, [])
        client.close()
        self.assertNotIn(KEY, repr(client))
        self.assertEqual(self.contexts, [])

    def test_distinct_posts_reuse_one_connection_and_verified_context(self):
        payloads = [{'sequence': 1}, {'sequence': 2}, {'unicode': 'Grüße'}]
        self.replies.extend(response() for _ in payloads)
        client = self.client()
        receipts = []
        for payload in payloads:
            self.assertEqual(client(payload), {'ok': True})
            receipts.append(dict(client.last_receipt))
        self.assertEqual(len(self.sockets), 1)
        self.assertEqual(len(self.contexts), 1)
        self.assertEqual(self.contexts[0].alpn, ['http/1.1'])
        self.assertEqual(self.contexts[0].wrap_calls[0][1], transport.HOST)
        requests = self.sockets[0].requests()
        self.assertEqual([request[2] for request in requests], payloads)
        self.assertTrue(all(request[0] == 'POST /v1/systemone HTTP/1.1' for request in requests))
        self.assertTrue(all(request[1]['Authorization'] == 'Bearer ' + KEY for request in requests))
        self.assertEqual([item['connection_state'] for item in receipts], ['cold', 'reused', 'reused'])
        self.assertEqual([item['tls_context_reused'] for item in receipts], [False, True, True])
        self.assertNotIn(KEY, json.dumps(receipts))

    def test_credentials_connections_and_contexts_are_isolated_per_instance(self):
        self.replies.extend([response(), response(), response()])
        first, second = self.client(), self.client(OTHER_KEY)
        first({'client': 1})
        second({'client': 2})
        self.assertIsNot(first._context, second._context)
        self.assertIsNot(first._connection, second._connection)
        first.close()
        self.assertTrue(self.sockets[0].closed)
        self.assertFalse(self.sockets[1].closed)
        self.assertEqual(second({'client': 2, 'again': True}), {'ok': True})
        self.assertEqual(len(self.sockets), 2)
        self.assertEqual(self.sockets[0].requests()[0][1]['Authorization'], 'Bearer ' + KEY)
        self.assertTrue(all(item[1]['Authorization'] == 'Bearer ' + OTHER_KEY
                            for item in self.sockets[1].requests()))

    def test_stale_send_fails_once_and_only_next_explicit_call_reconnects(self):
        self.replies.append(response())
        client = self.client()
        client({'first': True})
        stale = self.sockets[0]
        stale.send_error = BrokenPipeError(KEY)
        attempts = stale.send_attempts
        self.assert_safe_failure(client, urllib.error.URLError)
        self.assertEqual(stale.send_attempts, attempts + 1)
        self.assertEqual(len(self.sockets), 1)
        self.assertTrue(stale.closed)
        self.replies.append(response())
        client({'explicit_next_call': True})
        self.assertEqual(len(self.sockets), 2)
        self.assertEqual(len(self.contexts), 1)
        self.assertEqual(client.last_receipt['connection_state'], 'cold')
        self.assertTrue(client.last_receipt['tls_context_reused'])

    def test_stale_peer_eof_after_post_does_not_replay(self):
        self.replies.extend([response(), b''])
        client = self.client()
        client({'first': True})
        self.assert_safe_failure(client, urllib.error.URLError, {'second': True})
        self.assertEqual(len(self.sockets), 1)
        self.assertEqual(len(self.sockets[0].requests()), 2)
        self.assertTrue(self.sockets[0].closed)

    def test_connection_close_consumes_body_and_next_call_is_cold(self):
        self.replies.extend([response(close=True), response()])
        client = self.client()
        self.assertEqual(client({'close': True}), {'ok': True})
        self.assertIsNone(client._connection)
        self.assertTrue(self.sockets[0].closed)
        self.assertTrue(all(file.closed for file in self.sockets[0].files))
        client({'next': True})
        self.assertEqual(len(self.sockets), 2)
        self.assertEqual(client.last_receipt['connection_state'], 'cold')

    def test_eof_framed_body_is_complete_and_connection_is_discarded(self):
        self.replies.append(response(framing='eof'))
        client = self.client()
        self.assertEqual(client({'eof': True}), {'ok': True})
        self.assertIsNone(client._connection)
        self.assertTrue(self.sockets[0].closed)

    def test_idle_expiry_replaces_connection_but_reuses_tls_context(self):
        self.replies.extend([response(), response()])
        client = self.client(idle_timeout_seconds=2)
        client({'first': True})
        self.clock += 2
        client({'after_idle': True})
        self.assertTrue(self.sockets[0].closed)
        self.assertEqual(len(self.sockets), 2)
        self.assertEqual(len(self.contexts), 1)
        self.assertEqual(client.last_receipt['connection_state'], 'cold')

    def test_non_success_status_never_redirects_or_retries(self):
        for status in (302, 307, 401, 500):
            with self.subTest(status=status):
                self.replies.append(response(KEY.encode(), status=status,
                    headers=('Location: https://elsewhere.invalid/' + KEY,)))
                client = self.client()
                before = len(self.sockets)
                error = self.assert_safe_failure(client, urllib.error.HTTPError)
                self.assertEqual(error.code, status)
                self.assertEqual(error.url, transport.ENDPOINT)
                self.assertEqual(client.last_receipt['error'], f'http_{status}')
                self.assertEqual(len(self.sockets), before + 1)
                self.assertEqual(len(self.sockets[-1].requests()), 1)
                self.assertTrue(self.sockets[-1].closed)

    def test_response_at_byte_limit_succeeds_for_length_and_chunked_framing(self):
        self.patch(transport, 'MAX_RESPONSE_BYTES', new=64)
        body = json.dumps('x' * 62).encode()
        for framing in ('length', 'chunked'):
            with self.subTest(framing=framing):
                self.replies.append(response(body, framing=framing))
                client = self.client()
                self.assertEqual(client({'bounded': True}), 'x' * 62)
                self.assertEqual(client.last_receipt['response_bytes'], 64)

    def test_oversized_bodies_fail_at_limit_plus_one_and_drop_connection(self):
        self.patch(transport, 'MAX_RESPONSE_BYTES', new=64)
        for framing in ('length', 'chunked', 'eof'):
            with self.subTest(framing=framing):
                self.replies.append(response(b'x' * 1000, framing=framing))
                client = self.client()
                error = self.assert_safe_failure(client, ValueError)
                self.assertEqual(str(error), 'response_too_large')
                self.assertEqual(client.last_receipt['response_bytes'], 65)
                self.assertTrue(self.sockets[-1].closed)

    def test_truncated_length_and_chunked_bodies_fail_closed(self):
        incomplete = [response(b'{"ok":true}', declared=40),
            b'HTTP/1.1 200 Fixture\r\nTransfer-Encoding: chunked\r\n\r\n20\r\npartial']
        for wire in incomplete:
            with self.subTest(wire=wire):
                self.replies.append(wire)
                client = self.client()
                self.assert_safe_failure(client, urllib.error.URLError)
                self.assertTrue(self.sockets[-1].closed)
                self.assertEqual(len(self.sockets[-1].requests()), 1)

    def test_invalid_json_and_utf8_do_not_leak_server_echoes(self):
        for body in (KEY.encode(), b'\xff' + KEY.encode()):
            with self.subTest(body=body):
                self.replies.append(response(body))
                error = self.assert_safe_failure(self.client(), ValueError)
                self.assertEqual(str(error), 'invalid_response_json')
                self.assertTrue(self.sockets[-1].closed)

    def test_invalid_or_oversized_payload_is_rejected_before_tls_or_post(self):
        for payload in ({'value': float('nan')}, {'value': object()}, {'value': '\ud800'},
                        {'value': 'x' * transport.MAX_REQUEST_BYTES}):
            with self.subTest(payload_type=type(payload['value']).__name__):
                client = self.client()
                self.assert_safe_failure(client, ValueError, payload)
                self.assertFalse(client.last_receipt['request_dispatched'])
        self.assertEqual(self.sockets, [])
        self.assertEqual(self.contexts, [])

    def test_tcp_nodelay_is_retained_and_tls_gets_only_remaining_total_budget(self):
        self.replies.append(response())
        self.tcp_delay, self.tls_delay = 2, 3
        client = self.client(timeout_seconds=6)
        self.assertEqual(client({'budget': True}), {'ok': True})
        self.assertEqual(self.tcp_calls[0][1], 6)
        self.assertEqual(self.contexts[0].wrap_calls[0][2], 4)
        self.assertIn((socket.IPPROTO_TCP, socket.TCP_NODELAY, 1), self.sockets[0].options)
        self.assertTrue(all(timeout <= 1 for timeout in self.sockets[0].timeouts[1:]))
        self.assertEqual(client.last_receipt['elapsed_ms'], 5000)

    def test_tls_exhausting_remaining_budget_closes_socket_before_post(self):
        self.tcp_delay, self.tls_delay = 1, 1.5
        client = self.client(timeout_seconds=2)
        error = self.assert_safe_failure(client, TimeoutError)
        self.assertEqual(str(error), 'request_timeout')
        self.assertEqual(self.contexts[0].wrap_calls[0][2], 1)
        self.assertEqual(self.sockets[0].send_attempts, 0)
        self.assertTrue(self.sockets[0].closed)
        self.assertFalse(client.last_receipt['request_dispatched'])

    def test_failed_tls_handshake_closes_owned_tcp_socket_and_sanitizes_error(self):
        context = self.context()
        context.wrap_error = ssl.SSLError(KEY)
        self.patch(ssl, 'create_default_context', return_value=context)
        client = self.client()
        self.assert_safe_failure(client, urllib.error.URLError)
        self.assertTrue(self.sockets[0].closed)
        self.assertEqual(self.sockets[0].send_attempts, 0)
        self.assertFalse(client.last_receipt['request_dispatched'])

    def test_unverified_tls_context_is_rejected_before_tcp(self):
        for field, value in (('check_hostname', False), ('verify_mode', ssl.CERT_NONE)):
            with self.subTest(field=field):
                context = self.context()
                setattr(context, field, value)
                with patch.object(ssl, 'create_default_context', return_value=context):
                    error = self.assert_safe_failure(self.client(), ValueError)
                    self.assertEqual(str(error), 'unverified_tls_context')
        self.assertEqual(self.sockets, [])

    def test_trickled_header_uses_one_absolute_deadline(self):
        harness = self
        wire = response()

        class Trickle(io.RawIOBase):
            position = 0

            def readable(self):
                return True

            def readinto(self, buffer):
                harness.clock += .25
                buffer[0] = wire[self.position]
                self.position += 1
                return 1

        self.replies.append(Trickle)
        client = self.client(timeout_seconds=1)
        self.assert_safe_failure(client, TimeoutError)
        self.assertEqual(self.clock, 101)
        self.assertTrue(self.sockets[0].closed)
        self.assertEqual(len(self.sockets[0].requests()), 1)

    def test_per_call_timeout_replaces_budget_on_reused_socket(self):
        self.replies.extend([response(), response()])
        client = self.client(timeout_seconds=30)
        client({'first': True})
        previous = len(self.sockets[0].timeouts)
        client({'shorter': True}, timeout_seconds=.5)
        self.assertEqual(len(self.sockets), 1)
        self.assertTrue(client.last_receipt['connection_reused'])
        self.assertEqual(client.last_receipt['timeout_seconds'], .5)
        self.assertTrue(all(value <= .5 for value in self.sockets[0].timeouts[previous:]))
        self.assertEqual(client.timeout_seconds, 30)

    def test_invalid_keys_and_timeout_values_are_rejected(self):
        for key in ('', ' \t', 'x\ny', 'x\ry', None):
            with self.subTest(key=key):
                with self.assertRaisesRegex(ValueError, '^invalid_api_key$'):
                    transport.JsonClient(key)
        for value in (0, -1, float('nan'), float('inf'), True, '1', 301):
            with self.subTest(timeout=value):
                with self.assertRaisesRegex(ValueError, '^invalid_timeout$'):
                    transport.JsonClient(KEY, timeout_seconds=value)
                with self.assertRaisesRegex(ValueError, '^invalid_timeout$'):
                    self.client()({}, timeout_seconds=value)
        for value in (0, -1, float('nan'), float('inf'), True, 3601):
            with self.subTest(idle_timeout=value):
                with self.assertRaisesRegex(ValueError, '^invalid_idle_timeout$'):
                    transport.JsonClient(KEY, idle_timeout_seconds=value)
        self.assertEqual(self.sockets, [])

    def test_lock_contention_is_bounded_by_call_timeout(self):
        client = self.client(timeout_seconds=.001)
        client._lock.acquire()
        try:
            with self.assertRaisesRegex(TimeoutError, '^request_timeout$'):
                client({'blocked': True})
        finally:
            client._lock.release()
        self.assertEqual(self.sockets, [])
        self.assertIsNone(client.last_receipt)

    def test_close_is_idempotent_and_final_and_clears_credential(self):
        self.replies.append(response())
        client = self.client()
        client({'first': True})
        client.close()
        client.close()
        self.assertTrue(self.sockets[0].closed)
        self.assertIsNone(client._key)
        self.assertIsNone(client._context)
        error = self.assert_safe_failure(client, ValueError)
        self.assertEqual(str(error), 'client_closed')
        self.assertEqual(len(self.sockets), 1)
        with self.assertRaisesRegex(ValueError, '^client_closed$'):
            client.__enter__()

    def test_context_manager_closes_even_when_session_body_raises(self):
        self.replies.append(response())
        client = self.client()
        with self.assertRaisesRegex(RuntimeError, '^fixture$'):
            with client:
                client({'first': True})
                raise RuntimeError('fixture')
        self.assertTrue(self.sockets[0].closed)
        self.assertIsNone(client._key)
        self.assertIsNone(client._connection)

    def install_proxy(self):
        """Use the real urllib opener/redirect machinery with an offline HTTPS handler."""
        proxies = {'https': f'http://user:{PROXY_PASSWORD}@proxy.invalid:8080',
                   'no': 'example.invalid'}
        self.proxy_calls = []
        self.proxy_handlers = []
        self.proxy_responses = []
        harness = self
        original_build_opener = urllib.request.build_opener

        class OfflineHTTPSHandler(urllib.request.HTTPSHandler):
            def https_open(self, request):
                harness.proxy_calls.append(request)
                sock = FixtureSocket(harness.replies)
                reply = http.client.HTTPResponse(sock)
                reply.begin()
                reply.url, reply.msg = request.full_url, reply.reason
                harness.proxy_responses.append(reply)
                return reply

        def build_opener(*handlers):
            self.proxy_handlers.append(handlers)
            return original_build_opener(*handlers)

        self.patch(urllib.request, 'getproxies', return_value=proxies)
        self.patch(urllib.request, 'proxy_bypass', return_value=False)
        self.patch(urllib.request, 'HTTPSHandler', new=OfflineHTTPSHandler)
        self.patch(urllib.request, 'build_opener', side_effect=build_opener)
        return proxies

    def test_proxy_appearance_drops_direct_pool_and_uses_fresh_verified_openers(self):
        self.replies.extend([response(), response(), response(), response()])
        client = self.client()
        client({'direct': True})
        direct_socket = self.sockets[0]
        proxies = self.install_proxy()
        for number in (1, 2):
            self.assertEqual(client({'proxy': number}), {'ok': True})
            self.assertEqual(client.last_receipt['connection_state'], 'proxy_fallback')
            self.assertFalse(client.last_receipt['connection_reused'])
            self.assertFalse(client.last_receipt['tls_context_reused'])
            self.assertNotIn(PROXY_PASSWORD, json.dumps(client.last_receipt))
        self.assertTrue(direct_socket.closed)
        self.assertEqual(len(self.sockets), 1)
        self.assertEqual(len(self.proxy_calls), 2)
        self.assertEqual(len(self.proxy_handlers), 2)
        self.assertEqual(len(self.contexts), 3)
        for request, handlers in zip(self.proxy_calls, self.proxy_handlers):
            self.assertEqual(request.full_url, transport.ENDPOINT)
            self.assertEqual(request.get_method(), 'POST')
            self.assertEqual(request.get_header('Authorization'), 'Bearer ' + KEY)
            self.assertEqual(request.host, 'proxy.invalid:8080')
            self.assertEqual(request._tunnel_host, transport.HOST)
            self.assertEqual(next(handler.proxies for handler in handlers
                if isinstance(handler, urllib.request.ProxyHandler)), proxies)
            self.assertTrue(any(isinstance(handler, transport._NoRedirect) for handler in handlers))
        with patch.object(urllib.request, 'getproxies', return_value={}):
            client({'direct_again': True})
        self.assertEqual(len(self.sockets), 2)
        self.assertEqual(client.last_receipt['connection_state'], 'cold')

    def test_proxy_redirects_are_rejected_by_real_opener_without_followup(self):
        self.install_proxy()
        for status in (301, 302, 303, 307, 308):
            with self.subTest(status=status):
                self.replies.append(response(status=status,
                    headers=('Location: https://elsewhere.invalid/' + KEY,)))
                before = len(self.proxy_calls)
                error = self.assert_safe_failure(self.client(), urllib.error.HTTPError)
                self.assertEqual(error.code, status)
                self.assertEqual(len(self.proxy_calls), before + 1)
                self.assertTrue(self.proxy_responses[-1].isclosed())
        self.assertEqual(self.sockets, [])

    def test_proxy_body_limit_and_truncation_fail_closed(self):
        self.install_proxy()
        self.patch(transport, 'MAX_RESPONSE_BYTES', new=64)
        self.replies.append(response(b'x' * 1000))
        client = self.client()
        error = self.assert_safe_failure(client, ValueError)
        self.assertEqual(str(error), 'response_too_large')
        self.assertEqual(client.last_receipt['response_bytes'], 65)
        self.replies.append(response(declared=100))
        self.assert_safe_failure(client, urllib.error.URLError)
        self.assertEqual(len(self.proxy_calls), 2)
        self.assertEqual(self.sockets, [])

    def test_http_error_cleanup_failure_preserves_safe_status_and_traceback(self):
        self.install_proxy()
        self.replies.append(response(status=401))
        marker = 'synthetic-secret-from-response-close'
        close_calls = []

        def reject_response(handler, request, reply, code, message, headers):
            original = urllib.error.HTTPError(request.full_url, code, marker, headers, reply)
            self.addCleanup(original.close)
            close_calls.append(self.patch(original, 'close', side_effect=OSError(marker)))
            raise original

        self.patch(urllib.request.HTTPDefaultErrorHandler, 'http_error_default',
                   new=reject_response)
        client = self.client()
        error = self.assert_safe_failure(client, urllib.error.HTTPError)
        self.assertEqual(error.code, 401)
        self.assertEqual(error.reason, 'HTTP status error')
        self.assertEqual(client.last_receipt['error'], 'http_401')
        self.assertEqual(len(close_calls), 1)
        close_calls[0].assert_called_once_with()
        self.assertNotIn(marker, ''.join(traceback.format_exception(error)))
        self.assertNotIn(marker, json.dumps(client.last_receipt))


class SocketFileOwnershipTests(unittest.TestCase):
    def test_response_file_retains_real_local_socket_after_owner_closes(self):
        # AF_UNIX socketpair only: no listening socket, DNS or external network.
        reader, writer = socket.socketpair()
        self.addCleanup(reader.close)
        self.addCleanup(writer.close)
        file = transport._DeadlineSocket(reader, time.monotonic() + 5).makefile('rb')
        self.addCleanup(file.close)
        writer.sendall(b'local fixture')
        writer.shutdown(socket.SHUT_WR)
        reader.close()
        self.assertEqual(file.read(), b'local fixture')
        file.close()
        self.assertEqual(reader.fileno(), -1)


if __name__ == '__main__':
    unittest.main()
