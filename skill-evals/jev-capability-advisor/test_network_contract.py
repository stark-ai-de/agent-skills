"""Portable, offline network contract checks; no claim of live host approval."""
import contextlib
import io
import json
import os
from pathlib import Path
import socket
import ssl
import sys
import tempfile
import unittest
from unittest import mock
import urllib.error

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "skills/skill-maintenance/jev-capability-advisor"
sys.path.insert(0, str(SKILL / "scripts"))
import jev_advisor as advisor

CATALOG = [{"id": "skill:review", "kind": "skill", "name": "review",
            "description": "Review Python source code and tests", "enabled": True,
            "explicit_only": False}]
QUERY = "Review Python source code"
SECRET = "private-sentinel-must-not-appear"


def none_reply(payload):
    return {"answers": {"mode": {"type": "choice", "choice": "NONE"},
                        "primary": {"type": "choice", "choice": "NONE"}}}


class NetworkContractTests(unittest.TestCase):
    def test_valid_none_is_not_reported_as_network_failure(self):
        transport = mock.Mock(side_effect=none_reply, transport_kind="injected")
        result = advisor.advise(QUERY, CATALOG, transport=transport)
        self.assertEqual(result["status"], "none")
        self.assertEqual(transport.call_count, 1)
        self.assertNotIn("error_message", advisor.summarize(result, CATALOG))

    def test_failures_are_safe_and_never_replayed(self):
        cases = [
            (urllib.error.URLError(SECRET), "network_error"),
            (TimeoutError(SECRET), "request_timeout"),
            (ssl.SSLCertVerificationError(SECRET), "SSLCertVerificationError"),
            (socket.gaierror(SECRET), "gaierror"),
            (urllib.error.HTTPError("https://" + SECRET, 401, SECRET, {}, None), "http_401"),
            (urllib.error.HTTPError("https://" + SECRET, 403, SECRET, {}, None), "http_403"),
            (urllib.error.HTTPError("https://" + SECRET, 404, SECRET, {}, None), "http_404"),
        ]
        for error, code in cases:
            with self.subTest(code=code):
                transport = mock.Mock(side_effect=error, transport_kind="injected")
                result = advisor.advise(QUERY, CATALOG, transport=transport)
                summary = advisor.summarize(result, CATALOG)
                self.assertEqual(transport.call_count, 1)
                self.assertEqual(summary["status"], "error")
                self.assertEqual(summary["error"], code)
                self.assertEqual(summary["selected"], [])
                self.assertIn("No Jev recommendation", summary["error_message"])
                self.assertNotIn(SECRET, json.dumps(summary))
                self.assertNotIn("active policy blocks", summary["error_message"])

    def test_missing_key_never_constructs_transport(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch.object(advisor, "make_transport") as factory:
                result = advisor.advise(QUERY, CATALOG)
        factory.assert_not_called()
        summary = advisor.summarize(result, CATALOG)
        self.assertEqual(summary["error"], "missing_api_key")
        self.assertIn("credentials", summary["error_message"])

    def test_explicit_bad_key_file_never_falls_back_to_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog, query = root / "catalog.json", root / "query.txt"
            catalog.write_text(json.dumps(CATALOG), encoding="utf-8")
            query.write_text(QUERY, encoding="utf-8")
            before = set(root.iterdir())
            output = io.StringIO()
            with mock.patch.dict(os.environ, {"TYPESAFE_API_KEY": SECRET}):
                with mock.patch.object(advisor, "make_transport") as factory:
                    with contextlib.redirect_stdout(output):
                        status = advisor.main(["--catalog", str(catalog), "--query-file", str(query),
                                               "--key-file", str(root / "missing-key"), "--summary"])
            factory.assert_not_called()
            self.assertEqual(status, 1)
            summary = json.loads(output.getvalue())
            self.assertEqual(summary["error"], "credential_unavailable")
            self.assertNotIn(SECRET, output.getvalue())
            self.assertNotIn(directory, output.getvalue())
            self.assertEqual(before, set(root.iterdir()))

    def test_offline_inspection_needs_no_key_or_network_and_writes_no_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog = root / "catalog.json"
            catalog.write_text(json.dumps(CATALOG), encoding="utf-8")
            config = root / "config.toml"
            config.write_text("# user policy must remain unchanged\n", encoding="utf-8")
            before = {p.name: p.read_bytes() for p in root.iterdir()}
            output = io.StringIO()
            with mock.patch.dict(os.environ, {}, clear=True):
                with mock.patch.object(advisor, "make_transport") as factory:
                    with contextlib.redirect_stdout(output):
                        status = advisor.main(["--catalog", str(catalog), "--query", QUERY,
                                               "--offline-candidates"])
            factory.assert_not_called()
            self.assertEqual(status, 0)
            self.assertEqual(json.loads(output.getvalue())["status"], "candidates")
            self.assertEqual(before, {p.name: p.read_bytes() for p in root.iterdir()})

    def test_unknown_error_message_never_echoes_untrusted_code(self):
        summary = advisor.summarize({"status": "error", "error": SECRET})
        self.assertNotIn(SECRET, summary["error_message"])
        self.assertIn("does not establish a sandbox denial", summary["error_message"])

    def test_metadata_and_common_entrypoint_are_host_neutral(self):
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        frontmatter = text.split("---", 2)[1]
        self.assertIn("compatibility:", frontmatter)
        self.assertIn("Python 3.10+", frontmatter)
        self.assertIn("api.typesafe.ai", frontmatter)
        self.assertNotIn("require_escalated", text)
        self.assertNotIn("sandbox_permissions", text)
        self.assertNotIn("allowed-tools:", frontmatter)
        self.assertIn("native Windows, macOS and Linux", text)
        self.assertIn("references/network-access.md", text)

    def test_guidance_covers_approval_outcomes_without_claiming_live_proof(self):
        text = (SKILL / "references/network-access.md").read_text(encoding="utf-8")
        for term in ("already allowed", "Approval is required", "explicitly denies",
                     "approval is unavailable", "Policy is unknown", "Do not replay",
                     "explicit Jev-only", "normal CI", "injected replies"):
            self.assertIn(term, text)
        for asset in ("hook-guidance.txt", "repository-hook-guidance.txt"):
            hint = (SKILL / "assets" / asset).read_text(encoding="utf-8")
            self.assertIn("references/network-access.md", hint)
            self.assertIn("no Jev recommendation", hint)
            self.assertIn("Only host evidence establishes denial", hint)


if __name__ == "__main__":
    unittest.main()
