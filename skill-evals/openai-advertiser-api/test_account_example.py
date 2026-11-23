"""Run the documented account check with mocked curl and synthetic credentials."""

import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SKILL = "engineering-workflows/openai-advertiser-api/references/api-operations.md"
PUBLIC = ROOT / "skills" / SKILL
REFERENCE = PUBLIC if PUBLIC.exists() else ROOT / "incubator/skills" / SKILL
EXAMPLE = re.search(r"```bash\n(.*?)\n```", REFERENCE.read_text(), re.S)[1]
FIXTURE_KEY = "fixture-ads-key"
ACCOUNT = {
    "id": "acct_fixture",
    "currency_code": "USD",
    "timezone": "America/New_York",
    "preview_url": "private-preview-fixture",
    "legal_name": "private-name-fixture",
}
CURL_MOCK = """
import json
import os
import sys
from pathlib import Path

args = sys.argv[1:]
Path(os.environ["MOCK_REQUEST"]).write_text(json.dumps([args, sys.stdin.read()]))
if "--output" in args:
    Path(args[args.index("--output") + 1]).write_text(os.environ["MOCK_BODY"])
    print(os.environ["MOCK_STATUS"], end="")
else:
    print(os.environ["MOCK_BODY"])
sys.exit(int(os.environ["MOCK_EXIT"]))
"""


class AccountExampleTest(unittest.TestCase):
    def run_example(
        self, key=FIXTURE_KEY, status="200", body=None, expected="acct_fixture",
        exit_code=0, mode=None,
    ):
        with tempfile.TemporaryDirectory() as directory:
            curl = Path(directory) / "curl"
            request = Path(directory) / "request.json"
            curl.write_text(f"#!{sys.executable}\n{CURL_MOCK}")
            curl.chmod(0o700)
            env = {
                **os.environ,
                "PATH": f"{directory}{os.pathsep}{os.environ['PATH']}",
                "MOCK_REQUEST": str(request),
                "MOCK_BODY": json.dumps(ACCOUNT) if body is None else body,
                "MOCK_STATUS": status,
                "MOCK_EXIT": str(exit_code),
            }
            env.pop("OPENAI_ADS_API_KEY", None)
            env.pop("OPENAI_ADS_EXPECTED_ACCOUNT_ID", None)
            env.pop("OPENAI_ADS_ACCOUNT_MODE", None)
            if key is not None:
                env["OPENAI_ADS_API_KEY"] = key
            if expected is not None:
                env["OPENAI_ADS_EXPECTED_ACCOUNT_ID"] = expected
            if mode is not None:
                env["OPENAI_ADS_ACCOUNT_MODE"] = mode
            result = subprocess.run(["bash", "-x", "-c", EXAMPLE], env=env, capture_output=True, text=True, check=False)
            observed = json.loads(request.read_text()) if request.exists() else None
        return result, observed

    def assert_private(self, result):
        for value in (FIXTURE_KEY, "private-preview-fixture", "private-name-fixture"):
            self.assertNotIn(value, result.stdout + result.stderr)

    def test_verified_account_prints_only_summary(self):
        result, observed = self.run_example()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), {k: ACCOUNT[k] for k in ("id", "currency_code", "timezone")})
        args, header = observed
        self.assertEqual(args[0], "--disable")
        self.assertEqual(args[-1], "https://api.ads.openai.com/v1/ad_account")
        self.assertEqual(header, f"Authorization: Bearer {FIXTURE_KEY}\n")
        self.assertNotIn(FIXTURE_KEY, " ".join(args))
        self.assertNotIn("--location", args)
        self.assertNotIn("--retry", args)
        self.assert_private(result)

    def test_missing_or_malformed_key_stops_before_curl(self):
        for key in (None, "", f"{FIXTURE_KEY}\nX-Extra: fixture"):
            with self.subTest(key=key):
                result, observed = self.run_example(key=key)
                self.assertNotEqual(result.returncode, 0)
                self.assertIsNone(observed)
                self.assert_private(result)

    def test_verification_requires_expected_id_before_curl(self):
        for expected in (None, "", " "):
            with self.subTest(expected=expected):
                result, observed = self.run_example(expected=expected)
                self.assertNotEqual(result.returncode, 0)
                self.assertIsNone(observed)
                self.assertEqual(result.stdout, "")

    def test_explicit_discovery_labels_summary_unverified(self):
        result, observed = self.run_example(expected=None, mode="discover")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIsNotNone(observed)
        summary = {k: ACCOUNT[k] for k in ("id", "currency_code", "timezone")}
        self.assertEqual(json.loads(result.stdout), {**summary, "account_verified": False})
        self.assert_private(result)

    def test_unknown_mode_or_conflicting_discovery_inputs_stop_before_curl(self):
        for mode in ("typo", "discover"):
            with self.subTest(mode=mode):
                result, observed = self.run_example(mode=mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertIsNone(observed)

    def test_http_error_and_redirect_hide_body(self):
        for status in ("302", "401", "429", "503"):
            with self.subTest(status=status):
                result, observed = self.run_example(status=status)
                self.assertNotEqual(result.returncode, 0)
                self.assertIsNotNone(observed)
                self.assertIn(status, result.stderr)
                self.assertEqual(result.stdout, "")
                self.assert_private(result)

    def test_transport_error_hides_body(self):
        result, _ = self.run_example(exit_code=28)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assert_private(result)

    def test_account_mismatch_and_invalid_response_stop(self):
        for kwargs in ({"expected": "acct_other"}, {"body": "private-name-fixture"}, {"body": "{}"}):
            with self.subTest(kwargs=kwargs):
                result, _ = self.run_example(**kwargs)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, "")
                self.assert_private(result)


if __name__ == "__main__":
    unittest.main()
