"""Synthetic loopback regressions for protocol failures and whole-request deadlines."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import importlib.util
import json
import os
from pathlib import Path
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "skills/engineering-workflows/karakeep-knowledge/scripts"
spec = importlib.util.spec_from_file_location("karakeep_transport", SCRIPTS / "runtime.py")
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)
SECRET = "synthetic-transport-key"
MARKER = "untrusted-response-marker"


def response(body, status=200):
    return (
        f"HTTP/1.1 {status} Fixture\r\nContent-Length: {len(body)}\r\n"
        "Content-Type: application/json\r\nConnection: close\r\n\r\n"
    ).encode() + body


@contextmanager
def wire_server(reply, trickle=False):
    stop = threading.Event()
    seen = []

    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            self.request.settimeout(2)
            try:
                request = b""
                while b"\r\n\r\n" not in request and len(request) < 16384:
                    chunk = self.request.recv(4096)
                    if not chunk:
                        return
                    request += chunk
                seen.append(request)
                self.request.sendall(reply)
                while trickle and not stop.wait(0.05):
                    self.request.sendall(b"x")
            except OSError:
                pass  # A timed-out client deliberately disconnects mid-response.

    with socketserver.ThreadingTCPServer(("127.0.0.1", 0), Handler) as server:
        thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.05})
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_address[1]}", seen
        finally:
            stop.set()
            server.shutdown()
            thread.join(timeout=3)


class Transport(unittest.TestCase):
    def probe(self, reply, trickle=False):
        with tempfile.TemporaryDirectory() as temp, wire_server(reply, trickle) as (address, seen):
            config = Path(temp) / "config"
            config.mkdir(mode=0o700)
            settings = config / "mcp.env"
            settings.write_text(f"KARAKEEP_API_ADDR={address}\nKARAKEEP_API_KEY={SECRET}\n")
            settings.chmod(0o600)
            started = time.monotonic()
            result = subprocess.run(
                [sys.executable, "-B", str(SCRIPTS / "status.py"), "--config-dir", str(config),
                 "--data-dir", str(Path(temp) / "data")],
                capture_output=True, text=True, timeout=9,
            )
            elapsed = time.monotonic() - started
        self.assertEqual(len(seen), 1)
        self.assertIn(f"Authorization: Bearer {SECRET}".encode(), seen[0])
        self.assertEqual(result.stderr, "")
        self.assertNotIn(SECRET, result.stdout)
        self.assertNotIn(MARKER, result.stdout)
        return result.returncode, json.loads(result.stdout), elapsed

    def assert_failed_probe(self, reply, trickle=False):
        code, body, elapsed = self.probe(reply, trickle)
        self.assertEqual(code, 1)
        self.assertEqual(body["state"], "configured_unreachable")
        self.assertIsNone(body["http_status"])
        return elapsed

    def test_malformed_status_is_sanitized_in_transport_and_cli(self):
        reply = (MARKER + "\r\n\r\n").encode()
        transport = getattr(runtime, "_get_json", runtime.get_json)
        with wire_server(reply) as (address, _):
            self.assertEqual(transport(address, "/api/health", SECRET), (None, None))
        self.assert_failed_probe(reply)

    def test_truncated_chunk_is_sanitized_in_transport_and_cli(self):
        reply = b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n40\r\n" + MARKER.encode()
        transport = getattr(runtime, "_get_json", runtime.get_json)
        with wire_server(reply) as (address, _):
            self.assertEqual(transport(address, "/api/health", SECRET), (None, None))
        self.assert_failed_probe(reply)

    def test_slow_body_obeys_cli_deadline(self):
        reply = b"HTTP/1.1 200 OK\r\nContent-Length: 1000000\r\n\r\n"
        elapsed = self.assert_failed_probe(reply, trickle=True)
        self.assertGreaterEqual(elapsed, 4)
        self.assertLess(elapsed, 8)

    def test_slow_headers_obey_cli_deadline(self):
        elapsed = self.assert_failed_probe(b"HTTP/1.1 200 OK\r\nX-Slow: ", trickle=True)
        self.assertGreaterEqual(elapsed, 4)
        self.assertLess(elapsed, 8)

    def test_timeout_kills_and_reaps_worker(self):
        popen = subprocess.Popen
        with wire_server(b"HTTP/1.1 200 OK\r\nX-Slow: ", trickle=True) as (address, seen):
            workers = []

            def record_worker(*args, **kwargs):
                worker = popen(*args, **kwargs)
                workers.append(worker)
                return worker

            with patch.object(runtime, "REQUEST_TIMEOUT", 1), patch.object(runtime.subprocess, "Popen", side_effect=record_worker):
                started = time.monotonic()
                self.assertEqual(runtime.get_json(address, "/api/health", SECRET), (None, None))
                self.assertLess(time.monotonic() - started, 3)
            self.assertEqual(len(seen), 1)
            self.assertEqual(len(workers), 1)
            self.assertIsNotNone(workers[0].poll())
            with self.assertRaises(ChildProcessError):
                os.waitpid(workers[0].pid, os.WNOHANG)

    def test_request_credentials_are_not_process_arguments(self):
        with wire_server(response(b'{"bookmarks": []}')) as (address, seen):
            with patch.object(runtime.subprocess, "Popen", wraps=subprocess.Popen) as launch:
                self.assertEqual(runtime.get_json(address, "/api/v1/bookmarks", SECRET), (200, {"bookmarks": []}))
        args, kwargs = launch.call_args
        self.assertEqual(args[0][0], sys.executable)
        self.assertIn("-B", args[0])
        self.assertNotIn(SECRET, repr((args, kwargs)))
        self.assertFalse(kwargs.get("shell", False))
        self.assertEqual(kwargs["stdin"], subprocess.PIPE)
        self.assertIn(f"Authorization: Bearer {SECRET}".encode(), seen[0])

    def test_deadline_does_not_require_main_thread(self):
        with wire_server(response(b'{"status": "ok"}')) as (address, _):
            with ThreadPoolExecutor(max_workers=1) as pool:
                result = pool.submit(runtime.get_json, address, "/api/health").result(timeout=4)
        self.assertEqual(result, (200, {"status": "ok"}))

    def test_normal_status_and_http_errors_are_preserved(self):
        code, body, _ = self.probe(response(b'{"bookmarks": []}'))
        self.assertEqual((code, body["state"], body["http_status"]), (0, "api_readable", 200))
        for http_code, state in ((401, "authentication_failed"), (403, "scope_insufficient")):
            with self.subTest(status=http_code):
                code, body, _ = self.probe(response(MARKER.encode(), http_code))
                self.assertEqual((code, body["state"], body["http_status"]), (1, state, http_code))

    def test_non_json_and_oversized_responses_stay_bounded(self):
        for body in (MARKER.encode(), b"x" * (1024 * 1024 + 1)):
            with self.subTest(bytes=len(body)), wire_server(response(body)) as (address, _):
                self.assertEqual(runtime.get_json(address, "/api/health"), (200, None))

    def test_worker_launch_failure_is_sanitized(self):
        with patch.object(runtime.subprocess, "Popen", side_effect=OSError(MARKER)):
            self.assertEqual(runtime.get_json("http://127.0.0.1", "/api/health", SECRET), (None, None))


if __name__ == "__main__":
    unittest.main()
