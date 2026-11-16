import datetime as dt
import hashlib
from contextlib import redirect_stdout
from io import StringIO
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts"
sys.path.insert(0, str(SCRIPTS))
import mcp_launcher
import project_scope
import session_hook
import weekly
import worker
import workspace_scope as scope

SID = "12345678-1234-1234-1234-123456789abc"
CUTOFF = dt.datetime.fromisoformat("2026-11-16T00:00:00+00:00")


class WorkspaceScopeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.root = self.home / "dev"
        self.root.mkdir()
        self.project = self.repository(self.root / "project")
        self.sessions = self.home / "sessions"
        self.sessions.mkdir()
        self.state = self.home / "state"
        self.state.mkdir(mode=0o700)
        self.runtime = self.home / "runtime.env"
        self.runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-token\n")
        self.runtime.chmod(0o600)
        self.file = self.home / "workspace.json"
        self.value = {"schemaVersion": 1, "kind": "hindsight-workspace", "enabled": True,
                      "roots": [str(self.root)], "exclude": [], "worktrees": {}, "repositories": {}, "bankPrefix": "project",
                      "sessionsRoots": {"codex": [str(self.sessions)], "pi": [str(self.sessions)]},
                      "stateRoot": str(self.state), "runtimeEnv": str(self.runtime), "privatePolicyFile": str(SCRIPTS / "private_policy.py"),
                      "endpoint": "http://127.0.0.1:18888", "container": "synthetic-hindsight",
                      "image": "ghcr.io/vectorize-io/hindsight:1.2.1@sha256:" + "a" * 64,
                      "consent": {"status": "recorded", "contentScope": "compact-session-outcomes"}}
        self.save()
        self.activation = self.state / "activation.json"
        self.activation.write_text(json.dumps({"schemaVersion": 1, "enabledAt": CUTOFF.isoformat(), "bindingSha256": "a" * 64}))
        self.activation.chmod(0o600)
        self.transcript = self.sessions / "synthetic.jsonl"
        self.records = [{"type": "session_meta", "payload": {"id": SID, "source": "cli", "cwd": str(self.project), "timestamp": "2026-11-16T10:00:00Z"}},
                        {"type": "response_item", "timestamp": "2026-11-16T10:01:00Z", "payload": {"type": "message", "role": "user", "content": [{"type": "input_text", "text": "Repair the issue"}]}},
                        {"type": "response_item", "timestamp": "2026-11-16T10:02:00Z", "payload": {"type": "message", "role": "assistant", "phase": "final", "content": [{"type": "output_text", "text": "Fixed parser.py; the regression test passes."}]}}]
        self.write_transcript()
        self.event = {"hook_event_name": "Stop", "source": "codex", "session_id": SID, "cwd": str(self.project), "transcript_path": str(self.transcript)}

    def repository(self, path):
        subprocess.run(["git", "init", "-q", str(path)], check=True, capture_output=True)
        return path

    def save(self):
        self.file.write_text(json.dumps(self.value))
        self.file.chmod(0o600)
        self.policy = scope.load(self.file)

    def write_transcript(self):
        self.transcript.write_text("\n".join(json.dumps(item) for item in self.records) + "\n")
        self.transcript.chmod(0o600)

    def args(self, **kwargs):
        return SimpleNamespace(workspace_policy=self.file, policy=None, docker="docker", compose="compose.yaml",
                               worker=str(SCRIPTS / "worker.py"), parser=None, mode="intake", memory_state=self.state,
                               max_sessions=kwargs.get("max_sessions", 8), max_seconds=20)

    def test_hook_is_local_and_repeat_replaces_only_its_private_reference(self):
        with patch.object(project_scope, "fingerprint", side_effect=AssertionError("service probe")), \
                patch.object(scope, "active", side_effect=AssertionError("route probe")):
            self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
            first = list((self.state / "queue").glob("*.json"))
            self.assertEqual(len(first), 1)
            initial = json.loads(first[0].read_text())
            self.records.append({"type": "event_msg", "timestamp": "2026-11-16T10:03:00Z", "payload": {"type": "task_complete"}})
            self.write_transcript()
            self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        current = json.loads(first[0].read_text())
        self.assertGreater(current["byte_length"], initial["byte_length"])
        self.assertEqual(current["repository"], initial["repository"])
        self.assertNotIn("Fixed parser", first[0].read_text())
        self.assertEqual(first[0].stat().st_mode & 0o777, 0o600)

    def test_explicit_missing_disabled_and_session_optout_never_fall_back(self):
        for path in (self.home / "missing.json",):
            self.assertFalse(session_hook.queue_session(self.event, self.home, workspace_policy_path=path))
        self.value = {"schemaVersion": 1, "kind": "hindsight-workspace", "enabled": False}
        self.save()
        with patch.object(scope, "git_identity", side_effect=AssertionError("must not resolve")):
            self.assertFalse(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
            self.assertEqual(weekly.run(self.args())["status"], "inactive")
        with patch.dict(os.environ, {"HINDSIGHT_MEMORY_DISABLED": "1"}):
            self.assertFalse(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        self.assertFalse((self.state / "queue").exists())

    def test_exact_root_exclusions_and_independent_clones_have_distinct_banks(self):
        first = scope.resolve(self.policy, self.project, register=True)
        second_project = self.repository(self.root / "other")
        second = scope.resolve(self.policy, second_project, register=True)
        self.assertNotEqual(first["bankId"], second["bankId"])
        nested = self.repository(self.project / "vendor")
        self.value["exclude"] = [str(nested)]
        self.save()
        with self.assertRaisesRegex(ValueError, "excluded"):
            scope.resolve(self.policy, nested)
        self.assertEqual(scope.resolve(self.policy, self.project), first)

    def test_worktree_needs_explicit_matching_common_directory(self):
        scope.resolve(self.policy, self.project, register=True)
        worktree = self.home / "worktree"
        worktree.mkdir()
        metadata = self.project / ".git/worktrees/feature"
        metadata.mkdir(parents=True)
        (metadata / "commondir").write_text("../..\n")
        (metadata / "HEAD").write_text("ref: refs/heads/feature\n")
        (metadata / "gitdir").write_text(str(worktree / ".git") + "\n")
        (worktree / ".git").write_text("gitdir: " + str(metadata) + "\n")
        with self.assertRaisesRegex(ValueError, "explicit mapping"):
            scope.resolve(self.policy, worktree)
        self.value["worktrees"][str(worktree)] = str(self.project)
        self.save()
        resolved = scope.resolve(self.policy, worktree)
        self.assertEqual(resolved["bankId"], scope.resolve(self.policy, self.project)["bankId"])
        other = self.repository(self.root / "other")
        self.value["worktrees"][str(worktree)] = str(other)
        self.save()
        with self.assertRaisesRegex(ValueError, "does not belong"):
            scope.resolve(self.policy, worktree)

    def test_move_and_reclone_require_explicit_reassociation(self):
        original = scope.resolve(self.policy, self.project, register=True)
        moved = self.root / "renamed"
        self.project.rename(moved)
        with self.assertRaisesRegex(ValueError, "moved repository"):
            scope.resolve(self.policy, moved, register=True)
        self.value["repositories"][str(moved)] = {"repoId": original["repoId"]}
        self.save()
        self.assertEqual(scope.resolve(self.policy, moved, register=True)["bankId"], original["bankId"])
        (moved / ".git").rename(self.home / "old-git")
        self.repository(moved)
        del self.value["repositories"][str(moved)]
        self.save()
        with self.assertRaisesRegex(ValueError, "replaced"):
            scope.resolve(self.policy, moved, register=True)

    def test_cutoff_subagent_and_wrong_header_scope_are_rejected(self):
        self.records[0]["payload"]["timestamp"] = "2026-11-15T00:00:00Z"
        self.write_transcript()
        self.assertFalse(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        self.records[0]["payload"]["timestamp"] = "2026-11-16T10:00:00Z"
        self.records[0]["payload"]["source"] = {"subagent": "child"}
        self.write_transcript()
        self.assertFalse(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))

    def test_native_pi_queue_uses_its_own_header_and_leaf(self):
        self.records = [{"type": "session", "version": 3, "id": SID, "cwd": str(self.project), "timestamp": "2026-11-16T10:00:00Z"},
                        {"type": "message", "id": "leaf", "parentId": None, "timestamp": "2026-11-16T10:01:00Z", "message": {"role": "assistant", "stopReason": "stop", "content": [{"type": "text", "text": "Outcome"}]}}]
        self.write_transcript()
        self.event.update(source="pi", leaf_id="leaf", completion_status="complete")
        self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        record = json.loads(next((self.state / "queue").glob("*.json")).read_text())
        self.assertEqual((record["source"], record["leaf_id"]), ("pi", "leaf"))

    def test_intake_calls_no_reflection_and_acknowledges_compact_documents(self):
        self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        calls = []
        def response(endpoint, body=None):
            if body:
                calls.append(body)
                return {"success": True, "async": False}
            return {"id": endpoint.removeprefix("/documents/"), "memory_unit_count": 1}
        def dispatch(args, token, action, extra, transcript=None):
            self.assertEqual(action, "ingest")
            return worker.ingest(transcript, SID, job=args.memory_job)
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker", side_effect=dispatch), patch.object(worker, "request", side_effect=response):
            self.assertEqual(weekly.run(self.args())["status"], "complete")
            self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
            self.assertEqual(weekly.run(self.args())["status"], "complete")
        self.assertEqual(len(calls), 1)
        self.assertIn("Fixed parser.py", calls[0]["items"][0]["content"])
        self.assertFalse(list((self.state / "queue").glob("*.json")))
        self.assertFalse((self.state / "reflections").exists())

    def test_worker_revalidates_binding_and_preserves_excluded_pending_record(self):
        self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        args = self.args()
        args.memory_scope, args.memory_cutoff = self.policy, CUTOFF
        with patch.object(scope, "active", side_effect=ValueError("changed route")), patch.object(weekly.subprocess, "run") as run:
            with self.assertRaisesRegex(ValueError, "changed route"):
                weekly.call_worker(args, "synthetic", "ingest", [])
            run.assert_not_called()
        self.value["exclude"] = [str(self.project)]
        self.save()
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker") as dispatch:
            self.assertEqual(weekly.run(self.args())["status"], "pending")
            dispatch.assert_not_called()
        self.assertEqual(len(list((self.state / "queue").glob("*.json"))), 1)

    def test_stop_cli_emits_json_without_requesting_continuation(self):
        result = subprocess.run([sys.executable, "-B", str(SCRIPTS / "session_hook.py"), "--workspace-policy", str(self.home / "absent")],
                                input=json.dumps(self.event), text=True, capture_output=True, check=True)
        self.assertEqual(result.stdout, "{}\n")

    def test_mcp_uses_workspace_credentials_bank_and_current_repository(self):
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(Path, "cwd", return_value=self.project), patch.object(mcp_launcher.os, "execve") as execute:
            mcp_launcher.launch(self.home / "wrong-legacy-runtime", "/synthetic/proxy", workspace_policy_path=self.file)
        self.assertEqual(execute.call_args.args[2]["API_ACCESS_TOKEN"], "synthetic-token")
        bank = scope.resolve(self.policy, self.project)["bankId"]
        self.assertIn("/mcp/" + bank + "/", execute.call_args.args[1][-1])

    def test_registry_lock_contention_does_not_wait_in_a_hook(self):
        with patch.object(scope.fcntl, "flock", side_effect=BlockingIOError("busy")) as lock:
            self.assertFalse(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        self.assertTrue(lock.call_args.args[1] & scope.fcntl.LOCK_NB)

    def test_git_identity_ignores_inherited_git_configuration_and_selectors(self):
        other = self.repository(self.root / "other")
        with patch.dict(os.environ, {"GIT_DIR": str(other / ".git"), "GIT_WORK_TREE": str(other),
                                    "GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "core.bare", "GIT_CONFIG_VALUE_0": "true",
                                    "GIT_CONFIG_PARAMETERS": "malformed value"}):
            self.assertEqual(scope.git_identity(self.project)["root"], str(self.project))

    def test_generated_id_cannot_overwrite_reassociated_registry_entry(self):
        original = scope.resolve(self.policy, self.project, register=True)
        moved = self.root / "moved"
        self.project.rename(moved)
        self.value["repositories"][str(moved)] = {"repoId": original["repoId"]}
        self.save()
        scope.resolve(self.policy, moved, register=True)
        self.repository(self.project)
        with self.assertRaisesRegex(ValueError, "ID collision"):
            scope.resolve(self.policy, self.project, register=True)
        registry_file = self.state / "repositories.json"
        registry = json.loads(registry_file.read_text())
        registry["duplicate"] = registry[original["repoId"]]
        registry_file.write_text(json.dumps(registry))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            scope.resolve(self.policy, moved)

    def test_partial_and_delayed_final_flushes_are_retried_from_latest_complete_prefix(self):
        final = {"type": "response_item", "timestamp": "2026-11-16T10:04:00Z", "payload": {"type": "message", "role": "assistant", "phase": "final", "content": [{"type": "output_text", "text": "Delayed final observation"}]}}
        raw_final = (json.dumps(final) + "\n").encode()
        with self.transcript.open("ab") as stream:
            stream.write(raw_final[:20])
        self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        bodies = []
        def response(endpoint, body=None):
            if body:
                bodies.append(body)
                return {"success": True, "async": False}
            return {"id": endpoint.removeprefix("/documents/"), "memory_unit_count": 1}
        def dispatch(args, token, action, extra, transcript=None):
            return worker.ingest(transcript, SID, job=args.memory_job)
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker", side_effect=dispatch), patch.object(worker, "request", side_effect=response):
            self.assertEqual(weekly.run(self.args())["status"], "pending")
            with self.transcript.open("ab") as stream:
                stream.write(raw_final[20:])
            self.assertEqual(weekly.run(self.args())["status"], "complete")
        self.assertEqual(len(bodies), 2)
        self.assertIn("Delayed final", bodies[-1]["items"][0]["content"])

    def test_paused_capture_checkpoint_cannot_ingest_future_turn_but_later_checkpoint_can(self):
        with patch.object(session_hook.datetime, "datetime", wraps=dt.datetime) as clock:
            clock.now.return_value = dt.datetime.fromisoformat("2026-11-16T10:03:00+00:00")
            self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        self.records.extend([
            {"type": "response_item", "timestamp": "2026-11-16T10:04:00Z", "payload": {"type": "message", "role": "user", "content": [{"type": "input_text", "text": "A later task"}]}},
            {"type": "response_item", "timestamp": "2026-11-16T10:05:00Z", "payload": {"type": "message", "role": "assistant", "phase": "final", "content": [{"type": "output_text", "text": "Outcome after capture pause"}]}}])
        self.write_transcript()
        self.assertFalse(session_hook.queue_session({**self.event, "memory_disabled": True}, self.home, workspace_policy_path=self.file))
        bodies = []
        def response(endpoint, body=None):
            if body:
                bodies.append(body)
                return {"success": True, "async": False}
            return {"id": endpoint.removeprefix("/documents/"), "memory_unit_count": 1}
        def dispatch(args, token, action, extra, transcript=None):
            return worker.ingest(transcript, SID, job=args.memory_job)
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker", side_effect=dispatch), patch.object(worker, "request", side_effect=response):
            self.assertEqual(weekly.run(self.args())["status"], "complete")
            self.assertEqual(len(bodies), 1)
            self.assertEqual(len(bodies[0]["items"]), 1)
            self.assertNotIn("after capture pause", bodies[0]["items"][0]["content"])
            with patch.object(session_hook.datetime, "datetime", wraps=dt.datetime) as clock:
                clock.now.return_value = dt.datetime.fromisoformat("2026-11-16T10:06:00+00:00")
                self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
            self.assertEqual(weekly.run(self.args())["status"], "complete")
        self.assertEqual(len(bodies), 2)
        self.assertEqual(len(bodies[1]["items"]), 1)
        self.assertIn("after capture pause", bodies[1]["items"][0]["content"])

    def test_workspace_record_without_checkpoint_is_preserved_without_dispatch(self):
        self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        path = next((self.state / "queue").glob("*.json"))
        record = json.loads(path.read_text())
        del record["checkpoint_at"]
        path.write_text(json.dumps(record))
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker") as dispatch:
            self.assertEqual(weekly.run(self.args())["status"], "pending")
            dispatch.assert_not_called()
        self.assertTrue(path.exists())

    def test_append_and_newer_checkpoint_during_import_are_not_deleted(self):
        self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        updated = False
        def dispatch(args, token, action, extra, transcript=None):
            nonlocal updated
            raw = transcript.read_bytes()
            if not updated:
                self.records.append({"type": "event_msg", "timestamp": "2026-11-16T10:05:00Z", "payload": {"type": "task_complete"}})
                self.write_transcript()
                session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file)
                updated = True
            return {"session_id": SID, "sha256": hashlib.sha256(raw).hexdigest(), "outcome_ids": [], "pending_outcomes": 0}
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker", side_effect=dispatch):
            self.assertEqual(weekly.run(self.args())["status"], "pending")
            self.assertEqual(len(list((self.state / "queue").glob("*.json"))), 1)
            self.assertEqual(weekly.run(self.args())["status"], "complete")

    def test_intake_batch_limit_preserves_other_sessions(self):
        for number in range(3):
            self.records[0]["payload"]["id"] = str(number) + SID[1:]
            self.transcript = self.sessions / (str(number) + ".jsonl")
            self.write_transcript()
            self.event.update(session_id=self.records[0]["payload"]["id"], transcript_path=str(self.transcript))
            self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        def dispatch(args, token, action, extra, transcript=None):
            session = json.loads(transcript.read_text().splitlines()[0])["payload"]["id"]
            return {"session_id": session, "sha256": hashlib.sha256(transcript.read_bytes()).hexdigest(), "outcome_ids": [], "pending_outcomes": 0}
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker", side_effect=dispatch) as called:
            self.assertEqual(weekly.run(self.args(max_sessions=1))["status"], "pending")
            self.assertEqual(called.call_count, 1)
        self.assertEqual(len(list((self.state / "queue").glob("*.json"))), 2)

    def test_timed_out_container_is_removed_by_exact_generated_name(self):
        args = self.args()
        args.memory_state = self.state
        with patch.object(weekly.subprocess, "run", side_effect=[subprocess.TimeoutExpired("docker", 1), SimpleNamespace(returncode=0)]) as run:
            with self.assertRaisesRegex(ValueError, "was stopped"):
                weekly.call_worker(args, "synthetic", "ingest", [])
        launch, cleanup = [call.args[0] for call in run.call_args_list]
        name = launch[launch.index("--name") + 1]
        self.assertRegex(name, r"^hindsight-worker-[a-f0-9]{32}$")
        self.assertEqual(cleanup, ["docker", "rm", "--force", name])
        self.assertFalse((self.state / "worker-cleanup-required.json").exists())

    def test_failed_timeout_cleanup_stops_future_batches(self):
        args = self.args()
        args.memory_state = self.state
        with patch.object(weekly.subprocess, "run", side_effect=[subprocess.TimeoutExpired("docker", 1), SimpleNamespace(returncode=1)]):
            with self.assertRaisesRegex(ValueError, "requires review"):
                weekly.call_worker(args, "synthetic", "ingest", [])
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker") as called:
            with self.assertRaisesRegex(ValueError, "cleanup requires review"):
                weekly.run(args)
            called.assert_not_called()

    def test_zero_extracted_facts_preserves_queue_and_no_acknowledgement(self):
        self.assertTrue(session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file))
        def response(endpoint, body=None):
            return {"success": True, "async": False} if body else {"id": endpoint.removeprefix("/documents/"), "memory_unit_count": 0}
        def dispatch(args, token, action, extra, transcript=None):
            return worker.ingest(transcript, SID, job=args.memory_job)
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker", side_effect=dispatch), patch.object(worker, "request", side_effect=response):
            self.assertEqual(weekly.run(self.args())["status"], "pending")
        self.assertFalse((self.state / "imported.json").exists())
        self.assertEqual(len(list((self.state / "queue").glob("*.json"))), 1)

    def test_failed_cleanup_prevents_second_dispatch_in_the_same_batch(self):
        for number in range(2):
            self.records[0]["payload"]["id"] = str(number) + SID[1:]
            self.transcript = self.sessions / (str(number) + ".jsonl")
            self.write_transcript()
            self.event.update(session_id=self.records[0]["payload"]["id"], transcript_path=str(self.transcript))
            session_hook.queue_session(self.event, self.home, workspace_policy_path=self.file)
        original = weekly.call_worker
        commands = []
        def docker(command, **kwargs):
            commands.append(command)
            if command[1] == "compose":
                raise subprocess.TimeoutExpired(command, 1)
            return SimpleNamespace(returncode=1)
        def dispatch(*args, **kwargs):
            with patch.object(weekly.subprocess, "run", side_effect=docker):
                return original(*args, **kwargs)
        with patch.object(scope, "active", return_value=CUTOFF), patch.object(weekly, "call_worker", side_effect=dispatch):
            self.assertEqual(weekly.run(self.args())["status"], "pending")
        self.assertEqual(len(commands), 2)  # One launch and its failed exact-name cleanup.
        self.assertEqual(len(list((self.state / "queue").glob("*.json"))), 2)

    def test_doctor_exposes_route_binding_before_activation_without_enabling(self):
        self.activation.unlink()
        output = StringIO()
        with patch.object(project_scope, "fingerprint", return_value="f" * 64), \
                patch.object(sys, "argv", ["workspace_scope.py", "doctor", "--workspace-policy", str(self.file)]), redirect_stdout(output):
            self.assertEqual(scope.main(), 0)
        result = json.loads(output.getvalue())
        self.assertEqual(result["status"], "unverified")
        self.assertEqual(result["bindingSha256"], "f" * 64)
        self.assertFalse(self.activation.exists())


if __name__ == "__main__":
    unittest.main()
