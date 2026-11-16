import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


source = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/weekly.py"
sys.path.insert(0, str(source.parent))
spec = importlib.util.spec_from_file_location("weekly", source)
weekly = importlib.util.module_from_spec(spec)
spec.loader.exec_module(weekly)
SESSION = "12345678-1234-1234-1234-123456789abc"


class WeeklyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        project = self.home / "dev/greppy"
        project.mkdir(parents=True)
        state = self.home / ".local/state/hindsight-greppy"
        (state / "queue").mkdir(parents=True)
        (state / "pilot-start").write_text("2026-11-10T00:00:00Z")
        config = self.home / ".config/hindsight-greppy"
        config.mkdir(parents=True)
        runtime = config / "runtime.env"
        runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-test\n")
        runtime.chmod(0o600)
        self.transcript = self.home / ".codex/sessions/2026/11/10/rollout.jsonl"
        self.transcript.parent.mkdir(parents=True)
        self.transcript.write_text(json.dumps({"type": "session_meta", "payload": {
            "id": SESSION, "cwd": str(project), "source": "cli", "timestamp": "2026-11-10T01:00:00Z"}}) + "\n")
        self.record = state / "queue" / f"{SESSION}.json"
        self.record.write_text(json.dumps({"session_id": SESSION, "transcript_path": str(self.transcript)}))
        self.state = state

    def test_worker_runs_as_transcript_owner(self):
        args = SimpleNamespace(docker="docker", compose="compose.yaml", worker="worker.py", parser="parser.cjs", memory_state=self.state)
        result = SimpleNamespace(returncode=0, stdout="{}")
        with patch.object(weekly.os, "getuid", return_value=1001), patch.object(weekly.os, "getgid", return_value=100), \
                patch.object(weekly.subprocess, "run", return_value=result) as run:
            weekly.call_worker(args, "synthetic-token", "ingest", [], self.transcript)
        command = run.call_args.args[0]
        self.assertEqual(command[command.index("--user") + 1], "1001:100")
        self.assertIn(f"{self.transcript}:/hindsight/transcript.jsonl:ro", command)
        self.assertEqual(run.call_args.kwargs["env"]["HINDSIGHT_API_TENANT_API_KEY"], "synthetic-token")

    def test_success_is_recorded_once_and_report_created(self):
        actions = []
        def fake_worker(args, token, action, extra, transcript=None):
            actions.append(action)
            if action == "ingest":
                return {"session_id": SESSION, "sha256": hashlib.sha256(transcript.read_bytes()).hexdigest()}
            return []
        with patch.object(Path, "home", return_value=self.home), patch.object(weekly, "call_worker", side_effect=fake_worker):
            weekly.run(None)
            weekly.run(None)
        self.assertEqual(actions, ["ingest", "reflect"])
        self.assertFalse(self.record.exists())
        self.assertEqual(len(list((self.state / "reflections").glob("*.md"))), 1)

    def test_changed_transcript_stays_queued_and_prevents_report(self):
        def fake_worker(args, token, action, extra, transcript=None):
            digest = hashlib.sha256(transcript.read_bytes()).hexdigest()
            transcript.write_text(transcript.read_text() + "{}\n")
            return {"session_id": SESSION, "sha256": digest}
        with patch.object(Path, "home", return_value=self.home), patch.object(weekly, "call_worker", side_effect=fake_worker):
            with self.assertRaises(ValueError):
                weekly.run(None)
        self.assertTrue(self.record.exists())
        self.assertFalse((self.state / "reflections").exists())

    def test_failed_import_stays_queued_and_prevents_report(self):
        with patch.object(Path, "home", return_value=self.home), patch.object(weekly, "call_worker", side_effect=ValueError("empty extraction")):
            with self.assertRaises(ValueError):
                weekly.run(None)
        self.assertTrue(self.record.exists())
        self.assertFalse((self.state / "imported.json").exists())
        self.assertFalse((self.state / "reflections").exists())

    def test_nested_worktree_transcript_is_not_dispatched_by_legacy_pilot(self):
        nested = self.home / "dev/greppy/nested"
        nested.mkdir()
        (nested / ".git").write_text("gitdir: /synthetic/worktree\n")
        header = json.loads(self.transcript.read_text())
        header["payload"]["cwd"] = str(nested)
        self.transcript.write_text(json.dumps(header) + "\n")
        with patch.object(Path, "home", return_value=self.home), patch.object(weekly, "call_worker") as worker:
            with self.assertRaisesRegex(ValueError, "pending imports"):
                weekly.run(None)
            worker.assert_not_called()
        self.assertTrue(self.record.exists())


if __name__ == "__main__":
    unittest.main()
