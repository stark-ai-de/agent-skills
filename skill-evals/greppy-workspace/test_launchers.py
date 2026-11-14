import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/greppy-workspace/scripts"


class LauncherTests(unittest.TestCase):
    def test_legacy_paths_forward_arguments_and_exit_status(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = Path(tmp) / "greppy"
            fake.write_text(f"#!{sys.executable}\nimport json,sys\nprint(json.dumps(sys.argv[1:]))\nsys.exit(7)\n")
            fake.chmod(0o755)
            env = dict(os.environ, PATH=tmp + os.pathsep + os.environ["PATH"])
            for name, interpreter, args, expected in [
                ("workspace.py", sys.executable, ["doctor", "--config", "path with spaces"], ["workspace-doctor", "--config", "path with spaces"]),
                ("workspace.py", sys.executable, ["maintain", "--apply"], ["maintain", "--apply"]),
                ("inference.py", sys.executable, ["--help"], ["inference", "--help"]),
                ("records.mjs", "node", ["--config", "path with spaces"], ["records", "--config", "path with spaces"]),
            ]:
                with self.subTest(name=name, args=args):
                    result = subprocess.run([interpreter, str(SCRIPTS / name), *args], env=env, capture_output=True, text=True)
                    self.assertEqual(result.returncode, 7)
                    self.assertEqual(json.loads(result.stdout), expected)
