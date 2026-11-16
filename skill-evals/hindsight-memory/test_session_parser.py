import json
from pathlib import Path
import sys
import unittest

SCRIPTS = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts"
sys.path.insert(0, str(SCRIPTS))
import session_parser as parser

SID = "12345678-1234-1234-1234-123456789abc"
START = "2026-11-16T10:00:00Z"


def encoded(records):
    return ("\n".join(json.dumps(item) for item in records) + "\n").encode()


def codex(role, text, **kwargs):
    return {"type": "response_item", "timestamp": START,
            "payload": {"type": "message", "role": role, "content": [{"type": "output_text", "text": text}], **kwargs}}


def pi(item_id, parent, role, text, **kwargs):
    return {"type": "message", "id": item_id, "parentId": parent, "timestamp": START,
            "message": {"role": role, "content": [{"type": "text", "text": text}], **kwargs}}


class SessionParserTests(unittest.TestCase):
    def setUp(self):
        self.codex_header = {"type": "session_meta", "payload": {"id": SID, "source": "cli", "cwd": "/synthetic/project", "timestamp": START}}
        self.pi_header = {"type": "session", "version": 3, "id": SID, "cwd": "/synthetic/project", "timestamp": START}

    def test_codex_final_only_excludes_both_phase_fields_and_recall_tools(self):
        records = [self.codex_header, codex("developer", "instructions"), codex("user", "Repair the parser"),
                   codex("assistant", "private thought", channel="analysis"),
                   codex("assistant", "progress report", channel=None, phase="commentary"),
                   {"type": "response_item", "payload": {"type": "function_call_output", "output": "Recalled old memory"}},
                   codex("assistant", "Fixed the parser; test_session_parser.py passes.", phase="final")]
        meta, outcomes = parser.parse(encoded(records), SID)
        self.assertEqual(len(outcomes), 1)
        text = outcomes[0]["content"]
        self.assertIn("Fixed the parser", text)
        for excluded in ("private thought", "progress report", "Recalled old memory", "instructions"):
            self.assertNotIn(excluded, text)

    def test_native_user_events_disambiguate_injected_role_user(self):
        records = [self.codex_header, codex("user", "injected context"),
                   {"type": "event_msg", "timestamp": START, "payload": {"type": "item_completed", "item": {"type": "UserMessage", "content": [{"type": "text", "text": "Actual request"}]}}},
                   codex("assistant", "Outcome", phase="final")]
        self.assertEqual(json.loads(parser.parse(encoded(records), SID)[1][0]["content"])["task"], "Actual request")

    def test_pi_native_branch_keeps_selected_leaf_and_skips_tools_reasoning(self):
        records = [self.pi_header, pi("u", None, "user", "Fix a test"),
                   pi("old", "u", "assistant", "Discarded branch", stopReason="stop"),
                   pi("tool", "u", "toolResult", "Recalled memory"),
                   pi("thinking", "tool", "assistant", "not a final", stopReason="toolUse"),
                   pi("final", "thinking", "assistant", "Test passes in commit abc123.", stopReason="stop")]
        _, outcomes = parser.parse(encoded(records), SID, "pi", "final")
        self.assertEqual(len(outcomes), 1)
        self.assertEqual(outcomes[0]["entry_id"], "final")
        self.assertNotIn("Discarded branch", outcomes[0]["content"])
        self.assertNotIn("Recalled memory", outcomes[0]["content"])

    def test_pi_aborted_or_incomplete_assistant_does_not_become_outcome(self):
        for reason in ("aborted", "error", "length", "toolUse"):
            records = [self.pi_header, pi("u", None, "user", "Task"), pi("a", "u", "assistant", "Partial", stopReason=reason)]
            self.assertEqual(parser.parse(encoded(records), SID, "pi", "a")[1], [])

    def test_explicit_abort_and_codex_abort_notice_drop_last_task_only(self):
        records = [self.codex_header, codex("user", "First"), codex("assistant", "Completed", phase="final"),
                   codex("user", "Second"), codex("assistant", "Unfinished", phase="final")]
        for suffix, status in (([], "aborted"), ([{"type": "event_msg", "timestamp": START, "payload": {"type": "turn_aborted"}}], None)):
            outcomes = parser.parse(encoded(records + suffix), SID, completion_status=status)[1]
            self.assertEqual(len(outcomes), 1)
            self.assertIn("Completed", outcomes[0]["content"])

    def test_fork_drops_inherited_entries_and_normalizes_parent_reference(self):
        self.pi_header["parentSession"] = "/private/sessions/earlier_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jsonl"
        inherited = pi("u", None, "user", "Old request")
        inherited["timestamp"] = "2026-11-15T10:00:00Z"
        old = pi("old", "u", "assistant", "Old conclusion", stopReason="stop")
        old["timestamp"] = inherited["timestamp"]
        records = [self.pi_header, inherited, old, pi("new", "old", "assistant", "New conclusion", stopReason="stop")]
        meta, outcomes = parser.parse(encoded(records), SID, "pi", "new")
        self.assertEqual(meta["forked_from"], "pi:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        self.assertEqual(len(outcomes), 1)
        self.assertNotIn("Old conclusion", outcomes[0]["content"])

    def test_marked_excerpts_and_unseen_batches_do_not_starve_old_outcomes(self):
        records = [self.codex_header, codex("user", "Task")]
        records.extend(codex("assistant", str(i) + ": " + "A complete sentence. " * 400, phase="final") for i in range(20))
        known = []
        for _ in range(20):
            meta, batch = parser.parse(encoded(records), SID, known_outcomes=known)
            self.assertLessEqual(sum(len(item["content"]) for item in batch), parser.MAX_CONTENT_CHARS)
            known.extend(item["id"] for item in batch)
            self.assertTrue(all("bounded excerpt" in item["content"] for item in batch))
            if not meta["remaining_outcomes"]:
                break
        self.assertEqual(len(known), 20)
        self.assertEqual(len(set(known)), 20)

    def test_rejects_subagents_source_mismatch_bad_branches_and_injected_memories(self):
        self.codex_header["payload"]["source"] = {"subagent": "worker"}
        with self.assertRaises(ValueError):
            parser.parse(encoded([self.codex_header]), SID)
        with self.assertRaises(ValueError):
            parser.parse(encoded([self.pi_header]), SID, "codex")
        with self.assertRaises(ValueError):
            parser.parse(encoded([self.pi_header, pi("x", "missing", "user", "Task")]), SID, "pi", "x")
        records = [self.pi_header, pi("a", None, "assistant", "<hindsight_memories>old</hindsight_memories>", stopReason="stop")]
        self.assertEqual(parser.parse(encoded(records), SID, "pi")[1], [])

    def test_replayed_content_in_another_session_cannot_overwrite_provenance(self):
        records = [self.codex_header, codex("user", "Task"), codex("assistant", "Outcome", phase="final")]
        first = parser.parse(encoded(records), SID)[1][0]["id"]
        other = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        records[0]["payload"]["id"] = other
        self.assertNotEqual(parser.parse(encoded(records), other)[1][0]["id"], first)

    def test_pi_context_edits_apply_replacement_and_retraction_on_selected_branch(self):
        records = [self.pi_header, pi("u", None, "user", "Task"), pi("a", "u", "assistant", "Outdated answer", stopReason="stop"),
                   {"type": "context_edit", "id": "edit", "parentId": "a", "timestamp": START, "targetId": "a", "replacement": {"content": "Corrected answer"}}]
        self.assertIn("Corrected answer", parser.parse(encoded(records), SID, "pi", "edit")[1][0]["content"])
        records[-1]["replacement"] = None
        self.assertEqual(parser.parse(encoded(records), SID, "pi", "edit")[1], [])

    def test_checkpoint_rejects_future_and_undated_outcomes_until_a_later_checkpoint(self):
        future = codex("assistant", "Later completed turn", phase="final")
        future["timestamp"] = "2026-11-16T10:05:00Z"
        undated = codex("assistant", "Unbounded outcome", phase="final")
        del undated["timestamp"]
        records = [self.codex_header, codex("user", "Actual request"), codex("assistant", "Earlier completed turn", phase="final"),
                   {"type": "event_msg", "timestamp": "2026-11-16T10:04:00Z", "payload": {"type": "user_message", "message": "Future request"}},
                   future, undated]
        _, initial = parser.parse(encoded(records), SID, checkpoint_at="2026-11-16T10:02:00Z")
        self.assertEqual(len(initial), 1)
        self.assertEqual(json.loads(initial[0]["content"])["task"], "Actual request")
        self.assertIn("Earlier completed turn", initial[0]["content"])
        _, later = parser.parse(encoded(records), SID, known_outcomes=[item["id"] for item in initial],
                                checkpoint_at="2026-11-16T10:06:00Z")
        self.assertEqual(len(later), 1)
        self.assertTrue(any("Later completed turn" in item["content"] for item in later))
        self.assertTrue(all("Unbounded outcome" not in item["content"] for item in later))

    def test_future_pi_context_edit_cannot_change_a_prior_checkpoint(self):
        records = [self.pi_header, pi("u", None, "user", "Task"), pi("a", "u", "assistant", "Earlier answer", stopReason="stop"),
                   {"type": "context_edit", "id": "edit", "parentId": "a", "timestamp": "2026-11-16T10:05:00Z", "targetId": "a", "replacement": {"content": "Later correction"}}]
        initial = parser.parse(encoded(records), SID, "pi", "edit", checkpoint_at="2026-11-16T10:02:00Z")[1]
        self.assertEqual(len(initial), 1)
        self.assertIn("Earlier answer", initial[0]["content"])
        later = parser.parse(encoded(records), SID, "pi", "edit", checkpoint_at="2026-11-16T10:06:00Z")[1]
        self.assertEqual(len(later), 1)
        self.assertIn("Later correction", later[0]["content"])


if __name__ == "__main__":
    unittest.main()
