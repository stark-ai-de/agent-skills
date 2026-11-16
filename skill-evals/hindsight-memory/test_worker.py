import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch


path = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/worker.py"
sys.path.insert(0, str(path.parent))
spec = importlib.util.spec_from_file_location("worker", path)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


def fact(fact_id, session, started):
    return {"id": fact_id, "document_id": "conversation-" + session,
            "metadata": {"session_id": session, "session_started": started}, "text": "evidence"}


class GroundingTests(unittest.TestCase):
    def setUp(self):
        self.start = datetime.date(2026, 11, 9)
        self.end = datetime.date(2026, 11, 16)
        self.first = fact("one", "a", "2026-11-01T12:00:00Z")
        self.second = fact("two", "b", "2026-11-12T12:00:00Z")
        self.response = {"based_on": {"memories": [self.first, self.second]},
                         "structured_output": {"patterns": [{"summary": "issue", "evidence_ids": ["one", "two"]}]}}

    def test_accepts_two_distinct_sourced_sessions_with_one_in_week(self):
        self.assertEqual(len(worker.grounded_patterns(self.response, self.start, self.end)), 1)

    def test_rejects_same_session_or_missing_source(self):
        self.second["metadata"]["session_id"] = "a"
        self.second["document_id"] = "conversation-a"
        self.assertEqual(worker.grounded_patterns(self.response, self.start, self.end), [])
        self.second["metadata"]["session_id"] = "b"
        self.assertEqual(worker.grounded_patterns(self.response, self.start, self.end), [])

    def test_rejects_sources_outside_week_and_unreturned_ids(self):
        self.second["metadata"]["session_started"] = "2026-11-08T12:00:00Z"
        self.assertEqual(worker.grounded_patterns(self.response, self.start, self.end), [])
        self.response["structured_output"]["patterns"][0]["evidence_ids"] = ["one", "invented"]
        self.assertEqual(worker.grounded_patterns(self.response, self.start, self.end), [])

    def test_credential_patterns_detect_secrets(self):
        self.assertTrue(any(pattern.search("api_key='abcdefghijklmnopqrstuvwxyz'") for pattern in worker.SECRET_PATTERNS))
        self.assertFalse(any(pattern.search("The API key is held in the private environment file.") for pattern in worker.SECRET_PATTERNS))

    def test_tool_outputs_and_reasoning_are_not_added_to_outcomes(self):
        turns = [{"role": "user", "content": "question", "timestamp": "2026-11-10T10:00:00Z"},
                 {"role": "assistant", "content": "answer", "timestamp": "2026-11-10T10:02:00Z"}]
        events = [
            {"type": "response_item", "timestamp": "2026-11-10T10:01:00Z",
             "payload": {"type": "function_call_output", "output": "result"}},
            {"type": "response_item", "timestamp": "2026-11-10T10:01:30Z",
             "payload": {"type": "reasoning", "output": "private reasoning"}},
        ]
        merged = worker.add_tool_details(turns, "\n".join(json.dumps(event) for event in events))
        self.assertEqual([turn["content"] for turn in merged], ["question", "answer"])

    def test_bulk_tool_inputs_are_never_added(self):
        raw = {"type": "response_item", "timestamp": "2026-11-10T10:01:00Z",
               "payload": {"type": "function_call", "name": "exec_command", "arguments": "a" * 150}}
        turns = worker.add_tool_details([], json.dumps(raw))
        self.assertEqual(turns, [])


