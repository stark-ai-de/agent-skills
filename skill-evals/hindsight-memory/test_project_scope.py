import datetime as dt
import importlib.util
from io import BytesIO
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch
import uuid

SCRIPTS = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts"
sys.path.insert(0, str(SCRIPTS))
import project_scope as scope
import session_hook
import build_parser
import mcp_launcher
import weekly


class ProjectScopeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / "any-project"
        self.sessions = self.root / "sessions"
        self.project.mkdir()
        self.sessions.mkdir()
        self.runtime = self.root / "runtime.env"
        self.runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-token\nHINDSIGHT_API_LLM_MODEL=synthetic-model\nHINDSIGHT_API_LLM_PROVIDER=openai-responses\nHINDSIGHT_API_EMBEDDINGS_PROVIDER=openai\nHINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL=http://127.0.0.1:11434/v1\nHINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL=bge-m3\n")
        self.runtime.chmod(0o600)
        self.extension = self.root / "private_policy.py"
        self.extension.write_text("# synthetic extension\n")
        self.file = self.root / "project.json"
        self.value = {"schemaVersion": 1, "enabled": True, "projectRoot": str(self.project), "sessionsRoot": str(self.sessions),
            "stateRoot": str(self.root / "state"), "runtimeEnv": str(self.runtime), "privatePolicyFile": str(self.extension),
            "endpoint": "http://127.0.0.1:18888", "bankId": "any-project", "container": "fixture-hindsight",
            "image": "ghcr.io/vectorize-io/hindsight:1.2.1@sha256:" + "a" * 64,
            "embeddingDigest": "b" * 64,
            "consent": {"status": "recorded", "contentScope": "codex-session-content"}}
        self.file.write_text(json.dumps(self.value))
        self.file.chmod(0o600)
        env = scope.environment(self.runtime)
        env.update({"HINDSIGHT_API_STORE_DOCUMENT_TEXT": "false", "HINDSIGHT_API_LLM_TRACE_ENABLED": "false",
                    "HINDSIGHT_API_OTEL_TRACES_ENABLED": "false", "HINDSIGHT_API_FAIL_ON_EXTRACTION_ERRORS": "true",
                    "HINDSIGHT_API_HOST": "127.0.0.1", "HINDSIGHT_CP_HOSTNAME": "127.0.0.1",
                    "HINDSIGHT_API_LOG_LEVEL": "warning", "HINDSIGHT_API_LLM_DEBUG_DUMP_4XX": "false",
                    "HINDSIGHT_API_TENANT_EXTENSION": "private_policy:PrivateTenantExtension",
                    "HINDSIGHT_API_OPERATION_VALIDATOR_EXTENSION": "private_policy:PrivateStorageValidator", "HINDSIGHT_API_PORT": "18888"})
        self.actual = {"image": self.value["image"], "env": [f"{k}={v}" for k, v in env.items()], "running": True,
                       "mounts": [{"Destination": "/hindsight/private_policy.py", "Source": str(self.extension), "RW": False}]}
        self.probe = patch.object(scope.subprocess, "run", side_effect=lambda *a, **k: types.SimpleNamespace(stdout=json.dumps(self.actual)))
        self.probe.start()
        self.addCleanup(self.probe.stop)
        self.model_digest = "b" * 64
        opener = Mock()
        opener.open.side_effect = lambda *a, **k: BytesIO(json.dumps({"models": [{"name": "bge-m3:latest", "digest": self.model_digest}]}).encode())
        model_probe = patch.object(scope.urllib.request, "build_opener", return_value=opener)
        model_probe.start()
        self.addCleanup(model_probe.stop)
        self.policy = scope.load(self.file)

    def evidence(self):
        path = self.root / "evidence.json"
        path.write_text(json.dumps({"schemaVersion": 1, "bindingSha256": scope.fingerprint(self.policy),
            "modelRouteReviewed": True, "checks": {key: True for key in ["retainReadback", "projectIsolation", "rawTextDisabled", "embeddingDimensions"]}}))
        path.chmod(0o600)
        return path

    def test_preview_is_read_only_and_enable_is_idempotent(self):
        evidence = self.evidence()
        self.assertEqual(scope.enable(self.policy, evidence)["status"], "planned")
        self.assertFalse(Path(self.policy["stateRoot"]).exists())
        self.assertEqual(scope.enable(self.policy, evidence, apply=True)["status"], "enabled")
        self.assertEqual(scope.enable(self.policy, evidence, apply=True)["status"], "unchanged")
        self.assertEqual(scope.doctor(self.policy)["status"], "ready")

    def test_effective_route_or_extension_change_invalidates_enablement(self):
        scope.enable(self.policy, self.evidence(), apply=True)
        self.actual["env"].append("HINDSIGHT_API_EXTRA_SETTING=changed")
        self.assertEqual(scope.doctor(self.policy)["status"], "unverified")
        self.actual["env"].pop()
        self.extension.write_text("# changed privacy implementation\n")
        self.assertEqual(scope.doctor(self.policy)["status"], "unverified")

    def test_workspace_repository_switches_preserve_only_the_qualified_maximum_scope(self):
        self.policy.update(kind="hindsight-workspace", roots=[str(self.project)], exclude=[], worktrees={}, repositories={})
        scope.enable(self.policy, self.evidence(), apply=True)
        qualified = scope.fingerprint(self.policy)
        for enabled in (False, True):
            self.policy["repositories"] = {str(self.project): {"enabled": enabled}}
            self.assertEqual(scope.fingerprint(self.policy), qualified)
            scope.active(self.policy)
        for field, value in (("exclude", [str(self.project)]), ("roots", [str(self.root)]),
                             ("worktrees", {str(self.root / "linked"): str(self.project)}),
                             ("repositories", {str(self.project): {"enabled": False, "bankId": "different"}}),
                             ("repositories", {str(self.project): {"enabled": False, "repoId": "different"}})):
            with self.subTest(field=field, value=value):
                changed = {**self.policy, field: value}
                self.assertNotEqual(scope.fingerprint(changed), qualified)
                with self.assertRaisesRegex(ValueError, "binding changed"):
                    scope.active(changed)

    def test_declared_runtime_must_match_running_container(self):
        scope.enable(self.policy, self.evidence(), apply=True)
        self.runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-token\nHINDSIGHT_API_LLM_MODEL=different\nHINDSIGHT_API_LLM_PROVIDER=ollama\n")
        with self.assertRaisesRegex(ValueError, "running route"):
            scope.active(self.policy)

    def test_private_mount_and_image_are_required(self):
        self.actual["mounts"][0]["RW"] = True
        with self.assertRaises(ValueError):
            scope.fingerprint(self.policy)
        self.actual["mounts"][0]["RW"] = False
        self.actual["image"] = "unqualified:latest"
        with self.assertRaises(ValueError):
            scope.fingerprint(self.policy)

    def test_missing_consent_and_unsafe_paths_are_rejected(self):
        self.value["consent"]["status"] = "unreviewed"
        self.file.write_text(json.dumps(self.value))
        with self.assertRaises(ValueError):
            scope.load(self.file)
        self.file.chmod(0o644)
        with self.assertRaises(ValueError):
            scope.load(self.file)

    def test_incomplete_or_wrong_binding_evidence_does_not_enable(self):
        evidence = self.evidence()
        value = json.loads(evidence.read_text())
        value["checks"]["retainReadback"] = False
        evidence.write_text(json.dumps(value))
        with self.assertRaises(ValueError):
            scope.enable(self.policy, evidence, apply=True)
        self.assertFalse(Path(self.policy["stateRoot"]).exists())

    def test_hook_supports_any_explicit_project_and_rejects_other_roots(self):
        scope.enable(self.policy, self.evidence(), apply=True)
        session_id = str(uuid.uuid4())
        transcript = self.sessions / "synthetic.jsonl"
        transcript.write_text(json.dumps({"type": "session_meta", "payload": {"id": session_id, "source": "cli",
            "cwd": str(self.project), "timestamp": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=1)).isoformat()}}) + "\n")
        event = {"hook_event_name": "SessionEnd", "session_id": session_id, "transcript_path": str(transcript), "cwd": str(self.project)}
        self.assertTrue(session_hook.queue_session(event, self.root, self.file))
        event["cwd"] = str(self.root)
        self.assertFalse(session_hook.queue_session(event, self.root, self.file))

    def test_nested_repository_and_worktree_require_their_own_grant(self):
        scope.enable(self.policy, self.evidence(), apply=True)
        (self.project / ".git").mkdir()
        for marker_kind in ("directory", "file"):
            with self.subTest(marker_kind=marker_kind):
                nested = self.project / marker_kind
                (nested / "src").mkdir(parents=True)
                if marker_kind == "directory":
                    (nested / ".git").mkdir()
                else:
                    (nested / ".git").write_text("gitdir: /synthetic/other-worktree\n")
                cwd = nested / "src"
                session_id = str(uuid.uuid4())
                transcript = self.sessions / f"{marker_kind}.jsonl"
                transcript.write_text(json.dumps({"type": "session_meta", "payload": {"id": session_id,
                    "source": "cli", "cwd": str(cwd),
                    "timestamp": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=1)).isoformat()}}) + "\n")
                record = {"session_id": session_id, "transcript_path": str(transcript)}
                event = {"hook_event_name": "SessionEnd", "cwd": str(cwd), **record}
                self.assertFalse(session_hook.queue_session(event, self.root, self.file))
                event["cwd"] = str(self.project)
                self.assertFalse(session_hook.queue_session(event, self.root, self.file))
                with self.assertRaises(ValueError):
                    weekly.validate_record(record, self.root, scope.active(self.policy), self.policy)
                with patch.object(mcp_launcher.Path, "cwd", return_value=cwd), \
                        patch.object(mcp_launcher.os, "execve") as launch:
                    with self.assertRaises(ValueError):
                        mcp_launcher.launch(self.runtime, "/fixture/proxy", self.file)
                    launch.assert_not_called()

    def test_ordinary_subdirectory_is_still_allowed(self):
        scope.enable(self.policy, self.evidence(), apply=True)
        (self.project / ".git").mkdir()
        cwd = self.project / "src/package"
        cwd.mkdir(parents=True)
        with patch.object(mcp_launcher.Path, "cwd", return_value=cwd), \
                patch.object(mcp_launcher.os, "execve") as launch:
            mcp_launcher.launch(self.runtime, "/fixture/proxy", self.file)
            launch.assert_called_once()

    def test_nested_root_can_use_its_own_explicit_grant(self):
        nested = self.project / "approved-child"
        (nested / ".git").mkdir(parents=True)
        self.value["projectRoot"] = str(nested)
        self.value["bankId"] = "approved-child"
        self.file.write_text(json.dumps(self.value))
        self.policy = scope.load(self.file)
        scope.enable(self.policy, self.evidence(), apply=True)
        with patch.object(mcp_launcher.Path, "cwd", return_value=nested), \
                patch.object(mcp_launcher.os, "execve") as launch:
            mcp_launcher.launch(self.runtime, "/fixture/proxy", self.file)
            self.assertEqual(launch.call_args.args[1][-1], "http://127.0.0.1:18888/mcp/approved-child/")

    def test_policy_changes_stop_a_running_batch_and_preserve_pending_sessions(self):
        for change in ("disabled", "manual", "destination", "reactivated"):
            with self.subTest(change=change):
                self.value["enabled"] = True
                self.value["consent"]["contentScope"] = "codex-session-content"
                self.value["bankId"] = "any-project"
                self.value["stateRoot"] = str(self.root / change)
                self.file.write_text(json.dumps(self.value))
                self.policy = scope.load(self.file)
                scope.enable(self.policy, self.evidence(), apply=True)
                state = Path(self.policy["stateRoot"])
                queue = state / "queue"
                queue.mkdir()
                sessions = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]
                for session_id in sessions:
                    transcript = self.sessions / f"{session_id}.jsonl"
                    transcript.write_text(json.dumps({"type": "session_meta", "payload": {"id": session_id,
                        "source": "cli", "cwd": str(self.project),
                        "timestamp": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=1)).isoformat()}}) + "\n")
                    (queue / f"{session_id}.json").write_text(json.dumps({"session_id": session_id, "transcript_path": str(transcript)}))
                dispatched = []

                def docker(argv, **kwargs):
                    if argv[1] == "inspect":
                        return types.SimpleNamespace(stdout=json.dumps(self.actual))
                    dispatched.append(argv)
                    if change == "disabled":
                        self.value["enabled"] = False
                    elif change == "manual":
                        self.value["consent"]["contentScope"] = "manual-memory"
                    elif change == "destination":
                        self.value["bankId"] = "other-bank"
                    else:
                        marker = state / "activation.json"
                        value = json.loads(marker.read_text())
                        value["enabledAt"] = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=1)).isoformat()
                        marker.write_text(json.dumps(value))
                    self.file.write_text(json.dumps(self.value))
                    if "ingest" in argv:
                        session_id = argv[argv.index("--session-id") + 1]
                        output = {"session_id": session_id, "sha256": hashlib.sha256((self.sessions / f"{session_id}.jsonl").read_bytes()).hexdigest()}
                    else:
                        output = []
                    return types.SimpleNamespace(returncode=0, stdout=json.dumps(output))

                args = types.SimpleNamespace(policy=self.file, docker="docker", compose="compose.yaml", worker="worker.py", parser="parser.cjs")
                with patch.object(weekly.subprocess, "run", side_effect=docker):
                    with self.assertRaisesRegex(ValueError, "pending imports"):
                        weekly.run(args)
                self.assertEqual(len(dispatched), 1)
                self.assertFalse((queue / f"{sessions[0]}.json").exists())
                self.assertTrue((queue / f"{sessions[1]}.json").exists())
                self.assertEqual(list(json.loads((state / "imported.json").read_text())), [sessions[0]])
                self.assertFalse((state / "reflections").exists())

    def test_parser_preview_never_downloads_or_builds(self):
        with patch.object(build_parser.urllib.request, "urlopen", side_effect=AssertionError("network")):
            result = build_parser.build(self.root / "parser.cjs")
        self.assertEqual(result["status"], "planned")
        self.assertFalse((self.root / "parser.cjs").exists())

    def test_manual_memory_grant_never_queues_sessions(self):
        self.value["consent"]["contentScope"] = "manual-memory"
        self.file.write_text(json.dumps(self.value))
        with patch.object(scope, "active", side_effect=AssertionError("must not activate session ingestion")):
            self.assertFalse(session_hook.queue_session({}, self.root, self.file))

    def test_disabled_project_does_not_require_docker(self):
        self.policy["enabled"] = False
        with patch.object(scope.subprocess, "run", side_effect=AssertionError("docker")):
            self.assertEqual(scope.doctor(self.policy)["status"], "disabled")

    def test_changed_model_alias_stops_existing_grant(self):
        scope.enable(self.policy, self.evidence(), apply=True)
        self.model_digest = "c" * 64
        with self.assertRaisesRegex(ValueError, "model identity"):
            scope.active(self.policy)

    def test_mcp_is_bound_to_the_enabled_project(self):
        scope.enable(self.policy, self.evidence(), apply=True)
        with patch.object(mcp_launcher.Path, "cwd", return_value=self.root), \
                patch.object(mcp_launcher.os, "execve") as launch:
            with self.assertRaises(ValueError):
                mcp_launcher.launch(self.runtime, "/fixture/proxy", self.file)
            launch.assert_not_called()
        with patch.object(mcp_launcher.Path, "cwd", return_value=self.project), \
                patch.object(mcp_launcher.os, "execve") as launch:
            mcp_launcher.launch(self.runtime, "/fixture/proxy", self.file)
            self.assertEqual(launch.call_args.args[1][-1], "http://127.0.0.1:18888/mcp/any-project/")


if __name__ == "__main__":
    unittest.main()
