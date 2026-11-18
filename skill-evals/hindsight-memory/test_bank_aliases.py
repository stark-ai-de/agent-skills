import datetime as dt
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
import urllib.error

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/diagnostics"))
import bank_aliases
from bank_aliases import reconcile
import project_scope
import workspace_scope


class BankAliasTests(unittest.TestCase):
    def test_preview_and_missing_banks_never_write(self):
        for response, expected in (((200, {"bank_id": "project-1", "aliases": []}), "planned"), ((404, None), "bank_missing")):
            request = Mock(return_value=response)
            self.assertEqual(reconcile(request, "project-1", "/dev/example", apply=False, revalidate=Mock()), expected)
            request.assert_called_once_with("project-1")

    def test_collision_uses_stable_suffix_and_verifies_primary(self):
        aliases = []

        def endpoint(bank, payload=None):
            self.assertEqual(bank, "project-1")
            if payload is None:
                return 200, {"bank_id": bank, "aliases": aliases}
            if payload["alias"] == "example":
                return 409, None
            self.assertRegex(payload["alias"], r"^example-[0-9a-f]{12}$")
            aliases.append(payload)
            return 201, None

        guard = Mock()
        self.assertEqual(reconcile(endpoint, "project-1", "/dev/example", apply=True, revalidate=guard), "named")
        self.assertEqual(guard.call_count, 2)
        guard.reset_mock()
        self.assertEqual(reconcile(endpoint, "project-1", "/dev/example", apply=True, revalidate=guard), "already_named")
        guard.assert_not_called()

    def test_existing_secondary_alias_is_promoted_in_place(self):
        for alias in ("example", "example-" + hashlib.sha256(b"project-1").hexdigest()[:12]):
            with self.subTest(alias=alias):
                request = Mock(side_effect=[
                    (200, {"bank_id": "project-1", "aliases": [{"alias": alias, "primary": False}]}),
                    *([(409, None)] if alias != "example" else []),
                    (200, {}),
                    (200, {"bank_id": "project-1", "aliases": [{"alias": alias, "primary": True}]}),
                ])
                self.assertEqual(reconcile(request, "project-1", "/dev/example", apply=True, revalidate=Mock()), "named")
                request.assert_any_call("project-1", {"primary": True}, alias=alias)

    def test_existing_primary_and_canonical_name_are_preserved(self):
        for bank, aliases in (("project-1", [{"alias": "owner-name", "primary": True}]), ("example", [])):
            request = Mock(return_value=(200, {"bank_id": bank, "aliases": aliases}))
            guard = Mock()
            self.assertEqual(reconcile(request, bank, "/dev/example", apply=True, revalidate=guard), "already_named")
            request.assert_called_once_with(bank)
            guard.assert_not_called()

    def test_unverifiable_response_never_writes(self):
        for status, info in (
            (403, None), (200, None), (200, []),
            (200, {"bank_id": "other", "aliases": []}),
            (200, {"bank_id": "project-1", "aliases": [None]}),
            (200, {"bank_id": "project-1", "aliases": [{"alias": "example", "primary": "false"}]}),
            (200, {"bank_id": "project-1", "aliases": [{"alias": "same", "primary": False}] * 2}),
        ):
            with self.subTest(status=status, info=info):
                request = Mock(return_value=(status, info))
                with self.assertRaises(ValueError):
                    reconcile(request, "project-1", "/dev/example", apply=True, revalidate=Mock())
                request.assert_called_once_with("project-1")

    def test_write_failure_and_wrong_readback_are_not_success(self):
        for responses in (
            [(500, None)],
            [(201, {}), (200, {"bank_id": "other", "aliases": [{"alias": "example", "primary": True}]})],
            [(201, {}), (200, {"bank_id": "project-1", "aliases": []})],
        ):
            request = Mock(side_effect=[(200, {"bank_id": "project-1", "aliases": []}), *responses])
            with self.assertRaises(ValueError):
                reconcile(request, "project-1", "/dev/example", apply=True, revalidate=Mock())

    def test_both_collisions_stop_after_two_attempts(self):
        request = Mock(side_effect=[(200, {"bank_id": "project-1", "aliases": []}), (409, None), (409, None)])
        self.assertEqual(reconcile(request, "project-1", "/dev/example", apply=True, revalidate=Mock()), "collision")
        self.assertEqual(request.call_count, 3)


class AliasRunTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.root = self.home / "dev"
        self.project = self.root / "example"
        self.project.mkdir(parents=True)
        subprocess.run(["git", "init", "-q", str(self.project)], check=True, capture_output=True)
        self.state = self.home / "state"
        self.runtime = self.home / "runtime.env"
        self.runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-token\nHINDSIGHT_API_LLM_PROVIDER=ollama\nHINDSIGHT_API_LLM_MODEL=synthetic\n")
        self.runtime.chmod(0o600)
        self.policy_file = self.home / "workspace.json"
        self.value = {"schemaVersion": 1, "kind": "hindsight-workspace", "enabled": True,
                      "roots": [str(self.root)], "exclude": [], "worktrees": {}, "repositories": {}, "bankPrefix": "project",
                      "sessionsRoots": {"codex": [str(self.home / "sessions")]},
                      "stateRoot": str(self.state), "runtimeEnv": str(self.runtime),
                      "privatePolicyFile": str(self.home / "private_policy.py"),
                      "endpoint": "http://127.0.0.1:18888", "container": "synthetic-hindsight",
                      "image": "ghcr.io/vectorize-io/hindsight:1.2.1@sha256:" + "a" * 64,
                      "consent": {"status": "recorded", "contentScope": "compact-session-outcomes"}}
        self.save_policy()
        self.binding = workspace_scope.resolve(workspace_scope.load(self.policy_file), self.project, register=True)
        self.registry_file = self.state / "repositories.json"
        self.registry = json.loads(self.registry_file.read_text())
        self.grant = self.state / "activation.json"
        self.grant.write_text(json.dumps({"schemaVersion": 1, "enabledAt": dt.datetime.now(dt.timezone.utc).isoformat(),
                                         "bindingSha256": "a" * 64}))
        self.grant.chmod(0o600)
        self.fingerprint_patch = patch.object(project_scope, "fingerprint", return_value="a" * 64)
        self.fingerprint = self.fingerprint_patch.start()
        self.addCleanup(self.fingerprint_patch.stop)
        self.aliases = []
        self.mutate = None
        self.request = Mock(side_effect=self.endpoint)
        self.client_patch = patch.object(bank_aliases, "client", return_value=self.request)
        self.client = self.client_patch.start()
        self.addCleanup(self.client_patch.stop)

    def save_policy(self):
        self.policy_file.write_text(json.dumps(self.value))
        self.policy_file.chmod(0o600)

    def endpoint(self, bank, payload=None, *, alias=None):
        self.assertEqual(bank, self.binding["bankId"])
        if payload is None:
            if self.mutate is not None:
                mutate, self.mutate = self.mutate, None
                mutate()
            return 200, {"bank_id": bank, "aliases": self.aliases}
        self.aliases.append(payload)
        return 201, None

    def run_aliases(self, apply=True):
        return bank_aliases.run(self.policy_file, "docker", apply)

    def test_preview_is_read_only_and_apply_is_idempotent(self):
        before = {path.name: path.read_bytes() for path in self.state.iterdir()}
        self.assertEqual(self.run_aliases(apply=False), {"planned": 1})
        self.assertEqual(self.run_aliases(), {"named": 1})
        self.assertEqual(self.run_aliases(), {"already_named": 1})
        self.assertEqual({path.name: path.read_bytes() for path in self.state.iterdir()}, before)
        self.assertEqual(len(self.aliases), 1)

    def test_stale_overrides_and_reassociation_make_no_request(self):
        for overrides in (
            {str(self.project): {"bankId": "replacement-bank"}},
            {str(self.project): {"repoId": "replacement-repository"}},
            {str(self.root / "moved"): {"repoId": self.binding["repoId"]}},
        ):
            with self.subTest(overrides=overrides):
                self.value["repositories"] = overrides
                self.save_policy()
                with self.assertRaisesRegex(ValueError, "mapping changed"):
                    self.run_aliases()
                self.request.assert_not_called()

    def test_invalid_or_ambiguous_registry_makes_no_request(self):
        entry = self.registry[self.binding["repoId"]]
        for registry in (
            {**self.registry, "second": {**entry, "bankId": "other-bank"}},
            {**self.registry, "second": {**entry, "root": str(self.root / "other")}},
            {"invalid/id": entry},
            {"entry": {**entry, "device": True}},
            {"entry": {**entry, "extra": "foreign"}},
        ):
            with self.subTest(registry=registry):
                self.registry_file.write_text(json.dumps(registry))
                with self.assertRaises(ValueError):
                    self.run_aliases()
                self.request.assert_not_called()

    def test_excluded_and_disabled_scopes_make_no_request(self):
        self.value["exclude"] = [str(self.project)]
        self.save_policy()
        self.assertEqual(self.run_aliases(), {})
        self.value["exclude"] = []
        self.value["repositories"] = {str(self.project): {"enabled": False}}
        self.save_policy()
        self.assertEqual(self.run_aliases(), {})
        with patch.dict(os.environ, {"HINDSIGHT_MEMORY_DISABLED": "1"}):
            self.assertEqual(self.run_aliases(), {"disabled": 1})
        self.request.assert_not_called()

    def test_policy_revocation_during_load_is_rejected(self):
        load = workspace_scope.load

        def revoke(path):
            policy = load(path)
            self.value["enabled"] = False
            self.save_policy()
            return policy

        with patch.object(workspace_scope, "load", side_effect=revoke):
            with self.assertRaisesRegex(ValueError, "policy changed"):
                self.run_aliases()
        self.request.assert_not_called()

    def test_changed_private_inputs_between_read_and_write_abort(self):
        for path in (self.policy_file, self.grant, self.runtime, self.registry_file):
            with self.subTest(path=path.name):
                original = path.read_bytes()
                self.mutate = lambda: path.write_bytes(original + b"\n")
                self.request.reset_mock()
                with self.assertRaisesRegex(ValueError, "binding changed"):
                    self.run_aliases()
                self.request.assert_called_once_with(self.binding["bankId"])
                path.write_bytes(original)
        self.assertEqual(self.aliases, [])

    def test_runtime_change_during_qualification_prevents_client_creation(self):
        self.fingerprint.side_effect = lambda *args: (self.runtime.write_text(self.runtime.read_text() + "\n") and "a" * 64)
        with self.assertRaisesRegex(ValueError, "binding changed"):
            self.run_aliases()
        self.client.assert_not_called()

    def test_route_and_git_identity_are_rechecked_before_write(self):
        self.fingerprint.side_effect = ["a" * 64, "b" * 64]
        with self.assertRaisesRegex(ValueError, "binding changed"):
            self.run_aliases()
        self.request.assert_called_once_with(self.binding["bankId"])
        self.fingerprint.side_effect = None
        self.request.reset_mock()

        def replace_repository():
            (self.project / ".git").rename(self.project / "previous.git")
            subprocess.run(["git", "init", "-q", str(self.project)], check=True, capture_output=True)

        self.mutate = replace_repository
        with self.assertRaisesRegex(ValueError, "identity or eligibility changed"):
            self.run_aliases()
        self.request.assert_called_once_with(self.binding["bankId"])
        self.assertEqual(self.aliases, [])


