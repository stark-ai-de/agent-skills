from pathlib import Path
import sys
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/diagnostics"))
from bank_aliases import reconcile


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
