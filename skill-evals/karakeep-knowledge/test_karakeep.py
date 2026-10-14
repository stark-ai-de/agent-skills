"""Offline helper contract tests. No Docker daemon, installed MCP or user state required."""

from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "skills/engineering-workflows/karakeep-knowledge"
SCRIPTS = SKILL / "scripts"
sys.path.insert(0, str(SCRIPTS))


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


runtime, prepare, status = (load(name) for name in ("runtime", "prepare", "status"))
# Modules importing runtime must share the same error type.
ConfigurationError = prepare.ConfigurationError


@contextmanager
def fixture_server():
    seen = []

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            seen.append((self.path, self.headers.get("Authorization")))
            if self.path == "/redirect":
                self.send_response(302)
                self.send_header("Location", "/leak")
                self.end_headers()
                return
            if self.path == "/unauthorized":
                self.send_response(401)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            body = {"bookmarks": [{"id": "synthetic-bookmark"}]} if self.path.startswith("/api/v1/bookmarks") else {"status": "ok"}
            self.wfile.write(json.dumps(body).encode())

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}", seen
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


class Helpers(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.roots = tuple(self.root / name for name in ("config", "data", "state"))

    def settings(self, address="http://localhost:3000", body=None):
        config = self.roots[0]
        config.mkdir(mode=0o700, exist_ok=True)
        path = config / "mcp.env"
        path.write_text(body or f"KARAKEEP_API_ADDR={address}\nKARAKEEP_API_KEY=synthetic-test-value\n")
        path.chmod(0o600)
        return path

    def test_preview_makes_no_directories(self):
        result = prepare.prepare(*self.roots)
        self.assertEqual(result["state"], "dry_run")
        self.assertFalse(any(p.exists() for p in self.roots))

    def test_prepare_persistent_mounts_private_secrets_and_refuse_rerun(self):
        result = prepare.prepare(*self.roots, port=3137, apply=True)
        self.assertEqual(result["state"], "prepared")
        config, data, state = self.roots
        before = {p: p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        web_env = dict(line.split("=", 1) for line in (config / "karakeep.env").read_text().splitlines())
        search_env = dict(line.split("=", 1) for line in (config / "meilisearch.env").read_text().splitlines())
        self.assertEqual(web_env["MEILI_MASTER_KEY"], search_env["MEILI_MASTER_KEY"])
        self.assertGreater(len(web_env["NEXTAUTH_SECRET"]), 32)
        self.assertEqual(web_env["NEXTAUTH_URL"], "http://localhost:3137")
        for p in self.roots:
            self.assertEqual(p.stat().st_mode & 0o777, 0o700)
        for p in before:
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)
        services = json.loads((config / "compose.json").read_text())["services"]
        self.assertEqual(services["web"]["volumes"][0]["source"], str(data / "data"))
        self.assertEqual(services["web"]["ports"], ["127.0.0.1:3137:3000", "[::1]:3137:3000"])
        self.assertNotIn("ports", services["chrome"])
        self.assertNotIn("ports", services["meilisearch"])
        self.assertFalse(services["web"]["volumes"][0]["bind"]["create_host_path"])
        self.assertTrue((state / "backups").is_dir())
        with self.assertRaises(ConfigurationError):
            prepare.prepare(*self.roots, apply=True)
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob("*") if p.is_file()})

    def test_partial_existing_state_does_not_create_config_or_rotate(self):
        self.roots[1].mkdir()
        database = self.roots[1] / "db.db"
        database.write_bytes(b"existing synthetic state")
        with self.assertRaises(ConfigurationError):
            prepare.prepare(*self.roots, apply=True)
        self.assertFalse(self.roots[0].exists())
        self.assertEqual(database.read_bytes(), b"existing synthetic state")

    def test_nested_or_symlinked_paths_are_rejected_before_writes(self):
        cases = [(self.root / "a", self.root / "a/b", self.root / "c")]
        link = self.root / "link"
        link.symlink_to(self.root, target_is_directory=True)
        cases.append((link / "a", self.root / "b", self.root / "c"))
        for roots in cases:
            with self.subTest(roots=roots), self.assertRaises(ConfigurationError):
                prepare.prepare(*roots, apply=True)
        self.assertFalse((self.root / "a").exists())

    def test_compose_interpolation_path_and_invalid_port_are_rejected(self):
        for port in (0, 80, 65536):
            with self.subTest(port=port), self.assertRaises(ConfigurationError):
                prepare.prepare(*self.roots, port=port, apply=True)
        with self.assertRaises(ConfigurationError):
            prepare.prepare(self.root / "$HOME", self.roots[1], self.roots[2], apply=True)

    def test_literal_settings_never_execute_shell(self):
        marker = self.root / "must-not-exist"
        env_file = self.settings(body=f"KARAKEEP_API_ADDR=http://localhost:3000\nKARAKEEP_API_KEY='$(touch {marker})'\n")
        values = runtime.private_settings(env_file)
        self.assertTrue(values["KARAKEEP_API_KEY"].startswith("$(touch"))
        self.assertFalse(marker.exists())

    def test_secret_modes_symlinks_and_duplicate_fields_fail_closed(self):
        env_file = self.settings()
        env_file.chmod(0o644)
        with self.assertRaises(runtime.ConfigurationError):
            runtime.private_settings(env_file)
        env_file.chmod(0o600)
        link = self.root / "symlink.env"
        link.symlink_to(env_file)
        with self.assertRaises(runtime.ConfigurationError):
            runtime.private_settings(link)
        env_file.write_text(env_file.read_text() + "KARAKEEP_API_KEY=another-value\n")
        with self.assertRaises(runtime.ConfigurationError):
            runtime.private_settings(env_file)

    def test_only_explicit_loopback_origins_are_accepted(self):
        for address in ("http://localhost:3137", "http://127.0.0.1:3000/", "https://[::1]:3443"):
            self.assertEqual(runtime.local_url(address), address.rstrip("/"))
        for address in ("https://example.org", "http://localhost.example.org", "http://user:secret@localhost", "http://localhost/path", "http://localhost?key=secret", "http://localhost:bad", "http://localhost\n", "http://localhost:0"):
            with self.subTest(address=address), self.assertRaises(runtime.ConfigurationError):
                runtime.local_url(address)

    def test_redirect_does_not_forward_bearer(self):
        with fixture_server() as (address, seen):
            code, _ = runtime.get_json(address, "/redirect", "synthetic-test-value")
        self.assertEqual(code, 302)
        self.assertEqual([route for route, _ in seen], ["/redirect"])

    def test_probe_ignores_proxy_and_does_not_claim_mcp_or_scope(self):
        with fixture_server() as (address, _):
            self.settings(address)
            with patch.dict(os.environ, {"http_proxy": "http://127.0.0.1:1", "HTTP_PROXY": "http://127.0.0.1:1"}):
                result = status.inspect(*self.roots[:2])
        self.assertEqual(result["state"], "api_readable")
        self.assertEqual(result["mcp"], "not_checked")
        self.assertEqual(result["key_scopes"], "not_verified")
        self.assertNotIn("synthetic-test-value", json.dumps(result))

    def test_probe_distinguishes_stopped_from_not_detected(self):
        with patch.object(status, "get_json", return_value=(None, None)):
            self.assertEqual(status.inspect(*self.roots[:2])["state"], "not_detected")
            self.roots[1].mkdir()
            self.assertEqual(status.inspect(*self.roots[:2])["state"], "configured_unreachable")

    def test_unauthorized_or_wrong_origin_does_not_send_key_elsewhere(self):
        self.settings()
        with patch.object(status, "get_json", return_value=(401, None)) as request:
            self.assertEqual(status.inspect(*self.roots[:2])["state"], "authentication_failed")
            request.reset_mock()
            self.assertEqual(status.inspect(*self.roots[:2], address="http://localhost:3001")["state"], "configuration_error")
            request.assert_not_called()

    def test_offline_probe_never_calls_network(self):
        self.settings()
        with patch.object(status, "get_json") as request:
            self.assertEqual(status.inspect(*self.roots[:2], network=False)["state"], "configured_unverified")
            request.assert_not_called()

    def test_launcher_process_passes_private_env_without_startup_noise(self):
        env_file = self.settings()
        child = "import os,json; print(json.dumps({'key_present': bool(os.environ.get('KARAKEEP_API_KEY')), 'url': os.environ.get('KARAKEEP_API_ADDR'), 'bypass': os.environ.get('NO_PROXY')}))"
        result = subprocess.run([sys.executable, "-B", str(SCRIPTS / "mcp_launcher.py"), "--env-file", str(env_file), "--", sys.executable, "-c", child], capture_output=True, text=True, timeout=10, check=True)
        body = json.loads(result.stdout)
        self.assertTrue(body["key_present"])
        self.assertEqual(body["url"], "http://localhost:3000")
        self.assertIn("127.0.0.1", body["bypass"])
        self.assertEqual(result.stderr, "")
        self.assertNotIn("synthetic-test-value", result.stdout)

    def test_launcher_failure_does_not_echo_secret_or_protocol_output(self):
        env_file = self.settings()
        env_file.chmod(0o644)
        result = subprocess.run([sys.executable, "-B", str(SCRIPTS / "mcp_launcher.py"), "--env-file", str(env_file), "--", sys.executable], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assertNotIn("synthetic-test-value", result.stderr)


if __name__ == "__main__":
    unittest.main()
