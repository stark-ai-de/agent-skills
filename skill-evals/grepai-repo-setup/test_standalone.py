import importlib.util
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SOURCE = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/grepai-repo-setup/scripts/standalone.py"
spec = importlib.util.spec_from_file_location("standalone", SOURCE)
standalone = importlib.util.module_from_spec(spec)
spec.loader.exec_module(standalone)


class StandaloneTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "project"
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)
        self.workspace = self.root / "workspace.yaml"

    def prepare(self, **kwargs):
        return standalone.prepare(self.repo, workspace_file=self.workspace, **kwargs)

    def test_preview_never_initializes_or_contacts_a_model(self):
        self.assertEqual(self.prepare(executable="missing-binary")["status"], "planned")
        self.assertFalse((self.repo / ".grepai").exists())

    @unittest.skipUnless(shutil.which("grepai"), "native GrepAI installation is needed")
    def test_native_initialization_and_repeat_preserve_existing_configuration(self):
        self.assertEqual(self.prepare(apply=True)["status"], "prepared")
        file = self.repo / ".grepai/config.yaml"
        contents = file.read_bytes()
        config = standalone.yaml.safe_load(contents)
        self.assertEqual(config["embedder"]["dimensions"], 1024)
        self.assertEqual(config["store"]["backend"], "gob")
        self.assertIn(".env.*", config["ignore"])
        self.assertEqual(file.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.prepare(apply=True)["status"], "existing")
        self.assertEqual(file.read_bytes(), contents)

    def test_shared_owner_and_symlink_configuration_are_preserved(self):
        self.workspace.write_text(standalone.yaml.safe_dump({"workspaces": {"shared": {"projects": [{"name": "fixture", "path": str(self.repo)}]}}}))
        with self.assertRaisesRegex(ValueError, "shared workspace"):
            self.prepare(apply=True)
        self.workspace.unlink()
        (self.repo / ".grepai").symlink_to(self.root)
        with self.assertRaisesRegex(ValueError, "symlink"):
            self.prepare(apply=True)

    def test_negations_and_orphan_index_are_not_overwritten(self):
        (self.repo / ".grepaiignore").write_text("!.env.private.py\n")
        with self.assertRaisesRegex(ValueError, "negations"):
            self.prepare(apply=True)
        (self.repo / ".grepaiignore").unlink()
        (self.repo / ".grepai").mkdir()
        with self.assertRaisesRegex(ValueError, "Existing GrepAI state"):
            self.prepare(apply=True)


if __name__ == "__main__":
    unittest.main()