class AliasClientTests(unittest.TestCase):
    def test_get_create_and_promote_use_pinned_api_contract(self):
        requests = []

        def response(request, **kwargs):
            requests.append(request)
            result = BytesIO(b'{"bank_id":"project-1","aliases":[]}')
            result.status = 200
            return result

        opener = Mock()
        opener.open.side_effect = response
        with patch.object(bank_aliases.urllib.request, "build_opener", return_value=opener) as build:
            request = bank_aliases.client("http://127.0.0.1:18888", "synthetic-token")
            request("project-1")
            request("project-1", {"alias": "example", "primary": True})
            request("project-1", {"primary": True}, alias="example name")
        self.assertEqual([item.get_method() for item in requests], ["GET", "POST", "PATCH"])
        self.assertTrue(requests[2].full_url.endswith("/banks/project-1/aliases/example%20name"))
        self.assertEqual(json.loads(requests[2].data), {"primary": True})
        self.assertEqual(requests[0].get_header("Authorization"), "Bearer synthetic-token")
        self.assertEqual(build.call_args.args[0].proxies, {})
        self.assertIsNone(build.call_args.args[1].redirect_request(None, None, 302, "redirect", {}, "http://example.invalid"))

    def test_http_errors_are_bounded_and_do_not_expose_response_body(self):
        opener = Mock()
        opener.open.side_effect = urllib.error.HTTPError("http://127.0.0.1", 409, "private details", {}, BytesIO(b"private details"))
        with patch.object(bank_aliases.urllib.request, "build_opener", return_value=opener):
            self.assertEqual(bank_aliases.client("http://127.0.0.1:18888", "synthetic-token")("project-1"), (409, None))
        body = BytesIO(b"x" * 1048577)
        body.status = 200
        opener.open.side_effect = None
        opener.open.return_value = body
        with patch.object(bank_aliases.urllib.request, "build_opener", return_value=opener):
            with self.assertRaisesRegex(ValueError, "oversized bank response"):
                bank_aliases.client("http://127.0.0.1:18888", "synthetic-token")("project-1")
