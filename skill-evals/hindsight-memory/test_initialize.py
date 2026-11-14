import importlib.util
from pathlib import Path
import tempfile
import unittest


source = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/initialize.py"
spec = importlib.util.spec_from_file_location("initialize", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class InitializeTests(unittest.TestCase):
    def test_creates_private_codex_configuration_without_overwrite(self):
        with tempfile.TemporaryDirectory() as root:
            path = module.initialize(root, "openai-codex", "gpt-6-luna")
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            contents = path.read_text()
            self.assertIn("HINDSIGHT_API_LLM_PROVIDER=openai-codex", contents)
            self.assertIn("HINDSIGHT_API_LLM_CODEX_HOME=/home/hindsight/codex-auth", contents)
            self.assertIn("HINDSIGHT_API_EMBEDDINGS_PROVIDER=openai", contents)
            with self.assertRaises(FileExistsError):
                module.initialize(root, "openai-codex", "gpt-6-luna")
            self.assertEqual(path.read_text(), contents)

    def test_gateway_requires_approved_transport_and_private_model_key(self):
        with tempfile.TemporaryDirectory() as root:
            key = Path(root) / "key"
            key.write_text("synthetic-test-key")
            key.chmod(0o644)
            with self.assertRaises(ValueError):
                module.initialize(root, "openai-responses", "gpt-6-luna", "https://example.invalid/v1", key)
            key.chmod(0o600)
            with self.assertRaises(ValueError):
                module.initialize(root, "openai-responses", "gpt-6-luna", "http://example.invalid/v1", key)
            path = module.initialize(root, "openai-responses", "gpt-6-luna", "https://example.invalid/v1", key)
            self.assertIn("HINDSIGHT_API_LLM_BASE_URL=https://example.invalid/v1", path.read_text())

    def test_exact_http_gateway_is_accepted_with_private_key(self):
        with tempfile.TemporaryDirectory() as root:
            key = Path(root) / "key"
            key.write_text("synthetic-test-key")
            key.chmod(0o600)
            path = module.initialize(root, "openai-responses", "gpt-6-luna",
                                     "http://approved.example.invalid/v1", key, accepted_http_base_url="http://approved.example.invalid/v1")
            self.assertIn("HINDSIGHT_API_LLM_BASE_URL=http://approved.example.invalid/v1", path.read_text())
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_http_gateway_variants_are_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            key = Path(root) / "key"
            key.write_text("synthetic-test-key")
            key.chmod(0o600)
            for url in ("http://example.invalid/v1", "http://approved.example.invalid.evil.invalid/v1",
                        "http://approved.example.invalid/v1/", "http://approved.example.invalid/v1?debug=1",
                        "http://user@approved.example.invalid/v1", "http://approved.example.invalid/v1#fragment"):
                with self.subTest(url=url), self.assertRaises(ValueError):
                    module.initialize(root, "openai-responses", "gpt-6-luna", url, key)

    def test_local_embedding_fallback_is_explicit(self):
        with tempfile.TemporaryDirectory() as root:
            path = module.initialize(root, "openai-codex", "gpt-6-luna", embeddings="bge-m3")
            self.assertIn("HINDSIGHT_API_EMBEDDINGS_PROVIDER=local", path.read_text())
            self.assertIn("HINDSIGHT_API_EMBEDDINGS_LOCAL_MODEL=BAAI/bge-m3", path.read_text())


if __name__ == "__main__":
    unittest.main()
