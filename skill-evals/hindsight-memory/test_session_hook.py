import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest


MODULE_PATH = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/session_hook.py"
sys.path.insert(0, str(MODULE_PATH.parent))
spec = importlib.util.spec_from_file_location("session_hook", MODULE_PATH)
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)

SESSION = "12345678-1234-1234-1234-123456789abc"


class SessionHookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.project = self.home / "dev/greppy"
        self.project.mkdir(parents=True)
        self.state = self.home / ".local/state/hindsight-greppy"
        self.state.mkdir(parents=True)
        (self.state / "pilot-start").write_text("2026-11-10T00:00:00+00:00")
        self.transcript = self.home / ".codex/sessions/2026/11/10/rollout.jsonl"
        self.transcript.parent.mkdir(parents=True)
        self.meta = {"id": SESSION, "cwd": str(self.project), "source": "cli", "timestamp": "2026-11-10T01:00:00Z"}
        self.event = {"hook_event_name": "SessionEnd", "session_id": SESSION, "cwd": str(self.project), "transcript_path": str(self.transcript)}
        self.write_header()

    def write_header(self):
        self.transcript.write_text(json.dumps({"type": "session_meta", "payload": self.meta}) + "\n")

    def test_queues_only_reference_and_is_idempotent(self):
        self.assertTrue(hook.queue_session(self.event, self.home))
        self.assertTrue(hook.queue_session(self.event, self.home))
        records = list((self.state / "queue").iterdir())
        self.assertEqual(len(records), 1)
        self.assertEqual(json.loads(records[0].read_text()), {"session_id": SESSION, "transcript_path": str(self.transcript)})

    def test_rejects_pre_pilot_and_non_cli_sessions(self):
        for change in ({"timestamp": "2026-11-09T23:59:00Z"}, {"source": "vscode"}):
            self.meta.update(change)
            self.write_header()
            self.assertFalse(hook.queue_session(self.event, self.home))
            self.meta.update({"timestamp": "2026-11-10T01:00:00Z", "source": "cli"})

    def test_rejects_other_projects_and_spoofed_session(self):
        other = self.home / "dev/other"
        other.mkdir()
        self.event["cwd"] = str(other)
        self.assertFalse(hook.queue_session(self.event, self.home))
        self.event["cwd"] = str(self.project)
        self.meta["id"] = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        self.write_header()
        self.assertFalse(hook.queue_session(self.event, self.home))

    def test_requires_pilot_marker(self):
        (self.state / "pilot-start").unlink()
        self.assertFalse(hook.queue_session(self.event, self.home))

    def test_nested_repository_does_not_inherit_legacy_pilot_consent(self):
        nested = self.project / "nested"
        nested.mkdir()
        (nested / ".git").mkdir()
        self.event["cwd"] = self.meta["cwd"] = str(nested)
        self.write_header()
        self.assertFalse(hook.queue_session(self.event, self.home))


if __name__ == "__main__":
    unittest.main()
