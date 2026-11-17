from contextlib import redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, HTTPServer
import importlib.util
from io import BytesIO, StringIO
import json
from pathlib import Path
import signal
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import Mock, patch
import urllib.error


source = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/mcp_launcher.py"
sys.path.insert(0, str(source.parent))
spec = importlib.util.spec_from_file_location("mcp_launcher", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LauncherTests(unittest.TestCase):
    def test_secret_is_in_environment_and_never_command_arguments(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root)
            marker = home / ".local/state/hindsight-greppy/pilot-start"
            marker.parent.mkdir(parents=True)
            marker.write_text("qualified")
            runtime = home / "runtime.env"
            runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-secret\n")
            runtime.chmod(0o600)
            with patch.object(Path, "home", return_value=home), patch.object(module.os, "execve") as execute, \
                    patch.object(module, "ensure_workspace_bank", side_effect=AssertionError("legacy bank write")):
                module.launch(runtime, "/test/mcp-proxy")
            executable, arguments, environment = execute.call_args.args
            self.assertEqual(executable, "/test/mcp-proxy")
            self.assertNotIn("synthetic-secret", arguments)
            self.assertEqual(environment["API_ACCESS_TOKEN"], "synthetic-secret")
            self.assertEqual(arguments[-1], "http://127.0.0.1:18888/mcp/greppy/")

    def test_rejects_missing_qualification_and_insecure_key(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root)
            runtime = home / "runtime.env"
            runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-secret\n")
            with patch.object(Path, "home", return_value=home):
                with self.assertRaises(SystemExit):
                    module.launch(runtime, "/test/mcp-proxy")
                marker = home / ".local/state/hindsight-greppy/pilot-start"
                marker.parent.mkdir(parents=True)
                marker.write_text("qualified")
                runtime.chmod(0o644)
                with self.assertRaises(SystemExit):
                    module.launch(runtime, "/test/mcp-proxy")


class BankBootstrapTests(unittest.TestCase):
    endpoint = "http://127.0.0.1:18888"
    bank = "preserved-project-bank"
    token = "synthetic-private-token"

    def config(self, **changes):
        return {"bank_id": self.bank, "config": {"retain_mission": "existing mission"}, "overrides": {}, **changes}

    def serve(self, steps, *, revalidate=None, after_response=None):
        """Exercise real request construction against an in-memory API boundary."""
        self.calls = []
        pending = list(steps)

        def respond(request, timeout):
            method, suffix, status, result = pending.pop(0)
            self.calls.append((request.get_method(), request.full_url, request.data, timeout))
            self.assertEqual(request.get_method(), method)
            self.assertEqual(request.full_url, self.endpoint + "/v1/default/banks/" + self.bank + suffix)
            self.assertEqual(request.data, b"{}" if method == "PUT" else None)
            self.assertEqual(request.get_header("Authorization"), "Bearer " + self.token)
            self.assertGreater(timeout, 0)
            self.assertLessEqual(timeout, 5)
            if after_response:
                after_response()
            if isinstance(result, Exception):
                raise result
            if status != 200:
                raise urllib.error.HTTPError(request.full_url, status, "private service detail", {}, BytesIO(b"private error body"))
            response = BytesIO(result if isinstance(result, bytes) else json.dumps(result).encode())
            response.status = status
            return response

        opener = Mock(open=Mock(side_effect=respond))
        with patch.object(module.urllib.request, "build_opener", return_value=opener) as build:
            module.ensure_workspace_bank(self.endpoint, self.bank, self.token, revalidate or Mock())
        self.assertEqual(pending, [])
        handlers = build.call_args.args
        self.assertEqual(handlers[0].proxies, {})
        self.assertIsInstance(handlers[1], module.NoRedirect)

    def test_existing_bank_is_read_without_writing_or_overriding_configuration(self):
        output = StringIO()
        with redirect_stdout(output), redirect_stderr(output):
            self.serve([("GET", "/config", 200, self.config())])
        self.assertEqual([call[0] for call in self.calls], ["GET"])
        self.assertEqual(output.getvalue(), "")

    def test_missing_bank_gets_only_empty_profile_creation_and_exact_readback(self):
        self.serve([
            ("GET", "/config", 404, None),
            ("PUT", "", 200, {"bank_id": self.bank}),
            ("GET", "/config", 200, self.config()),
        ])
        self.assertEqual([call[0] for call in self.calls], ["GET", "PUT", "GET"])

    def test_only_404_authorizes_creation(self):
        for code in (301, 302, 307, 400, 401, 403, 409, 429, 500, 503):
            with self.subTest(code=code), self.assertRaises(module.BankBootstrapError):
                self.serve([("GET", "/config", code, None)])
            self.assertEqual([call[0] for call in self.calls], ["GET"])

    def test_wrong_bank_or_failed_config_never_creates_a_bank(self):
        for result in (
            self.config(bank_id="another-bank"), self.config(config=[]), self.config(overrides=[]),
            self.config(error="private detail"), self.config(status="error"), self.config(success=False),
            {}, [], b"not json", b"x" * 1048577,
        ):
            with self.subTest(result_type=type(result).__name__), self.assertRaises(module.BankBootstrapError):
                self.serve([("GET", "/config", 200, result)])
            self.assertEqual([call[0] for call in self.calls], ["GET"])

    def test_creation_must_succeed_for_the_exact_bank(self):
        for status, result in ((503, None), (200, {"bank_id": "other-bank"}),
                               (200, {"bank_id": self.bank, "error": "private detail"})):
            with self.subTest(status=status, result=result), self.assertRaises(module.BankBootstrapError):
                self.serve([("GET", "/config", 404, None), ("PUT", "", status, result)])
            self.assertEqual([call[0] for call in self.calls], ["GET", "PUT"])

    def test_failed_creation_readback_is_not_success_and_never_deletes(self):
        for status, result in ((404, None), (200, self.config(bank_id="other-bank"))):
            with self.subTest(status=status), self.assertRaises(module.BankBootstrapError):
                self.serve([("GET", "/config", 404, None), ("PUT", "", 200, {"bank_id": self.bank}),
                            ("GET", "/config", status, result)])
            self.assertEqual([call[0] for call in self.calls], ["GET", "PUT", "GET"])

    def test_scope_change_after_absence_probe_blocks_put(self):
        guard = Mock(side_effect=[None, ValueError("scope changed")])
        with self.assertRaisesRegex(ValueError, "scope changed"):
            self.serve([("GET", "/config", 404, None)], revalidate=guard)
        self.assertEqual([call[0] for call in self.calls], ["GET"])

    def test_request_errors_do_not_expose_private_response_or_credentials(self):
        for error in (TimeoutError("private service detail"), urllib.error.URLError(self.token)):
            with self.subTest(error=type(error).__name__), self.assertRaises(module.BankBootstrapError) as caught:
                self.serve([("GET", "/config", 200, error)])
            self.assertNotIn("private service detail", str(caught.exception))
            self.assertNotIn(self.token, str(caught.exception))

    def test_bootstrap_shares_one_five_second_budget(self):
        now = [10.0]
        with patch.object(module.time, "monotonic", side_effect=lambda: now[0]):
            self.serve([
                ("GET", "/config", 404, None), ("PUT", "", 200, {"bank_id": self.bank}),
                ("GET", "/config", 200, self.config()),
            ], after_response=lambda: now.__setitem__(0, now[0] + 1.5))
        self.assertEqual([call[3] for call in self.calls], [5, 3.5, 2])

    def test_exhausted_budget_prevents_creation(self):
        now = [10.0]
        with patch.object(module.time, "monotonic", side_effect=lambda: now[0]), self.assertRaises(module.BankBootstrapError):
            self.serve([("GET", "/config", 404, None)], after_response=lambda: now.__setitem__(0, 16.0))
        self.assertEqual([call[0] for call in self.calls], ["GET"])

    def test_response_after_deadline_is_rejected(self):
        now = [10.0]
        with patch.object(module.time, "monotonic", side_effect=lambda: now[0]), self.assertRaises(module.BankBootstrapError):
            self.serve([("GET", "/config", 200, self.config())], after_response=lambda: now.__setitem__(0, 16.0))

    def test_wall_clock_deadline_interrupts_slow_headers_and_trickled_body(self):
        for stall in ("headers", "body"):
            with self.subTest(stall=stall):
                release = threading.Event()
                body = json.dumps(self.config()).encode()

                class Handler(BaseHTTPRequestHandler):
                    def log_message(self, *args):
                        pass

                    def do_GET(self):
                        try:
                            if stall == "headers":
                                parts = (b"HTTP/1.0 ", b"200", b" OK", b"\r\n", b"Content-",
                                         b"Length: ", str(len(body)).encode(), b"\r\n", b"\r\n")
                                for part in parts:
                                    self.wfile.write(part)
                                    self.wfile.flush()
                                    if release.wait(0.05):
                                        return
                                self.wfile.write(body)
                            else:
                                self.send_response(200)
                                self.send_header("Content-Length", str(len(body)))
                                self.end_headers()
                                for byte in body[:12]:
                                    self.wfile.write(bytes([byte]))
                                    self.wfile.flush()
                                    if release.wait(0.05):
                                        return
                                self.wfile.write(body[12:])
                        except (BrokenPipeError, ConnectionResetError):
                            pass

                server = HTTPServer(("127.0.0.1", 0), Handler)
                thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
                thread.start()
                previous = signal.getsignal(signal.SIGALRM)
                started = time.monotonic()
                try:
                    # Every chunk arrives before the socket inactivity timeout;
                    # only the wall-clock deadline stops this longer transfer.
                    with patch.object(module, "_BANK_HTTP_SECONDS", 0.15), \
                            self.assertRaisesRegex(module.BankBootstrapError, "five-second HTTP budget"):
                        module.ensure_workspace_bank("http://127.0.0.1:" + str(server.server_port), self.bank, self.token, Mock())
                    self.assertLess(time.monotonic() - started, 0.4)
                    self.assertEqual(signal.getitimer(signal.ITIMER_REAL), (0, 0))
                    self.assertEqual(signal.getsignal(signal.SIGALRM), previous)
                finally:
                    release.set()
                    server.shutdown()
                    server.server_close()
                    thread.join(timeout=1)

    def test_existing_timer_is_preserved_without_any_bank_request(self):
        previous = signal.getsignal(signal.SIGALRM)
        signal.signal(signal.SIGALRM, lambda *args: None)
        signal.setitimer(signal.ITIMER_REAL, 2)
        try:
            with patch.object(module.urllib.request, "build_opener") as build, self.assertRaises(module.BankBootstrapError):
                module.ensure_workspace_bank(self.endpoint, self.bank, self.token, Mock())
            build.return_value.open.assert_not_called()
            self.assertGreater(signal.getitimer(signal.ITIMER_REAL)[0], 0)
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
            signal.signal(signal.SIGALRM, previous)

    def test_external_endpoint_invalid_identity_and_header_injection_make_no_request(self):
        cases = [(endpoint, self.bank, self.token) for endpoint in (
            "https://example.invalid", "http://127.0.0.1", "http://127.0.0.1:18888/path",
            "http://user@127.0.0.1:18888", "http://127.0.0.1:18888?other=1",
        )] + [(self.endpoint, "../another-bank", self.token), (self.endpoint, self.bank, "token\r\nInjected: value")]
        for endpoint, bank, token in cases:
            with self.subTest(endpoint=endpoint), patch.object(module.urllib.request, "build_opener") as build:
                with self.assertRaises(ValueError):
                    module.ensure_workspace_bank(endpoint, bank, token, Mock())
                build.assert_not_called()
        self.assertIsNone(module.NoRedirect().redirect_request(None, None, 302, None, None, "http://example.invalid"))


if __name__ == "__main__":
    unittest.main()
