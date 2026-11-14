import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


source = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/activate.py"
spec = importlib.util.spec_from_file_location("activate", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ActivateTests(unittest.TestCase):
    def configure(self, root):
        config = Path(root) / ".config/hindsight-greppy/runtime.env"
        config.parent.mkdir(parents=True)
        config.write_text("HINDSIGHT_API_LLM_PROVIDER=openai-codex\n")
        config.chmod(0o600)

    def test_checks_thresholds_and_does_not_overwrite_start(self):
        with tempfile.TemporaryDirectory() as root:
            self.configure(root)
            evidence = Path(root) / "evidence.json"
            data = {"embedding_dimensions": 1024, "bilingual_retrieval": True, "model_route_reviewed": True,
                    "cases": [{"id": str(i), "kind": "recall" if i < 3 else "reflect", "hindsight_correct": True,
                               "baseline_correct": i != 0, "false_recurrence": False} for i in range(6)]}
            evidence.write_text(json.dumps(data))
            evidence.chmod(0o600)
            data["cases"][0]["false_recurrence"] = True
            evidence.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                module.activate(root, evidence)
            data["cases"][0]["false_recurrence"] = False
            evidence.write_text(json.dumps(data))
            marker = module.activate(root, evidence)
            self.assertEqual(marker.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(FileExistsError):
                module.activate(root, evidence)

    def test_equal_accuracy_does_not_require_savings(self):
        with tempfile.TemporaryDirectory() as root:
            self.configure(root)
            evidence = Path(root) / "evidence.json"
            data = {"embedding_dimensions": 1024, "bilingual_retrieval": True, "model_route_reviewed": True,
                    "cases": [{"id": str(i), "kind": "recall" if i < 3 else "reflect", "hindsight_correct": True,
                               "baseline_correct": True, "false_recurrence": False} for i in range(6)],
                    "two_week_costs": {"baseline": 10, "hindsight": 80}}
            evidence.write_text(json.dumps(data)); evidence.chmod(0o600)
            self.assertTrue(module.activate(root, evidence).is_file())

    def test_explicit_privacy_acceptance_is_required_for_unreviewed_route(self):
        with tempfile.TemporaryDirectory() as root:
            self.configure(root)
            evidence = Path(root) / "evidence.json"
            data = {"embedding_dimensions": 1024, "bilingual_retrieval": True, "model_route_reviewed": False,
                    "cases": [{"id": str(i), "kind": "recall" if i < 3 else "reflect", "hindsight_correct": True,
                               "baseline_correct": True, "false_recurrence": False} for i in range(6)]}
            evidence.write_text(json.dumps(data))
            evidence.chmod(0o600)
            with self.assertRaises(ValueError):
                module.activate(root, evidence)
            for value in (False, "true", 1, None):
                data["model_route_privacy_accepted"] = value
                evidence.write_text(json.dumps(data))
                with self.subTest(value=value), self.assertRaises(ValueError):
                    module.activate(root, evidence)
            data["model_route_privacy_accepted"] = True
            evidence.write_text(json.dumps(data))
            self.assertTrue(module.activate(root, evidence).is_file())

    def test_missing_costs_do_not_block_but_accuracy_still_does(self):
        with tempfile.TemporaryDirectory() as root:
            self.configure(root)
            evidence = Path(root) / "evidence.json"
            data = {"embedding_dimensions": 1024, "bilingual_retrieval": True, "model_route_reviewed": True,
                    "cases": [{"id": str(i), "kind": "recall" if i < 3 else "reflect", "hindsight_correct": i >= 2,
                               "baseline_correct": True, "false_recurrence": False} for i in range(6)]}
            evidence.write_text(json.dumps(data)); evidence.chmod(0o600)
            with self.assertRaises(ValueError):
                module.activate(root, evidence)
            data["cases"][1]["hindsight_correct"] = True
            evidence.write_text(json.dumps(data))
            self.assertTrue(module.activate(root, evidence).is_file())


if __name__ == "__main__":
    unittest.main()
