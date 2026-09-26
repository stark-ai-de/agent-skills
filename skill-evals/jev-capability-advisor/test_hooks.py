#!/usr/bin/env python3
"""Offline hook registration/transport checks; these do not prove agent adoption."""
import base64
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
REPOSITORY = Path(__file__).resolve().parents[2]
SCRIPT = Path(os.environ.get(
    "JEV_HOOKS_TEST_SCRIPT",
    REPOSITORY / "skills/skill-maintenance/jev-capability-advisor/scripts/jev_hooks.py",
)).resolve()
EVENT = "UserPromptSubmit"


class HookRegistrationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="jev-hook-tests-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.home = self.root / "home"
        self.home.mkdir()
        self.codex = self.home / ".codex"
        self.claude = self.home / ".claude"
        self.codex.mkdir()
        self.claude.mkdir()
        self.project = self.root / "project with spaces"
        self.project.mkdir()
        self.env = dict(os.environ)
        for key in ("TYPESAFE_API_KEY", "CODEX_HOME", "CLAUDE_CONFIG_DIR",
                    "XDG_STATE_HOME", "LOCALAPPDATA", "APPDATA", "PYTHONPATH"):
            self.env.pop(key, None)
        self.env.update({
            "HOME": str(self.home), "USERPROFILE": str(self.home),
            "CODEX_HOME": str(self.codex), "CLAUDE_CONFIG_DIR": str(self.claude),
            "XDG_STATE_HOME": str(self.root / "state"),
            "LOCALAPPDATA": str(self.root / "local-app-data"),
            "APPDATA": str(self.root / "app-data"), "PYTHONDONTWRITEBYTECODE": "1",
        })

    def run_cli(self, action, host="codex", *extra, success=True, env=None, interpreter=None):
        result = subprocess.run(
            [interpreter or sys.executable, "-B", str(SCRIPT), action, "--host", host, *extra],
            cwd=self.root, env=self.env if env is None else env,
            stdin=subprocess.DEVNULL, capture_output=True, text=True,
            encoding="utf-8", timeout=15,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        try:
            output = json.loads(result.stdout)
        except json.JSONDecodeError:
            self.fail("Manager stdout was not JSON: " + repr(result.stdout + result.stderr))
        self.assertIsInstance(output, dict)
        return output

    def config_path(self, host="codex", project=False):
        if project:
            return self.project / (
                ".codex/hooks.json" if host == "codex" else ".claude/settings.local.json"
            )
        return self.codex / "hooks.json" if host == "codex" else self.claude / "settings.json"

    def read_config(self, host="codex", project=False):
        return json.loads(self.config_path(host, project).read_text(encoding="utf-8"))

    def write_config(self, host, config, project=False):
        path = self.config_path(host, project)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(config, ensure_ascii=False) + "\n", encoding="utf-8")
        return path

    def snapshot(self):
        return {
            str(path.relative_to(self.root)): (
                "symlink", os.readlink(path)
            ) if path.is_symlink() else (
                "directory", None
            ) if path.is_dir() else ("file", path.read_bytes())
            for path in self.root.rglob("*")
        }

    @staticmethod
    def write_identity(path):
        # Reads may legitimately update access time on Linux and Windows.
        # Preserve inode, contents, write timestamps and mode instead.
        metadata = path.stat()
        return (metadata.st_dev, metadata.st_ino, metadata.st_size,
                metadata.st_mtime_ns, metadata.st_ctime_ns, metadata.st_mode)

    def registration(self, host="codex", project=False):
        groups = self.read_config(host, project)["hooks"][EVENT]
        self.assertEqual(len(groups), 1)
        hooks = groups[0]["hooks"]
        self.assertEqual(len(hooks), 1)
        return hooks[0]

    def execute_registration(self, host, hook, input_bytes=b"{}", shell=None):
        if host == "claude-code":
            self.assertIn("args", hook, "Claude must use direct exec form")
            argv = [hook["command"], *hook["args"]]
            self.assertTrue(Path(argv[0]).is_absolute())
            self.assertTrue(Path(argv[0]).is_file())
            if os.name == "nt":
                self.assertEqual(Path(argv[0]).suffix.lower(), ".exe")
        elif os.name == "nt":
            command = hook["commandWindows"]
            self.assertLess(len(command), 8191)
            if shell == "powershell":
                argv = [shutil.which("powershell.exe"), "-NoLogo", "-NoProfile",
                        "-NonInteractive", "-Command", command]
            elif shell == "git-bash":
                executable = next((path for path in (
                    Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Git/bin/bash.exe",
                    Path(os.environ.get("ProgramW6432", "C:/Program Files")) / "Git/bin/bash.exe",
                ) if path.is_file()), None)
                if executable is None:
                    self.skipTest("Git Bash unavailable; its live qualification remains pending")
                argv = [str(executable), "--noprofile", "--norc", "-c", command]
            else:
                argv = [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/s", "/c", command]
        else:
            argv = ["/bin/sh", "-c", hook["command"]]
        result = subprocess.run(argv, input=input_bytes, capture_output=True,
                                env=self.env, cwd=self.root, timeout=15)
        self.assertEqual(result.returncode, 0, repr(result.stdout + result.stderr))
        self.assertEqual(result.stderr, b"")
        output = json.loads(result.stdout.decode("utf-8"))
        self.assertEqual(set(output), {"hookSpecificOutput"})
        self.assertEqual(set(output["hookSpecificOutput"]), {"hookEventName", "additionalContext"})
        self.assertEqual(output["hookSpecificOutput"]["hookEventName"], EVENT)
        self.assertIsInstance(output["hookSpecificOutput"]["additionalContext"], str)
        self.assertTrue(output["hookSpecificOutput"]["additionalContext"].strip())
        return output

    def test_install_status_and_uninstall_preserve_sibling_settings_for_both_hosts(self):
        sibling = {"hooks": [{"type": "command", "command": "existing-handler", "timeout": 9}]}
        original = {"hooks": {EVENT: [sibling], "Stop": [
            {"hooks": [{"type": "command", "command": "existing-stop-handler"}]}
        ]}, "unrelatedSetting": {"nested": [1, "Grüße"]}}
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                self.write_config(host, original)
                self.run_cli("install", host)
                installed = self.read_config(host)
                self.assertEqual(installed["unrelatedSetting"], original["unrelatedSetting"])
                self.assertEqual(installed["hooks"]["Stop"], original["hooks"]["Stop"])
                self.assertIn(sibling, installed["hooks"][EVENT])
                self.assertEqual(len(installed["hooks"][EVENT]), 2)
                before_status = self.snapshot()
                self.run_cli("status", host)
                self.assertEqual(self.snapshot(), before_status)
                self.run_cli("uninstall", host)
                self.assertEqual(self.read_config(host), original)

    def test_repeated_install_is_idempotent_and_uninstall_is_safe_twice(self):
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                self.run_cli("install", host)
                installed = self.snapshot()
                self.run_cli("install", host)
                self.assertEqual(self.snapshot(), installed)
                self.run_cli("uninstall", host)
                after_removal = self.snapshot()
                self.run_cli("uninstall", host)
                self.assertEqual(self.snapshot(), after_removal)

    def test_dry_runs_and_status_create_no_files_or_directories(self):
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                before = self.snapshot()
                self.run_cli("status", host)
                self.run_cli("install", host, "--dry-run")
                self.run_cli("uninstall", host, "--dry-run")
                self.assertEqual(self.snapshot(), before)
                self.run_cli("install", host)
                installed = self.snapshot()
                self.run_cli("uninstall", host, "--dry-run")
                self.assertEqual(self.snapshot(), installed)

    def test_project_scope_requires_an_explicit_root_and_uses_personal_claude_file(self):
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                before = self.snapshot()
                self.run_cli("install", host, "--scope", "project", success=False)
                self.assertEqual(self.snapshot(), before)
                self.run_cli("install", host, "--scope", "project", "--project-root", str(self.project))
                self.assertTrue(self.config_path(host, project=True).is_file())
                self.assertFalse(self.config_path(host).exists())
                self.assertFalse((self.project / ".claude/settings.json").exists())
                self.run_cli("uninstall", host, "--scope", "project", "--project-root", str(self.project))
                files = [path for path in self.project.rglob("*") if path.is_file()]
                self.assertTrue(all(path in {self.config_path(name, project=True)
                    for name in ("codex", "claude-code")} for path in files), files)

    @staticmethod
    def emitted_binding(output):
        context = output["hookSpecificOutput"]["additionalContext"]
        prefix = "\nLocal registration (never send to provider): "
        guidance, marker, binding = context.rpartition(prefix)
        if not marker:
            raise AssertionError("The emitter must identify its local registration")
        return guidance, json.loads(binding)

    def test_project_only_hook_emits_exact_binding_with_hostile_root_as_data(self):
        hostile = self.root / "project ü ' %NO_SUCH_ENVIRONMENT% $ ` ; {scope}"
        hostile.mkdir()
        project_args = ("--scope", "project", "--project-root", str(hostile))
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                installed = self.run_cli("install", host, *project_args)
                hook = installed["registration"]["hooks"][0]
                output = self.execute_registration(host, hook)
                guidance, binding = self.emitted_binding(output)
                self.assertEqual(binding, {"host": host, "scope": "project",
                                           "project_root": str(hostile)})
                self.assertNotIn(str(hostile), guidance)
                self.assertFalse(self.config_path(host).exists())
                project_status = self.run_cli("status", host, *project_args)
                self.assertEqual(project_status["status"], "configured")
                self.assertEqual(project_status["guidance"], output["hookSpecificOutput"]["additionalContext"])
                self.run_cli("uninstall", host, *project_args)
                self.assertEqual(self.run_cli("status", host, *project_args)["status"], "absent")

    def test_user_and_project_hooks_emit_distinct_registration_bindings(self):
        project_args = ("--scope", "project", "--project-root", str(self.project))
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                self.run_cli("install", host)
                self.run_cli("install", host, *project_args)
                user_hook = self.registration(host)
                project_hook = self.registration(host, project=True)
                user_output = self.execute_registration(host, user_hook)
                project_output = self.execute_registration(host, project_hook)
                user_guidance, user_binding = self.emitted_binding(user_output)
                project_guidance, project_binding = self.emitted_binding(project_output)
                self.assertEqual(user_binding, {"host": host, "scope": "user", "project_root": None})
                self.assertEqual(project_binding, {"host": host, "scope": "project",
                                                   "project_root": str(self.project)})
                self.assertEqual(user_guidance, project_guidance)
                self.assertNotEqual(user_output, project_output)
                before = self.snapshot()
                self.run_cli("install", host)
                self.run_cli("install", host, *project_args)
                self.assertEqual(self.snapshot(), before)
                self.run_cli("uninstall", host, *project_args)
                self.assertEqual(self.run_cli("status", host)["status"], "configured")
                self.assertEqual(self.registration(host), user_hook)

    @unittest.skipUnless(os.name == "nt", "Requires native Windows case-insensitive paths")
    def test_windows_equivalent_case_config_paths_preserve_ownership_lifecycle(self):
        for host, variable in (("codex", "CODEX_HOME"), ("claude-code", "CLAUDE_CONFIG_DIR")):
            with self.subTest(host=host):
                installed = self.run_cli("install", host)
                alternate = dict(self.env, **{variable: self.env[variable].swapcase()})
                before = self.snapshot()
                status = self.run_cli("status", host, env=alternate)
                self.assertEqual(status["status"], "configured")
                self.assertEqual(status["receipt_path"], installed["receipt_path"])
                self.assertEqual(self.run_cli("install", host, env=alternate)["status"], "unchanged")
                self.assertEqual(self.snapshot(), before)
                self.assertEqual(self.run_cli("uninstall", host, env=alternate)["status"], "uninstalled")
                self.assertEqual(self.run_cli("status", host)["status"], "absent")

    def test_user_home_defaults_are_used_without_explicit_overrides(self):
        env = dict(self.env)
        env.pop("CODEX_HOME")
        env.pop("CLAUDE_CONFIG_DIR")
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                self.run_cli("install", host, env=env)
                self.assertTrue(self.config_path(host).is_file())

    def test_configuration_directory_overrides_are_respected(self):
        for host, variable, name in (
            ("codex", "CODEX_HOME", "hooks.json"),
            ("claude-code", "CLAUDE_CONFIG_DIR", "settings.json"),
        ):
            with self.subTest(host=host):
                override = self.root / ("custom " + host + " ü ' % $ `")
                override.mkdir()
                env = dict(self.env, **{variable: str(override)})
                self.run_cli("install", host, env=env)
                self.assertTrue((override / name).is_file())
                self.assertFalse(self.config_path(host).exists())

    def test_invalid_json_and_wrong_hook_shapes_remain_unchanged(self):
        for content in ("{broken", "[]", '{"hooks": []}',
                        '{"hooks": {"UserPromptSubmit": {}}}',
                        '{"hooks": {}, "hooks": {"Stop": []}}'):
            for host in ("codex", "claude-code"):
                with self.subTest(content=content, host=host):
                    self.config_path(host).write_text(content, encoding="utf-8")
                    before = self.snapshot()
                    self.run_cli("install", host, success=False)
                    self.assertEqual(self.snapshot(), before)

    def test_uninstall_preserves_later_unrelated_edits(self):
        self.run_cli("install")
        config = self.read_config()
        config["laterSetting"] = "Keep this user change"
        added = {"hooks": [{"type": "command", "command": "later-command"}]}
        config["hooks"][EVENT].insert(0, added)
        self.write_config("codex", config)
        self.run_cli("uninstall")
        remaining = self.read_config()
        self.assertEqual(remaining["laterSetting"], config["laterSetting"])
        self.assertEqual(remaining["hooks"][EVENT], [added])

    def test_user_modified_owned_hook_is_not_overwritten_or_removed(self):
        self.run_cli("install")
        config = self.read_config()
        config["hooks"][EVENT][0]["hooks"][0]["command"] = "user-replaced-command"
        self.write_config("codex", config)
        before = self.snapshot()
        self.run_cli("install", success=False)
        self.assertEqual(self.snapshot(), before)
        self.run_cli("uninstall", success=False)
        self.assertEqual(self.snapshot(), before)

    def test_duplicate_owned_hook_is_an_ownership_conflict(self):
        self.run_cli("install")
        config = self.read_config()
        config["hooks"][EVENT].append(config["hooks"][EVENT][0])
        self.write_config("codex", config)
        before = self.snapshot()
        self.run_cli("uninstall", success=False)
        self.assertEqual(self.snapshot(), before)

    def test_hook_file_symlink_is_rejected_without_changing_its_target(self):
        target = self.root / "must-not-change.json"
        target.write_text('{"other": true}\n', encoding="utf-8")
        try:
            self.config_path().symlink_to(target)
        except OSError as error:
            self.skipTest("Symlink creation unavailable: " + str(error))
        before = self.snapshot()
        self.run_cli("install", success=False)
        self.assertEqual(self.snapshot(), before)

    def test_parent_directory_symlink_is_rejected(self):
        target = self.root / "linked-config-target"
        target.mkdir()
        self.codex.rmdir()
        try:
            self.codex.symlink_to(target, target_is_directory=True)
        except OSError as error:
            self.skipTest("Symlink creation unavailable: " + str(error))
        before = self.snapshot()
        self.run_cli("install", success=False)
        self.assertEqual(self.snapshot(), before)

    @unittest.skipUnless(os.name == "nt", "Requires native Windows junctions")
    def test_windows_config_directory_junction_is_rejected(self):
        target = self.root / "junction-target"
        target.mkdir()
        original = b'{"unchanged":"junction-target"}\n'
        protected = target / "hooks.json"
        protected.write_bytes(original)
        self.codex.rmdir()
        result = subprocess.run(
            [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", "mklink", "/J",
             str(self.codex), str(target)], capture_output=True, env=self.env, timeout=15)
        self.assertEqual(result.returncode, 0, repr(result.stdout + result.stderr))
        try:
            failure = self.run_cli("install", success=False)
            self.assertIn("symlink_path", failure["reason"])
            self.assertEqual(protected.read_bytes(), original)
        finally:
            self.codex.rmdir()

    def test_emitters_discard_large_binary_stdin_and_leave_no_runtime_state(self):
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                self.run_cli("install", host)
                hook = self.registration(host)
                self.assertEqual(hook["timeout"], 5)
                self.assertFalse(hook.get("async", False))
                before = self.snapshot()
                ordinary = self.execute_registration(host, hook)
                after_startup = self.snapshot()
                if os.name == "nt" and host == "codex":
                    # PowerShell 5.1 creates empty profile directories on first
                    # startup even with -NoProfile. It must not change existing
                    # state or create files; later prompt-bearing calls write none.
                    self.assertEqual({key: after_startup[key] for key in before}, before)
                    self.assertTrue(all(value == ("directory", None)
                                        for key, value in after_startup.items() if key not in before))
                else:
                    self.assertEqual(after_startup, before)
                before = after_startup
                marker = b"UNTRUSTED-PROMPT-DO-NOT-PRINT-OR-PERSIST"
                large = b"\xff\x00" + marker + b"x" * (8 * 1024 * 1024)
                hostile = self.execute_registration(host, hook, large)
                self.assertEqual(hostile, ordinary)
                self.assertNotIn(marker.decode(), json.dumps(hostile))
                self.assertEqual(self.snapshot(), before)

    def test_status_separates_registration_from_live_qualification(self):
        installed = self.run_cli("install")
        self.assertEqual(installed["status"], "installed")
        status = self.run_cli("status")
        self.assertEqual(status["status"], "configured")
        self.assertEqual(status["qualification"], "not_verified")
        self.assertEqual(Path(status["config_path"]), self.config_path())
        self.assertTrue(Path(status["interpreter"]).is_file())
        self.assertTrue(status["interpreter_available"])
        self.assertTrue(status["guidance"].strip())

    def test_private_receipt_and_backup_stay_outside_project(self):
        original = b'{"unrelatedSetting": "synthetic-backup-marker"}\n'
        config = self.config_path("claude-code", project=True)
        config.parent.mkdir(parents=True)
        config.write_bytes(original)
        result = self.run_cli(
            "install", "claude-code", "--scope", "project", "--project-root", str(self.project),
        )
        receipt = Path(result["receipt_path"])
        self.assertTrue(receipt.is_file())
        self.assertNotIn(self.project, receipt.parents)
        private_files = [path for path in receipt.parent.rglob("*") if path.is_file()]
        self.assertTrue(any(path.read_bytes() == original for path in private_files))
        self.assertNotIn("synthetic-backup-marker", json.dumps(result))
        if os.name != "nt":
            self.assertEqual(receipt.stat().st_mode & 0o077, 0)
            for path in private_files:
                self.assertEqual(path.stat().st_mode & 0o077, 0)

    def test_missing_ownership_receipt_does_not_adopt_an_existing_registration(self):
        result = self.run_cli("install")
        Path(result["receipt_path"]).unlink()
        before = self.snapshot()
        self.run_cli("install", success=False)
        self.assertEqual(self.snapshot(), before)
        self.run_cli("uninstall", success=False)
        self.assertEqual(self.snapshot(), before)

    def test_corrupt_ownership_receipt_is_preserved(self):
        result = self.run_cli("install")
        Path(result["receipt_path"]).write_text("{damaged", encoding="utf-8")
        before = self.snapshot()
        self.run_cli("install", success=False)
        self.assertEqual(self.snapshot(), before)
        self.run_cli("uninstall", success=False)
        self.assertEqual(self.snapshot(), before)

    def test_global_disable_flag_is_reported_and_preserved(self):
        original = {"disableAllHooks": True, "hooks": {}}
        self.write_config("claude-code", original)
        self.run_cli("install", "claude-code")
        status = self.run_cli("status", "claude-code")
        self.assertEqual(status["host_activation"], "disabled_in_selected_config")
        self.assertTrue(self.read_config("claude-code")["disableAllHooks"])
        self.run_cli("uninstall", "claude-code")
        self.assertTrue(self.read_config("claude-code")["disableAllHooks"])

    def test_existing_manager_lock_prevents_an_overlapping_mutation(self):
        result = self.run_cli("install")
        lock = Path(result["receipt_path"]).with_suffix(".lock")
        lock.write_text("synthetic-existing-lock\n", encoding="utf-8")
        before = self.snapshot()
        failure = self.run_cli("uninstall", success=False)
        self.assertIn("manager_locked", failure["reason"])
        self.assertEqual(self.snapshot(), before)


    def test_private_state_inside_project_or_repository_is_rejected(self):
        for kind in ("project", "repository-directory", "repository-file"):
            with self.subTest(kind=kind):
                container = self.root / kind
                container.mkdir()
                if kind == "repository-directory":
                    (container / ".git").mkdir()
                    (container / ".git/HEAD").write_text("ref: refs/heads/main\\n", encoding="ascii")
                elif kind == "repository-file":
                    (container / ".git").write_text("gitdir: /synthetic/git-metadata\\n", encoding="ascii")
                env = dict(self.env, XDG_STATE_HOME=str(container / "state"),
                           LOCALAPPDATA=str(container / "state"))
                extra = ("--scope", "project", "--project-root", str(container)) if kind == "project" else ()
                before = self.snapshot()
                result = self.run_cli("install", "codex", *extra, env=env, success=False)
                self.assertIn("state_directory_inside_", result["reason"])
                self.assertEqual(self.snapshot(), before)

    def versioned_home(self):
        if os.name == "nt":
            self.skipTest("Version-controlled home exception is POSIX only")
        git = shutil.which("git")
        if git is None:
            self.skipTest("Existing Git required for home exception")
        env = {key: value for key, value in self.env.items()
               if not key.startswith("GIT_") and key != "XDG_STATE_HOME"}
        self.git = git
        initialized = subprocess.run([git, "init", "--quiet", str(self.home)],
                                     env=env, capture_output=True, timeout=10)
        self.assertEqual(initialized.returncode, 0, repr(initialized.stderr))
        state = self.home / ".local/state/jev-capability-advisor/hooks"
        return env, state

    def test_versioned_home_state_is_ignored_for_complete_lifecycle(self):
        env, state = self.versioned_home()
        original = {"unrelated": "synthetic-preserved-setting"}
        self.write_config("codex", original)
        result = self.run_cli("install", env=env)
        self.assertEqual(result["state_git_exclusion"], "present")
        self.assertEqual(Path(result["receipt_path"]).parent, state)
        self.assertEqual((state / ".gitignore").read_bytes(), b"*\n")
        private_files = [path for path in state.iterdir() if path.is_file()]
        self.assertGreaterEqual(len(private_files), 3)
        for path in private_files:
            ignored = subprocess.run(
                [self.git, "-C", str(self.home), "check-ignore", "--no-index", str(path)],
                capture_output=True, env=env, timeout=10)
            self.assertEqual(ignored.returncode, 0, str(path))
            self.assertEqual(path.stat().st_mode & 0o077, 0)
        before = self.snapshot()
        status = self.run_cli("status", env=env)
        self.assertEqual(status["state_git_exclusion"], "present")
        self.assertEqual(self.run_cli("install", env=env)["status"], "unchanged")
        self.assertEqual(self.snapshot(), before)
        self.run_cli("uninstall", env=env)
        self.assertEqual(self.read_config()["unrelated"], original["unrelated"])
        self.assertEqual(self.read_config()["hooks"][EVENT], [])
        self.assertFalse((self.home / ".git/index").exists())

    def test_versioned_home_read_only_actions_do_not_create_exclusion(self):
        env, state = self.versioned_home()
        before = self.snapshot()
        status = self.run_cli("status", env=env)
        self.assertEqual(status["state_git_exclusion"], "missing")
        self.assertIn("state_git_exclusion_missing", status["known_obstacles"])
        self.run_cli("install", "codex", "--dry-run", env=env)
        self.run_cli("uninstall", env=env)
        self.assertFalse(state.exists())
        self.assertEqual(self.snapshot(), before)

    def test_versioned_home_missing_exclusion_is_repaired_without_hook_rewrite(self):
        env, state = self.versioned_home()
        result = self.run_cli("install", env=env)
        config = self.config_path()
        config_metadata = self.write_identity(config)
        receipt = Path(result["receipt_path"]).read_bytes()
        (state / ".gitignore").unlink()
        before = self.snapshot()
        self.assertEqual(self.run_cli("status", env=env)["state_git_exclusion"], "missing")
        self.run_cli("install", "codex", "--dry-run", env=env)
        self.assertEqual(self.snapshot(), before)
        repaired = self.run_cli("install", env=env)
        self.assertEqual(repaired["status"], "unchanged")
        self.assertEqual(repaired["state_git_exclusion"], "present")
        self.assertEqual(self.write_identity(config), config_metadata)
        self.assertEqual(Path(result["receipt_path"]).read_bytes(), receipt)
        self.assertEqual((state / ".gitignore").read_bytes(), b"*\n")

    def test_versioned_home_changed_exclusion_is_preserved(self):
        env, state = self.versioned_home()
        self.run_cli("install", env=env)
        (state / ".gitignore").write_bytes(b"!*.json\n")
        before = self.snapshot()
        status = self.run_cli("status", env=env)
        self.assertIn("state_git_exclusion_changed", status["known_obstacles"])
        for action in ("install", "uninstall"):
            failure = self.run_cli(action, env=env, success=False)
            self.assertEqual(failure["reason"], "state_git_exclusion_changed")
        self.assertEqual(self.snapshot(), before)

    def test_versioned_home_rejects_tracked_state_despite_ignore(self):
        env, state = self.versioned_home()
        state.mkdir(parents=True)
        tracked = state / "synthetic-existing-receipt.json"
        tracked.write_bytes(b"{}")
        # This is an isolated test repository's index, never the source index.
        added = subprocess.run([self.git, "-C", str(self.home), "add", "--", str(tracked)],
                               env=env, capture_output=True, timeout=10)
        self.assertEqual(added.returncode, 0, repr(added.stderr))
        (state / ".gitignore").write_bytes(b"*\n")
        before = self.snapshot()
        failure = self.run_cli("install", env=env, success=False)
        self.assertEqual(failure["reason"], "home_state_already_tracked")
        self.assertEqual(self.snapshot(), before)

    def test_versioned_home_does_not_allow_other_state_or_nested_repository(self):
        env, state = self.versioned_home()
        override = dict(env, XDG_STATE_HOME=str(self.home / "other-state"))
        before = self.snapshot()
        failure = self.run_cli("install", env=override, success=False)
        self.assertEqual(failure["reason"], "state_directory_inside_repository")
        self.assertEqual(self.snapshot(), before)
        nested = self.home / ".local"
        nested.mkdir()
        initialized = subprocess.run([self.git, "init", "--quiet", str(nested)],
                                     env=env, capture_output=True, timeout=10)
        self.assertEqual(initialized.returncode, 0, repr(initialized.stderr))
        before = self.snapshot()
        failure = self.run_cli("install", env=env, success=False)
        self.assertEqual(failure["reason"], "state_directory_inside_repository")
        self.assertEqual(self.snapshot(), before)

    def test_versioned_home_ignores_inherited_git_redirection(self):
        env, state = self.versioned_home()
        env.update(GIT_DIR=str(self.root / "nonexistent-git"),
                   GIT_WORK_TREE=str(self.project), GIT_INDEX_FILE=str(self.root / "fake-index"))
        result = self.run_cli("install", env=env)
        self.assertEqual(result["status"], "installed")
        self.assertTrue((state / ".gitignore").exists())
        self.assertFalse((self.root / "fake-index").exists())

    def test_interrupted_registration_transaction_is_recoverable_without_duplicates(self):
        spec = importlib.util.spec_from_file_location("jev_hooks_transaction_fixture", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        self.addCleanup(sys.modules.pop, spec.name, None)
        spec.loader.exec_module(module)
        original_write = module.atomic_write
        for phase in ("before-config", "after-config"):
            for action in ("install", "uninstall"):
                with self.subTest(phase=phase, action=action):
                    host = "codex" if phase == "before-config" else "claude-code"
                    target = self.config_path(host)
                    target.write_bytes(b'{"unrelated": "preserve-me"}')
                    if action == "uninstall":
                        self.run_cli("install", host)
                    original = target.read_bytes()
                    def interrupt(path, data, expected):
                        if Path(path) == target:
                            if phase == "after-config":
                                original_write(path, data, expected)
                            raise OSError("synthetic interrupted registration")
                        return original_write(path, data, expected)
                    arguments = SimpleNamespace(action=action, host=host, scope="user",
                                                project_root=None, dry_run=False)
                    with patch.dict(os.environ, self.env, clear=True), \
                            patch.object(module, "atomic_write", side_effect=interrupt):
                        with self.assertRaisesRegex(OSError, "synthetic interrupted"):
                            module.run(arguments)
                    if phase == "before-config":
                        self.assertEqual(target.read_bytes(), original)
                    result = self.run_cli(action, host)
                    receipt = json.loads(Path(result["receipt_path"]).read_text(encoding="utf-8"))
                    self.assertEqual(receipt["phase"], "complete")
                    recovered = self.read_config(host)
                    self.assertEqual(recovered["unrelated"], "preserve-me")
                    self.assertEqual(len(recovered["hooks"][EVENT]), 1 if action == "install" else 0)
                    recovered["laterSetting"] = "preserve-after-recovery"
                    self.write_config(host, recovered)
                    self.run_cli("status", host)
                    self.run_cli("uninstall", host)
                    self.assertEqual(self.read_config(host)["laterSetting"], "preserve-after-recovery")
                    self.assertEqual(self.read_config(host)["hooks"][EVENT], [])

    def credential_file(self, name="provider key ü ' $ %.txt", value=b"synthetic-provider-secret\n"):
        path = self.root / name
        path.write_bytes(value)
        return path

    def hook_module(self):
        spec = importlib.util.spec_from_file_location("jev_hooks_credentials_fixture", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        self.addCleanup(sys.modules.pop, spec.name, None)
        spec.loader.exec_module(module)
        return module

    def test_key_file_reference_is_private_and_never_copied_into_hook_or_outputs(self):
        secret = b"SYNTHETIC-KEY-CONTENT-MUST-NOT-BE-COPIED"
        key = self.credential_file(value=secret)
        original_stat = self.write_identity(key)
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                installed = self.run_cli("install", host, "--key-file", str(key))
                status = self.run_cli("status", host)
                credentials = status["credentials"]
                self.assertEqual(credentials["source"], "key_file")
                self.assertEqual(credentials["readiness"], "ready")
                self.assertIsNone(credentials["reason"])
                self.assertEqual(Path(credentials["key_file"]), key)
                settings = Path(status["credential_config_path"])
                self.assertEqual(settings.name, host + "-settings.json")
                self.assertEqual(settings.parent, Path(status["receipt_path"]).parent)
                self.assertFalse(settings.is_relative_to(self.project))
                self.assertEqual((settings.parent / ".gitignore").read_bytes(), b"*\n")
                self.assertNotIn(str(key), self.config_path(host).read_text(encoding="utf-8"))
                self.assertNotIn(secret.decode(), json.dumps([installed, status]))
                for candidate in self.root.rglob("*"):
                    if candidate.is_file() and candidate != key:
                        self.assertNotIn(secret, candidate.read_bytes(), str(candidate))
                if os.name != "nt":
                    self.assertEqual(settings.stat().st_mode & 0o777, 0o600)
        self.assertEqual(key.read_bytes(), secret)
        self.assertEqual(self.write_identity(key), original_stat)

    def test_key_reference_update_preserves_hook_bytes_and_other_private_settings(self):
        first = self.credential_file("first-key.txt")
        second = self.credential_file("second-key.txt")
        self.run_cli("install", "codex", "--key-file", str(first))
        status = self.run_cli("status")
        settings = Path(status["credential_config_path"])
        stored = json.loads(settings.read_text(encoding="utf-8"))
        stored["future_setting"] = {"keep": ["untouched", 42]}
        settings.write_text(json.dumps(stored), encoding="utf-8")
        before_settings = settings.read_bytes()
        before_hook = self.config_path().read_bytes()
        hook_metadata = self.write_identity(self.config_path())
        self.run_cli("install", "codex", "--key-file", str(second))
        current = self.run_cli("status")
        self.assertEqual(current["credentials"]["key_file"], str(second))
        self.assertEqual(self.config_path().read_bytes(), before_hook)
        self.assertEqual(self.write_identity(self.config_path()), hook_metadata)
        self.assertEqual(json.loads(settings.read_text(encoding="utf-8"))["future_setting"],
                         stored["future_setting"])
        backups = [item for item in settings.parent.glob("*.backup.json")
                   if item.read_bytes() == before_settings]
        self.assertEqual(len(backups), 1, "Replacing the private pointer must retain its prior bytes")
        if os.name != "nt":
            self.assertEqual(backups[0].stat().st_mode & 0o777, 0o600)
        before_repeat = self.snapshot()
        self.run_cli("install")
        self.run_cli("install", "codex", "--key-file", str(second))
        self.assertEqual(self.snapshot(), before_repeat)

    def test_key_reference_is_shared_between_scopes_and_isolated_between_hosts(self):
        key = self.credential_file()
        self.run_cli("install", "codex", "--key-file", str(key))
        user = self.run_cli("status")
        project_args = ("--scope", "project", "--project-root", str(self.project))
        self.run_cli("install", "codex", *project_args)
        project = self.run_cli("status", "codex", *project_args)
        self.assertEqual(project["credentials"], user["credentials"])
        self.assertEqual(project["credential_config_path"], user["credential_config_path"])
        other = self.run_cli("status", "claude-code")
        self.assertEqual(other["credentials"]["source"], "none")
        self.assertNotEqual(other["credential_config_path"], user["credential_config_path"])
        self.run_cli("uninstall")
        self.assertEqual(self.run_cli("status")["credentials"], user["credentials"])
        self.assertEqual(self.run_cli("status", "codex", *project_args)["status"], "configured")

    def test_environment_used_only_without_configured_key_reference(self):
        self.run_cli("install")
        without = self.run_cli("status")["credentials"]
        self.assertEqual(without["source"], "none")
        self.assertEqual(without["readiness"], "unavailable")
        self.assertTrue(without["reason"])
        env = dict(self.env, TYPESAFE_API_KEY="SYNTHETIC-ENVIRONMENT-SECRET")
        environment = self.run_cli("status", env=env)
        self.assertEqual(environment["credentials"]["source"], "environment")
        self.assertEqual(environment["credentials"]["readiness"], "ready")
        self.assertNotIn(env["TYPESAFE_API_KEY"], json.dumps(environment))
        key = self.credential_file()
        self.run_cli("install", "codex", "--key-file", str(key), env=env)
        configured = self.run_cli("status", env=env)
        self.assertEqual(configured["credentials"]["source"], "key_file")
        key.unlink()
        unavailable = self.run_cli("status", env=env)["credentials"]
        self.assertEqual(unavailable["source"], "key_file")
        self.assertEqual(unavailable["readiness"], "unavailable")
        self.assertIn("missing", unavailable["reason"])
        self.assertEqual(unavailable["key_file"], str(key))

    def test_missing_empty_and_nonregular_new_key_files_leave_everything_unchanged(self):
        missing = self.root / "missing-key.txt"
        empty = self.credential_file("empty-key.txt", b"")
        directory = self.root / "key-directory"
        directory.mkdir()
        for key in (missing, empty, directory):
            with self.subTest(key=key.name):
                before = self.snapshot()
                failure = self.run_cli("install", "codex", "--key-file", str(key), success=False)
                self.assertIn("key_file", failure["reason"])
                self.assertEqual(self.snapshot(), before)

    def test_configured_key_becoming_empty_is_unavailable_without_environment_fallback(self):
        key = self.credential_file()
        self.run_cli("install", "codex", "--key-file", str(key))
        key.write_bytes(b"")
        before = self.snapshot()
        status = self.run_cli("status", env=dict(self.env, TYPESAFE_API_KEY="synthetic-env"))
        self.assertEqual(status["credentials"]["source"], "key_file")
        self.assertEqual(status["credentials"]["readiness"], "unavailable")
        self.assertIn("empty", status["credentials"]["reason"])
        self.assertEqual(self.snapshot(), before)

    def test_key_reference_dry_run_leaves_no_state_and_existing_reference_unchanged(self):
        first = self.credential_file("first-key.txt")
        second = self.credential_file("second-key.txt")
        before = self.snapshot()
        self.run_cli("install", "codex", "--key-file", str(first), "--dry-run")
        self.assertEqual(self.snapshot(), before)
        self.run_cli("install", "codex", "--key-file", str(first))
        before = self.snapshot()
        self.run_cli("install", "codex", "--key-file", str(second), "--dry-run")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.run_cli("status")["credentials"]["key_file"], str(first))

    def test_corrupt_credential_config_does_not_get_overwritten_or_hide_readiness_failure(self):
        key = self.credential_file()
        self.run_cli("install", "codex", "--key-file", str(key))
        settings = Path(self.run_cli("status")["credential_config_path"])
        malformed = (b"{broken", b"[]", b'{"version":999,"key_file":"x"}',
                     json.dumps({"version": 1, "host": "codex",
                                 "key_file": str(key) + "\x00"}).encode("utf-8"))
        for contents in malformed:
            with self.subTest(contents=contents):
                settings.write_bytes(contents)
                before = self.snapshot()
                status = self.run_cli("status", env=dict(self.env, TYPESAFE_API_KEY="synthetic-env"))
                self.assertEqual(status["status"], "configured")
                self.assertEqual(status["credentials"]["readiness"], "unavailable")
                self.assertIn("credential_config", status["credentials"]["reason"])
                self.run_cli("install", "codex", "--key-file", str(key), success=False)
                self.run_cli("install", success=False)
                self.assertEqual(self.snapshot(), before)
        self.run_cli("uninstall")
        self.assertEqual(settings.read_bytes(), contents)

    def test_credential_settings_symlink_is_not_followed_for_replacement(self):
        key = self.credential_file()
        self.run_cli("install", "codex", "--key-file", str(key))
        settings = Path(self.run_cli("status")["credential_config_path"])
        target = self.root / "external-settings.json"
        settings.rename(target)
        try:
            settings.symlink_to(target)
        except OSError as error:
            self.skipTest("Symlink creation unavailable: " + str(error))
        before = self.snapshot()
        self.run_cli("install", "codex", "--key-file", str(key), success=False)
        self.assertEqual(self.snapshot(), before)

    def test_private_credential_lock_prevents_key_update_across_registration_scopes(self):
        first = self.credential_file("first-key.txt")
        second = self.credential_file("second-key.txt")
        self.run_cli("install", "codex", "--key-file", str(first))
        settings = Path(self.run_cli("status")["credential_config_path"])
        settings.with_suffix(".lock").write_text("synthetic-other-scope\n", encoding="ascii")
        before = self.snapshot()
        failure = self.run_cli("install", "codex", "--scope", "project", "--project-root",
                               str(self.project), "--key-file", str(second), success=False)
        self.assertIn("locked", failure["reason"])
        self.assertEqual(self.snapshot(), before)

    def test_unreadable_key_is_reported_without_environment_fallback_or_state_changes(self):
        key = self.credential_file()
        self.run_cli("install", "codex", "--key-file", str(key))
        module = self.hook_module()
        original_open = module.os.open
        def deny_key(path, flags, *args, **kwargs):
            if Path(path) == key:
                raise PermissionError("synthetic permission denied")
            return original_open(path, flags, *args, **kwargs)
        arguments = SimpleNamespace(action="status", host="codex", scope="user",
                                    project_root=None, dry_run=False, key_file=None)
        before = self.snapshot()
        with patch.dict(os.environ, dict(self.env, TYPESAFE_API_KEY="synthetic-env"), clear=True), \
                patch.object(module.os, "open", side_effect=deny_key):
            status = module.run(arguments)
            self.assertEqual(status["credentials"]["source"], "key_file")
            self.assertEqual(status["credentials"]["reason"], "key_file_unreadable")
            self.assertEqual(status["credentials"]["readiness"], "unavailable")
            arguments.action, arguments.key_file = "install", key
            with self.assertRaisesRegex(module.HookError, "key_file_unreadable"):
                module.run(arguments)
        self.assertEqual(self.snapshot(), before)

    def test_concurrent_private_settings_edit_is_preserved_during_key_update(self):
        first = self.credential_file("first-key.txt")
        second = self.credential_file("second-key.txt")
        self.run_cli("install", "codex", "--key-file", str(first))
        settings = Path(self.run_cli("status")["credential_config_path"])
        concurrent = json.loads(settings.read_text(encoding="utf-8"))
        concurrent["concurrent_owner_setting"] = "preserve"
        concurrent_bytes = json.dumps(concurrent).encode("utf-8")
        module = self.hook_module()
        original_write = module.write_credential_settings
        def edit_before_commit(path, updated, snapshot):
            self.assertEqual(path, settings)
            path.write_bytes(concurrent_bytes)
            return original_write(path, updated, snapshot)
        arguments = SimpleNamespace(action="install", host="codex", scope="user",
                                    project_root=None, dry_run=False, key_file=second)
        before_hook = self.config_path().read_bytes()
        with patch.dict(os.environ, self.env, clear=True), \
                patch.object(module, "write_credential_settings", side_effect=edit_before_commit):
            with self.assertRaisesRegex(module.HookError, "credential_update_incomplete") as failure:
                module.run(arguments)
        self.assertIn("concurrent_modification", str(failure.exception.__cause__))
        self.assertEqual(settings.read_bytes(), concurrent_bytes)
        self.assertEqual(self.config_path().read_bytes(), before_hook)
        self.assertFalse(settings.with_suffix(".lock").exists())
        status = self.run_cli("status", env=dict(self.env, TYPESAFE_API_KEY="synthetic-env"))
        self.assertEqual(status["credentials"]["readiness"], "unavailable")
        self.assertEqual(status["credentials"]["reason"], "incomplete_credential_update")
        before_retry = self.snapshot()
        self.run_cli("install", "codex", "--key-file", str(second), success=False)
        self.assertEqual(self.snapshot(), before_retry)

    def test_interrupted_credential_update_blocks_advice_and_recovers_only_with_original_reference(self):
        first = self.credential_file("first-key.txt")
        second = self.credential_file("second-key.txt")
        module = self.hook_module()
        original_write = module.write_credential_settings
        for phase, host in (("before-write", "codex"), ("after-write", "claude-code")):
            with self.subTest(phase=phase):
                self.run_cli("install", host, "--key-file", str(first))
                settings = Path(self.run_cli("status", host)["credential_config_path"])
                before_hook = self.config_path(host).read_bytes()
                def interrupt(path, updated, snapshot):
                    if phase == "after-write":
                        original_write(path, updated, snapshot)
                    raise OSError("synthetic interrupted credential update")
                arguments = SimpleNamespace(action="install", host=host, scope="user",
                                            project_root=None, dry_run=False, key_file=second)
                with patch.dict(os.environ, self.env, clear=True), \
                        patch.object(module, "write_credential_settings", side_effect=interrupt):
                    with self.assertRaisesRegex(module.HookError, "credential_update_incomplete"):
                        module.run(arguments)
                pending = settings.with_suffix(".pending.json")
                self.assertTrue(pending.is_file())
                failed = self.run_cli("status", host, env=dict(self.env, TYPESAFE_API_KEY="synthetic-env"))
                self.assertEqual(failed["credentials"]["readiness"], "unavailable")
                self.assertEqual(failed["credentials"]["reason"], "incomplete_credential_update")
                before_retry = self.snapshot()
                self.run_cli("install", host, success=False)
                self.run_cli("install", host, "--key-file", str(first), success=False)
                self.assertEqual(self.snapshot(), before_retry)
                self.run_cli("install", host, "--key-file", str(second))
                self.assertFalse(pending.exists())
                self.assertEqual(self.config_path(host).read_bytes(), before_hook)
                recovered = self.run_cli("status", host)
                self.assertEqual(recovered["credentials"]["readiness"], "ready")
                self.assertEqual(recovered["credentials"]["key_file"], str(second))
                before_repeat = self.snapshot()
                self.run_cli("install", host, "--key-file", str(second))
                self.assertEqual(self.snapshot(), before_repeat)

    def test_key_option_is_rejected_for_status_and_uninstall_without_changes(self):
        key = self.credential_file()
        self.run_cli("install")
        before = self.snapshot()
        for action in ("status", "uninstall"):
            with self.subTest(action=action):
                failure = self.run_cli(action, "codex", "--key-file", str(key), success=False)
                self.assertIn("key_file_requires_install", failure["reason"])
                self.assertEqual(self.snapshot(), before)

    def write_qualification_evidence(self, status, **changes):
        context = status["qualification_context"]
        record = {"version": 1, "host": status["host"],
                  "host_version": context["host_version"] or "0.0.0",
                  "platform": context["platform"],
                  "integration_sha256": context["integration_sha256"],
                  "registration_sha256": context["registration_sha256"],
                  "catalog": {"skills": 1, "mcp_tools": 1, "completeness": "bounded"},
                  "scenarios": {name: "passed" for name in (
                      "registration", "delivery", "catalog", "provider", "adoption", "disabled",
                      "explicit_only", "availability_change", "incomplete_metadata", "plan_mode",
                      "missing_key", "error", "timeout", "cancellation", "followup")}}
        record.update(changes)
        path = Path(status["receipt_path"]).with_suffix(".qualification.json")
        path.write_text(json.dumps(record), encoding="utf-8")
        return path, record

    def test_qualification_record_is_separate_from_current_conditions_and_redacted(self):
        self.run_cli("install")
        before_record = self.run_cli("status")
        self.assertEqual(before_record["qualification_evidence"]["status"], "absent")
        path, record = self.write_qualification_evidence(
            before_record, private_raw_prompt="SYNTHETIC-PRIVATE-PROMPT", private_key="SYNTHETIC-PRIVATE-KEY")
        before = self.snapshot()
        status = self.run_cli("status")
        evidence = status["qualification_evidence"]
        expected = "matching_environment" if before_record["qualification_context"]["host_version"] else "historical"
        self.assertEqual(evidence["status"], expected)
        self.assertEqual(Path(evidence["evidence_path"]), path)
        self.assertEqual(status["qualification"], "not_verified")
        self.assertTrue(status["currently_unverified"])
        self.assertNotIn("SYNTHETIC-PRIVATE", json.dumps(status))
        self.assertEqual(self.snapshot(), before)

    def test_changed_integration_or_registration_marks_recorded_evidence_stale(self):
        self.run_cli("install")
        baseline = self.run_cli("status")
        for field in ("integration_sha256", "registration_sha256"):
            with self.subTest(field=field):
                self.write_qualification_evidence(baseline, **{field: "f" * 64})
                status = self.run_cli("status")
                self.assertEqual(status["qualification_evidence"]["status"], "stale")
                self.assertEqual(status["qualification"], "not_verified")

    def test_invalid_evidence_does_not_prevent_status_or_hook_removal(self):
        self.run_cli("install")
        baseline = self.run_cli("status")
        evidence_path, _ = self.write_qualification_evidence(baseline)
        for contents in (b"{broken", b"[]", b'{"version":999}'):
            with self.subTest(contents=contents):
                evidence_path.write_bytes(contents)
                before = self.snapshot()
                status = self.run_cli("status")
                self.assertEqual(status["status"], "configured")
                self.assertEqual(status["qualification_evidence"]["status"], "invalid")
                self.assertEqual(status["qualification"], "not_verified")
                self.assertEqual(self.snapshot(), before)
        self.run_cli("uninstall")
        self.assertEqual(evidence_path.read_bytes(), contents)

    def test_status_does_not_start_a_host_or_network_probe(self):
        self.run_cli("install")
        module = self.hook_module()
        arguments = SimpleNamespace(action="status", host="codex", scope="user",
                                    project_root=None, dry_run=False, key_file=None)
        before = self.snapshot()
        with patch.dict(os.environ, self.env, clear=True), \
                patch.object(module.subprocess, "run", side_effect=AssertionError("process probe forbidden")), \
                patch.object(socket, "socket", side_effect=AssertionError("network probe forbidden")):
            status = module.run(arguments)
        self.assertEqual(status["status"], "configured")
        self.assertIsNone(status["qualification_context"]["host_version"])
        self.assertEqual(self.snapshot(), before)

    def test_host_version_changes_and_simulated_results_never_imply_live_qualification(self):
        self.run_cli("install")
        module = self.hook_module()
        arguments = SimpleNamespace(action="status", host="codex", scope="user",
                                    project_root=None, dry_run=False, key_file=None)
        with patch.dict(os.environ, self.env, clear=True), \
                patch.object(module, "host_version", return_value="1.2.3"):
            baseline = module.run(arguments)
            path, record = self.write_qualification_evidence(baseline)
            record["scenarios"]["timeout"] = "simulated"
            record["catalog"]["private_extra"] = "SYNTHETIC-PRIVATE-CATALOG"
            record["scenarios"]["private_extra"] = "SYNTHETIC-PRIVATE-SCENARIO"
            path.write_text(json.dumps(record), encoding="utf-8")
            matching = module.run(arguments)
        self.assertEqual(matching["qualification_evidence"]["status"], "matching_environment")
        self.assertFalse(matching["qualification_evidence"]["all_scenarios_passed"])
        self.assertEqual(matching["qualification_evidence"]["scenarios"]["timeout"], "simulated")
        self.assertEqual(matching["qualification"], "not_verified")
        self.assertNotIn("SYNTHETIC-PRIVATE", json.dumps(matching))
        for current_version, expected in (("1.2.4", "stale"), (None, "historical")):
            with self.subTest(version=current_version):
                with patch.dict(os.environ, self.env, clear=True), \
                        patch.object(module, "host_version", return_value=current_version):
                    status = module.run(arguments)
                self.assertEqual(status["qualification_evidence"]["status"], expected)
                self.assertEqual(status["qualification"], "not_verified")

    def test_interpreter_path_with_shell_metacharacters_executes_on_native_platform(self):
        environment = self.root / "Python ü space ' %NO_SUCH_ENVIRONMENT% $ ` ;"
        staging = self.root / "python-venv-staging"
        created = subprocess.run(
            [sys.executable, "-B", "-m", "venv", "--without-pip", "--copies", str(staging)],
            capture_output=True, env=self.env, timeout=30,
        )
        self.assertEqual(created.returncode, 0, repr(created.stdout + created.stderr))
        # venv refuses PATH separators at creation, but an existing interpreter
        # can still reside there. Move the isolated copy to exercise that case.
        staging.rename(environment)
        executable = environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        for host in ("codex", "claude-code"):
            with self.subTest(host=host):
                self.run_cli("install", host, interpreter=str(executable))
                hook = self.registration(host)
                if host == "claude-code":
                    self.assertIn(str(environment), hook["command"])
                self.execute_registration(host, hook)
        shutil.rmtree(environment)
        before = self.snapshot()
        for host in ("codex", "claude-code"):
            status = self.run_cli("status", host)
            self.assertFalse(status["interpreter_available"])
            self.assertIn("registered_interpreter_missing", status["known_obstacles"])
        self.assertEqual(self.snapshot(), before)

    @unittest.skipUnless(os.name == "nt", "Requires native Windows shell execution")
    def test_codex_windows_powershell_and_git_bash_emit_same_payload(self):
        self.run_cli("install")
        spec = importlib.util.spec_from_file_location("jev_hooks_windows_fixture", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        self.addCleanup(sys.modules.pop, spec.name, None)
        spec.loader.exec_module(module)
        guidance = 'Grüße 日本語 "quotes" $dollar `backtick %percent%'
        hooks = [self.registration(), module.build_registration(
            "codex", platform="win32", guidance=guidance)["hooks"][0]]
        for hook in hooks:
            baseline = self.execute_registration("codex", hook)
            for shell in ("powershell", "git-bash"):
                with self.subTest(shell=shell):
                    self.assertEqual(self.execute_registration("codex", hook, shell=shell), baseline)
        self.assertEqual(baseline["hookSpecificOutput"]["additionalContext"], guidance)


class HookPrimitiveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("jev_hooks_under_test", SCRIPT)
        cls.module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = cls.module
        cls.addClassCleanup(sys.modules.pop, spec.name, None)
        spec.loader.exec_module(cls.module)

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="jev-hook-primitives-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()

    def test_home_git_failures_and_false_roots_are_refused(self):
        failures = (FileNotFoundError("git unavailable"),
                    subprocess.CalledProcessError(1, "git"),
                    subprocess.TimeoutExpired("git", 5))
        for failure in failures:
            with self.subTest(failure=type(failure).__name__):
                with patch.object(self.module.subprocess, "run", side_effect=failure):
                    with self.assertRaisesRegex(self.module.HookError, "home_state_git_check_failed"):
                        self.module.verify_home_state_repository(self.root, self.root / "state")
        wrong_root = SimpleNamespace(stdout=os.fsencode(self.root / "different") + b"\n")
        with patch.object(self.module.subprocess, "run", return_value=wrong_root):
            with self.assertRaisesRegex(self.module.HookError, "home_state_git_root_mismatch"):
                self.module.verify_home_state_repository(self.root, self.root / "state")

    def test_snapshot_accepts_stable_path_and_descriptor_metadata(self):
        target = self.root / "snapshot.json"
        target.write_bytes(b"old")
        target.write_bytes(b"stable contents after creation")
        lstat = target.lstat()
        with target.open("rb") as stream:
            fstat = os.fstat(stream.fileno())
        fields = ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns",
                  "st_birthtime_ns", "st_mode")
        diagnostic = {name: {field: getattr(value, field, None) for field in fields}
                      for name, value in (("lstat", lstat), ("fstat", fstat))}
        try:
            snapshot = self.module.read_snapshot(target)
        except self.module.HookError as error:
            self.fail(str(error) + "; metadata=" + json.dumps(diagnostic, sort_keys=True))
        self.assertEqual(snapshot.data, b"stable contents after creation")
        self.assertEqual(self.module.read_snapshot(target), snapshot)
        self.assertIsNone(self.module.key_file_readiness(target), json.dumps(diagnostic, sort_keys=True))

    def test_windows_creation_time_normalization_preserves_other_identity_checks(self):
        # Affected Windows Python path stat exposes creation time as ctime while
        # fstat exposes metadata change time; birthtime is consistent in both.
        path_metadata = {"st_dev": 11, "st_ino": 12, "st_size": 13,
                         "st_mtime_ns": 14, "st_ctime_ns": 15,
                         "st_birthtime_ns": 15, "st_mode": 0o100600}
        descriptor_metadata = dict(path_metadata, st_ctime_ns=99)
        with patch.object(self.module.os, "name", "nt"):
            reference = self.module._identity(SimpleNamespace(**path_metadata))
            self.assertEqual(self.module._identity(SimpleNamespace(**descriptor_metadata)), reference)
            for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_birthtime_ns", "st_mode"):
                with self.subTest(field=field):
                    changed = dict(descriptor_metadata)
                    changed[field] += 1
                    self.assertNotEqual(self.module._identity(SimpleNamespace(**changed)), reference)
            legacy = dict(path_metadata)
            legacy.pop("st_birthtime_ns")
            self.assertEqual(self.module._identity(SimpleNamespace(**legacy)), reference)

    def test_posix_identity_preserves_metadata_change_time_even_with_birthtime(self):
        metadata = {"st_dev": 11, "st_ino": 12, "st_size": 13,
                    "st_mtime_ns": 14, "st_ctime_ns": 15,
                    "st_birthtime_ns": 10, "st_mode": 0o100600}
        with patch.object(self.module.os, "name", "posix"):
            before = self.module._identity(SimpleNamespace(**metadata))
            metadata["st_ctime_ns"] += 1
            self.assertNotEqual(self.module._identity(SimpleNamespace(**metadata)), before)

    @unittest.skipIf(os.name == "nt", "POSIX permission changes are not portable to Windows")
    def test_atomic_write_refuses_concurrent_permission_change(self):
        target = self.root / "protected-config.json"
        target.write_bytes(b'{"preserve":true}')
        expected = self.module.read_snapshot(target)
        mode = target.stat().st_mode & 0o777
        target.chmod(mode ^ 0o100)
        changed = target.stat()
        with self.assertRaisesRegex(self.module.HookError, "concurrent_modification"):
            self.module.atomic_write(target, b"{}", expected)
        self.assertEqual(target.read_bytes(), b'{"preserve":true}')
        self.assertEqual(target.stat().st_mode, changed.st_mode)

    def test_atomic_write_refuses_stale_snapshot(self):
        target = self.root / "config.json"
        target.write_bytes(b'{"before": true}')
        expected = self.module.read_snapshot(target)
        external = b'{"external": true}'
        target.write_bytes(external)
        with self.assertRaisesRegex(self.module.HookError, "concurrent_modification"):
            self.module.atomic_write(target, b'{"replacement": true}', expected)
        self.assertEqual(target.read_bytes(), external)
        self.assertEqual(list(self.root.iterdir()), [target])

    def test_atomic_write_rechecks_after_staging_and_cleans_temporary_file(self):
        target = self.root / "config.json"
        target.write_bytes(b'{"before": true}')
        expected = self.module.read_snapshot(target)
        external = b'{"external": true}'
        fsync = os.fsync
        def write_during_staging(descriptor):
            target.write_bytes(external)
            fsync(descriptor)
        with patch.object(self.module.os, "fsync", side_effect=write_during_staging):
            with self.assertRaisesRegex(self.module.HookError, "concurrent_modification"):
                self.module.atomic_write(target, b'{"replacement": true}', expected)
        self.assertEqual(target.read_bytes(), external)
        self.assertEqual(list(self.root.iterdir()), [target])

    def test_atomic_write_does_not_replace_file_created_since_absence_snapshot(self):
        target = self.root / "config.json"
        expected = self.module.read_snapshot(target)
        external = b'{"created_elsewhere": true}'
        target.write_bytes(external)
        with self.assertRaisesRegex(self.module.HookError, "concurrent_modification"):
            self.module.atomic_write(target, b"{}", expected)
        self.assertEqual(target.read_bytes(), external)

    def test_payload_stays_data_and_emitter_never_opens_files_or_network(self):
        guidance = """Literal " ; __import__('os').system('no') # Grüße"""
        handler = self.module.build_registration(
            "claude-code", python_executable=sys.executable, guidance=guidance,
        )["hooks"][0]
        args = handler["args"]
        code_index = args.index("-c") + 1
        emitter, payload = args[code_index:code_index + 2]
        output = io.BytesIO()
        stream = SimpleNamespace(buffer=output)
        untrusted = b'{"prompt":"Do not execute me: __import__(\\"os\\")"}'
        with patch.object(sys, "argv", ["-c", payload]), \
                patch.object(sys, "stdin", SimpleNamespace(buffer=io.BytesIO(untrusted))), \
                patch.object(sys, "stdout", stream), \
                patch("builtins.open", side_effect=AssertionError("file access forbidden")), \
                patch.object(os, "open", side_effect=AssertionError("file access forbidden")), \
                patch.object(socket, "socket", side_effect=AssertionError("network forbidden")):
            exec(compile(emitter, "<hook-emitter>", "exec"), {"__name__": "__main__"})
        parsed = json.loads(output.getvalue())
        self.assertEqual(parsed["hookSpecificOutput"]["additionalContext"], guidance)

    def test_emitter_input_and_output_failures_exit_one_never_blocking_two(self):
        class BrokenStream:
            def read(self, *args):
                raise OSError("synthetic input failure")
            def write(self, *args):
                raise OSError("synthetic output failure")
            def flush(self):
                raise OSError("synthetic flush failure")
        handler = self.module.build_registration("claude-code")["hooks"][0]
        args = handler["args"]
        index = args.index("-c") + 1
        emitter, payload = args[index:index + 2]
        cases = [
            (BrokenStream(), io.BytesIO()),
            (io.BytesIO(b""), BrokenStream()),
        ]
        for incoming, outgoing in cases:
            with self.subTest(incoming=type(incoming).__name__):
                with patch.object(sys, "argv", ["-c", payload]), \
                        patch.object(sys, "stdin", SimpleNamespace(buffer=incoming)), \
                        patch.object(sys, "stdout", SimpleNamespace(buffer=outgoing)):
                    with self.assertRaises(SystemExit) as error:
                        exec(compile(emitter, "<hook-emitter>", "exec"), {"__name__": "__main__"})
                self.assertEqual(error.exception.code, 1)


    def test_emitter_reads_stdin_in_bounded_chunks(self):
        class BoundedInput:
            remaining = 8 * 1024 * 1024
            reads = 0
            def read(self, size=-1):
                if not 0 < size <= 1024 * 1024:
                    raise AssertionError("stdin must be drained in bounded chunks")
                self.reads += 1
                count = min(self.remaining, size)
                self.remaining -= count
                return b"x" * count
        incoming = BoundedInput()
        handler = self.module.build_registration("claude-code")["hooks"][0]
        args = handler["args"]
        index = args.index("-c") + 1
        emitter, payload = args[index:index + 2]
        output = io.BytesIO()
        with patch.object(sys, "argv", ["-c", payload]), \
                patch.object(sys, "stdin", SimpleNamespace(buffer=incoming)), \
                patch.object(sys, "stdout", SimpleNamespace(buffer=output)):
            exec(compile(emitter, "<hook-emitter>", "exec"), {"__name__": "__main__"})
        self.assertGreater(incoming.reads, 8)
        self.assertEqual(incoming.remaining, 0)
        self.assertEqual(json.loads(output.getvalue())["hookSpecificOutput"]["hookEventName"], EVENT)

    def test_windows_builder_keeps_literal_payload_and_enforces_final_command_limit(self):
        guidance = 'Literal " data with $dollar, `backtick, percent% and Unicode ü.'
        handler = self.module.build_registration(
            "codex", python_executable="C:/Python space ' ü/python.exe",
            platform="win32", guidance=guidance,
        )["hooks"][0]
        command = handler["commandWindows"]
        self.assertLessEqual(len(command), self.module.MAX_WINDOWS_COMMAND_CHARS)
        decoded = base64.b64decode(command.rsplit(" ", 1)[1]).decode("utf-16le")
        self.assertIn("C:/Python space '' ü/python.exe", decoded)
        self.assertNotIn(guidance, decoded)
        with self.assertRaisesRegex(self.module.HookError, "windows_command_too_long"):
            self.module.build_registration("codex", platform="win32", guidance="x" * 5000)


if __name__ == "__main__":
    unittest.main()