class IngestTests(unittest.TestCase):
    def setUp(self):
        root = tempfile.TemporaryDirectory()
        self.addCleanup(root.cleanup)
        self.transcript = Path(root.name) / "transcript.jsonl"
        self.session = "12345678-1234-1234-1234-123456789abc"
        self.records = [
            {"type": "session_meta", "payload": {"id": self.session, "source": "cli", "cwd": str(Path(root.name)), "timestamp": "2026-11-10T10:00:00Z"}},
            {"type": "response_item", "payload": {"type": "message", "role": "user", "content": [{"type": "input_text", "text": "Safe question"}]}},
            {"type": "response_item", "timestamp": "2026-11-10T10:01:00Z", "payload": {"type": "message", "role": "assistant", "phase": "final", "content": [{"type": "output_text", "text": "Safe outcome with a verified source reference."}]}},
        ]
        self.responses = [{"success": True, "async": False}]

    def response(self, endpoint, body=None):
        if endpoint == "/memories":
            return {"success": True, "async": False}
        return {"id": endpoint.removeprefix("/documents/"), "memory_unit_count": 1}

    def write_transcript(self, records):
        raw = ("\n".join(json.dumps(record) for record in records) + "\n").encode()
        self.transcript.write_bytes(raw)
        self.transcript.chmod(0o600)
        return raw

    def test_parser_reads_the_scanned_snapshot_when_transcript_changes(self):
        raw = self.write_transcript(self.records)
        secret = "sk-" + "a" * 30

        original_parse = worker.parse
        def parse(scanned, *args):
            late = {"type": "response_item", "payload": {"type": "message", "role": "user", "content": [{"text": secret}]}}
            self.write_transcript([*self.records, late])
            self.assertEqual(scanned, raw)
            return original_parse(scanned, *args)

        with patch.object(worker, "parse", side_effect=parse), \
                patch.object(worker, "request", side_effect=self.response) as request:
            result = worker.ingest(self.transcript, self.session, Path("parser.cjs"))
        item = request.call_args_list[0].args[1]["items"][0]
        self.assertEqual(json.loads(item["content"])["task"], "Safe question")
        self.assertNotIn(secret, item["content"])
        self.assertEqual(item["metadata"]["sha256"], hashlib.sha256(raw).hexdigest())
        self.assertEqual(result["sha256"], item["metadata"]["sha256"])
        self.assertIn(secret.encode(), self.transcript.read_bytes())

    def test_json_escaped_credentials_are_rejected_before_upload(self):
        secret = json.dumps({"api_key": "abcdefghijklmnopqrstuvwxyz"})
        payloads = [
            {"type": "message", "role": "user", "content": [{"type": "input_text", "text": secret}]},
            {"type": "function_call", "name": "example", "arguments": secret},
            {"type": "function_call_output", "output": secret},
            {"type": "custom_tool_call", "name": "example", "input": secret},
            {"type": "custom_tool_call_output", "output": secret},
        ]
        for payload in payloads:
            with self.subTest(type=payload["type"]):
                raw = self.write_transcript([*self.records, {"type": "response_item", "payload": payload}])
                self.assertFalse(any(pattern.search(raw.decode()) for pattern in worker.SECRET_PATTERNS))
                with patch.object(worker.subprocess, "run", return_value=SimpleNamespace(stdout='[{"role":"user","content":"Safe question"}]')), \
                        patch.object(worker, "request", side_effect=self.responses) as request:
                    with self.assertRaisesRegex(ValueError, "credential pattern"):
                        worker.ingest(self.transcript, self.session, Path("parser.cjs"))
                    request.assert_not_called()

    def test_parser_output_is_checked_before_upload(self):
        self.write_transcript(self.records)
        turns = [{"id": "a" * 64, "content": "sk-" + "a" * 30}]
        with patch.object(worker, "parse", return_value=({"source": "codex"}, turns)), \
                patch.object(worker, "request", side_effect=self.responses) as request:
            with self.assertRaisesRegex(ValueError, "credential pattern"):
                worker.ingest(self.transcript, self.session, Path("parser.cjs"))
            request.assert_not_called()

    def test_raw_credentials_are_rejected_before_parsing(self):
        self.write_transcript([*self.records, {"token": "sk-" + "a" * 30}])
        with patch.object(worker, "parse") as parse, patch.object(worker, "request") as request:
            with self.assertRaisesRegex(ValueError, "credential pattern"):
                worker.ingest(self.transcript, self.session, Path("parser.cjs"))
            parse.assert_not_called()
            request.assert_not_called()


if __name__ == "__main__":
    unittest.main()
