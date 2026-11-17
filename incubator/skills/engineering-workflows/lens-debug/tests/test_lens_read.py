"""Offline HTTP contract tests; no real Lens or model calls."""
import importlib.util
import io
from http.client import HTTPException
import json
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError

SCRIPT = Path(__file__).parents[1] / 'scripts/lens_read.py'


class LensReadTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(SCRIPT.is_file(), 'bounded Lens reader is missing')
        spec = importlib.util.spec_from_file_location('lens_read', SCRIPT)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.key = Path(self.temp.name) / 'key'
        self.key.write_text('test-only-read-key')
        self.key.chmod(0o600)

    def args(self, *args):
        return self.module.parser().parse_args(['--base-url', 'https://gateway.example', '--key-file', str(self.key), *args])

    def test_list_requires_bounded_time(self):
        spec = self.module.request_spec(self.args('list', '--start-ms', '10', '--end-ms', '20'))
        self.assertEqual(spec, ('https://gateway.example/v1/traces?start_ms=10&end_ms=20', 'GET', None))

    def test_inverted_window_rejected(self):
        with self.assertRaises(ValueError):
            self.module.request_spec(self.args('list', '--start-ms', '20', '--end-ms', '10'))

    def test_negative_window_rejected(self):
        with self.assertRaises(ValueError):
            self.module.request_spec(self.args('list', '--start-ms', '-1', '--end-ms', '10'))

    def test_trace_ref_is_urlencoded(self):
        url, method, data = self.module.request_spec(self.args('show', '--trace-id', 'a' * 32, '--trace-ref', 'a&other=b'))
        self.assertTrue(url.endswith('?trace_ref=a%26other%3Db'))
        self.assertEqual(method, 'GET')
        self.assertIsNone(data)

    def test_invalid_trace_path_rejected(self):
        with self.assertRaises(ValueError):
            self.module.request_spec(self.args('show', '--trace-id', '../delete', '--trace-ref', 'r'))

    def test_span_fetches_full_content_without_another_model_call(self):
        self.assertIn('span', self.module.parser().format_help())
        spec = self.module.request_spec(self.args('span', '--trace-id', 'a' * 32,
            '--trace-ref', 'r&x', '--span-id', 'b' * 16))
        self.assertEqual(spec, ('https://gateway.example/v1/traces/' + 'a' * 32
            + '/spans/' + 'b' * 16 + '?trace_ref=r%26x', 'GET', None))

    def test_span_error_uses_the_documented_read_endpoint(self):
        self.assertIn('span', self.module.parser().format_help())
        url, method, body = self.module.request_spec(self.args('span', '--trace-id', 'a' * 32,
            '--trace-ref', 'r', '--span-id', 'b' * 16, '--error'))
        self.assertTrue(url.endswith('/spans/' + 'b' * 16 + '/error?trace_ref=r'))
        self.assertEqual((method, body), ('GET', None))

    def test_span_id_cannot_redirect_the_path(self):
        self.assertIn('span', self.module.parser().format_help())
        with self.assertRaises(ValueError):
            self.module.request_spec(self.args('span', '--trace-id', 'a' * 32,
                '--trace-ref', 'r', '--span-id', '../admin'))

    def test_show_supports_explicit_bounded_pagination(self):
        args = self.args('show', '--trace-id', 'a' * 32, '--trace-ref', 'r')
        args.cursor, args.page_size = 'next&cursor', 10
        url, method, body = self.module.request_spec(args)
        self.assertTrue(url.endswith('?trace_ref=r&cursor=next%26cursor&page_size=10'))
        self.assertEqual((method, body), ('GET', None))

    def test_show_refuses_invalid_page_size(self):
        for value in (0, 1001):
            args = self.args('show', '--trace-id', 'a' * 32, '--trace-ref', 'r')
            args.cursor, args.page_size = None, value
            with self.subTest(page_size=value), self.assertRaises(ValueError):
                self.module.request_spec(args)

    def test_http_protocol_errors_do_not_echo_remote_content(self):
        def fail(*args, **kwargs):
            raise HTTPException('private remote content')
        with self.assertRaisesRegex(ValueError, '^Gateway connection failed') as result:
            self.module.fetch_json('https://gateway.example/v1/traces', 'GET', None, 'token', opener=fail)
        self.assertNotIn('private', str(result.exception))

    def test_invalid_key_encoding_has_a_safe_error(self):
        self.key.write_bytes(b'\xffprivate-token')
        with self.assertRaisesRegex(ValueError, '^The key file must contain one ASCII token'):
            self.module.read_key(self.key)

    def test_schema_is_read_only(self):
        url, method, data = self.module.request_spec(self.args('schema'))
        self.assertEqual(url, 'https://gateway.example/v1/traces/query/help')
        self.assertEqual(method, 'GET')
        self.assertIsNone(data)

    def test_query_requires_time_placeholders_and_limit(self):
        sql = Path(self.temp.name) / 'q.sql'
        sql.write_text('SELECT SpanName FROM otel_traces WHERE Timestamp >= fromUnixTimestamp64Milli({start_ms}) AND Timestamp < fromUnixTimestamp64Milli({end_ms}) LIMIT 10')
        url, method, data = self.module.request_spec(self.args('query', '--start-ms', '10', '--end-ms', '20', '--sql-file', str(sql)))
        self.assertTrue(url.endswith('/v1/traces/query'))
        self.assertEqual(method, 'POST')
        self.assertIn('fromUnixTimestamp64Milli(10)', data['sql'])
        self.assertNotIn('{start_ms}', data['sql'])

    def test_query_writes_or_unbounded_queries_rejected(self):
        sql = Path(self.temp.name) / 'q.sql'
        for content in ['DROP TABLE x', 'SELECT * FROM otel_traces', 'SELECT 1; DELETE FROM x']:
            sql.write_text(content)
            with self.subTest(sql=content), self.assertRaises(ValueError):
                self.module.request_spec(self.args('query', '--start-ms', '10', '--end-ms', '20', '--sql-file', str(sql)))

    def test_no_plain_http_credentials_query_or_fragment_in_base(self):
        for base in ['http://gateway.example', 'https://u:p@gateway.example', 'https://gateway.example?k=x', 'https://gateway.example/#x']:
            args = self.args('schema')
            args.base_url = base
            with self.subTest(base=base), self.assertRaises(ValueError):
                self.module.request_spec(args)

    def test_key_permissions(self):
        self.assertEqual(self.module.read_key(self.key), 'test-only-read-key')
        self.key.chmod(0o644)
        with self.assertRaises(ValueError):
            self.module.read_key(self.key)

    def test_redirects_refused(self):
        with self.assertRaises(ValueError):
            self.module.NoRedirect().redirect_request(None, None, 302, 'redirect', {}, 'https://other.example')

    def test_response_size_bounded(self):
        with self.assertRaises(ValueError):
            self.module.fetch_json('https://gateway.example/v1/traces', 'GET', None, 'token', opener=lambda *a, **k: io.BytesIO(b'x' * (self.module.MAX_BYTES + 1)))

    def test_remote_error_body_never_echoed(self):
        def fail(*args, **kwargs):
            raise HTTPError('https://gateway.example', 403, 'secret-remote-error', {}, io.BytesIO(b'secret body'))
        with self.assertRaisesRegex(ValueError, '^Gateway returned HTTP 403') as result:
            self.module.fetch_json('https://gateway.example/v1/traces', 'GET', None, 'token', opener=fail)
        self.assertNotIn('secret', str(result.exception))

    def test_header_and_response_redaction(self):
        seen = []
        def open_fake(request, timeout):
            seen.append(request)
            return io.BytesIO(json.dumps({'authorization': 'Bearer leaked', 'text': 'test-only-read-key', 'input_tokens': 12}).encode())
        result = self.module.fetch_json('https://gateway.example/v1/traces', 'GET', None, 'test-only-read-key', opener=open_fake)
        self.assertEqual(seen[0].get_header('Authorization'), 'Bearer test-only-read-key')
        self.assertEqual(result['authorization'], '[REDACTED]')
        self.assertEqual(result['text'], '[REDACTED]')
        self.assertEqual(result['input_tokens'], 12)


if __name__ == '__main__':
    unittest.main()
