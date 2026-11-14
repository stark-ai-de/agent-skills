import importlib.util
from pathlib import Path
import unittest


source = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/metrics.py"
spec = importlib.util.spec_from_file_location("metrics", source)
metrics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metrics)


def sample(start, retain, consolidation):
    return f'''process_start_time_seconds {start}
hindsight_llm_calls_total{{model="synthetic",provider="openai",scope="retain_extract_facts",success="true"}} {retain}
hindsight_llm_tokens_input_tokens_total{{model="synthetic",provider="openai",scope="retain_extract_facts",success="true",token_bucket="100-500"}} {retain * 100}
hindsight_llm_calls_total{{model="synthetic",provider="openai",scope="consolidation",success="true"}} {consolidation}
hindsight_llm_tokens_input_tokens_total{{model="synthetic",provider="openai",scope="consolidation",success="true",token_bucket="100-500"}} {consolidation * 100}
'''


class MetricsTests(unittest.TestCase):
    def test_measures_retain_and_background_consolidation_separately(self):
        before = metrics.parse(sample(123, 1, 0))
        after = metrics.parse(sample(123, 3, 1))
        rows = {row["scope"]: row for row in metrics.difference(before, after)}
        self.assertEqual(rows["retain_extract_facts"]["calls"], 2)
        self.assertEqual(rows["retain_extract_facts"]["input_tokens"], 200)
        self.assertEqual(rows["consolidation"]["calls"], 1)
        self.assertEqual(rows["consolidation"]["input_tokens"], 100)

    def test_rejects_restart_reset_and_missing_series(self):
        before = metrics.parse(sample(123, 2, 1))
        with self.assertRaises(ValueError):
            metrics.difference(before, metrics.parse(sample(124, 3, 2)))
        with self.assertRaises(ValueError):
            metrics.difference(before, metrics.parse(sample(123, 1, 1)))
        with self.assertRaises(ValueError):
            metrics.difference(before, metrics.parse("process_start_time_seconds 123\n"))


if __name__ == "__main__":
    unittest.main()
