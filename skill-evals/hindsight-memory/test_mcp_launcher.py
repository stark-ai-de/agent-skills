import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


source = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/mcp_launcher.py"
sys.path.insert(0, str(source.parent))
spec = importlib.util.spec_from_file_location("mcp_launcher", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LauncherTests(unittest.TestCase):
    def test_secret_is_in_environment_and_never_command_arguments(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root)
            marker = home / ".local/state/hindsight-greppy/pilot-start"
            marker.parent.mkdir(parents=True)
            marker.write_text("qualified")
            runtime = home / "runtime.env"
            runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-secret\n")
            runtime.chmod(0o600)
            with patch.object(Path, "home", return_value=home), patch.object(module.os, "execve") as execute:
                module.launch(runtime, "/test/mcp-proxy")
            executable, arguments, environment = execute.call_args.args
            self.assertEqual(executable, "/test/mcp-proxy")
            self.assertNotIn("synthetic-secret", arguments)
            self.assertEqual(environment["API_ACCESS_TOKEN"], "synthetic-secret")
            self.assertEqual(arguments[-1], "http://127.0.0.1:18888/mcp/greppy/")

    def test_rejects_missing_qualification_and_insecure_key(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root)
            runtime = home / "runtime.env"
            runtime.write_text("HINDSIGHT_API_TENANT_API_KEY=synthetic-secret\n")
            with patch.object(Path, "home", return_value=home):
                with self.assertRaises(SystemExit):
                    module.launch(runtime, "/test/mcp-proxy")
                marker = home / ".local/state/hindsight-greppy/pilot-start"
                marker.parent.mkdir(parents=True)
                marker.write_text("qualified")
                runtime.chmod(0o644)
                with self.assertRaises(SystemExit):
                    module.launch(runtime, "/test/mcp-proxy")


if __name__ == "__main__":
    unittest.main()
