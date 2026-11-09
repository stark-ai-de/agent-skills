import datetime as dt
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from urllib.error import HTTPError
from unittest.mock import patch
import yaml

SCRIPT = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/greppy-workspace/scripts/workspace.py"
spec = importlib.util.spec_from_file_location("workspace", SCRIPT)
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.dev = self.base / "dev"
        self.dev.mkdir()
        self.c = {"schemaVersion": 1, "approval": "fixture-authorized", "roots": [str(self.dev)],
            "excludePaths": [], "operationsRoot": str(self.dev / "operations"),
            "stateRoot": str(self.base / "state"), "registry": str(self.base / "state/registry.json"),
            "workspaceFile": str(self.base / "workspace.yaml"), "workspace": "fixture",
            "embedding": {"provider": "ollama", "model": "fixture", "endpoint": "http://127.0.0.1:11434", "dimensions": 768},
            "qdrant": {"host": "127.0.0.1", "grpcPort": 6334, "rest": "http://127.0.0.1:6333", "collection": "fixture"}}

    def tearDown(self):
        self.temp.cleanup()

    def git(self, p, *args):
        return subprocess.check_output(["git", "-C", str(p), *args], text=True, stderr=subprocess.PIPE).strip()

    def repo(self, name):
        p=self.dev/name
        p.mkdir(parents=True)
        self.git(p,"init","-q")
        (p/"source.py").write_text("def reusable():\n    return 1\n")
        self.git(p,"add","source.py")
        self.git(p,"-c","user.name=Fixture","-c","user.email=fixture@example.invalid","commit","-qm",name)
        return p

    def cli(self, *args, input=None):
        env = dict(os.environ)
        env.pop("GREPPY_MAINTENANCE_RUN", None)
        return subprocess.run([sys.executable, "-B", str(SCRIPT), *args],
                              input=input, text=True, capture_output=True,
                              cwd=self.base, env=env, timeout=10)

    def test_doctor_separates_search_from_optional_and_enabled_capabilities(self):
        repo = self.repo("doctor")
        state = Path(self.c["stateRoot"])
        state.mkdir()
        now = dt.datetime.now(dt.timezone.utc)
        entry = {"name": "doctor", "status": "active", "path": str(repo)}
        Path(self.c["registry"]).write_text(json.dumps({"projects": [entry]}))
        (state / "last-reconcile.json").write_text(json.dumps({"at": now.isoformat()}))
        meta = self.base / "index-meta/fixture"
        meta.mkdir(parents=True)
        (meta / "doctor.json").write_text(json.dumps({
            key: self.c["embedding"][key] for key in ["provider", "model", "dimensions"]
        }))
        helper = self.base / "owner/scripts/knowledge.mjs"
        helper.parent.mkdir(parents=True)
        helper.touch()
        policy = self.base / "policy.json"
        policy.write_text("{}")
        (state / "queue").mkdir()
        (state / "queue/event.json").write_text("{}")
        (repo / ".codegraph").mkdir()
        (repo / ".codegraph/index").write_text("untouched")
        receipt = state / "last-record-maintenance.json"
        grant = {"supported": True, "granted": True, "writerAuthorized": True}
        owner = {"status": "ready", "codeRecords": grant}
        service = {"ActiveState": "inactive", "Result": "success", "ExecMainStatus": "0",
                   "ExecMainStartTimestamp": f"@{int(now.timestamp()) - 2}",
                   "ExecMainExitTimestamp": f"@{int(now.timestamp())}"}
        core = {"git", "grepai", "node"}

        def command(args, **kwargs):
            if args[0] == "node":
                self.assertEqual(args[2:5], ["status", "--policy", str(policy)])
                out = json.dumps({**owner, "accountReadChecked": "--online" in args})
            elif args[:3] == ["systemctl", "--user", "is-active"]:
                out = "active"
            elif args[:4] == ["systemctl", "--user", "show", "records.timer"]:
                out = "records.service"
            elif args[:4] == ["systemctl", "--user", "show", "records.service"]:
                out = "\n".join(f"{key}={value}" for key, value in service.items())
            else:
                self.fail(f"Unexpected doctor command: {args}")
            return subprocess.CompletedProcess(args, 0, stdout=out, stderr="")

        collection_missing = False

        def http(url, method="GET"):
            self.assertEqual(method, "GET")
            if url.endswith("/api/tags"):
                return {"models": [{"name": "fixture:latest"}]}
            if collection_missing:
                raise HTTPError(url, 404, "missing", None, None)
            return {"result": {"status": "green", "config": {"params": {"vectors": {"size": 768}}}}}

        def snapshot():
            return {path: path.read_bytes() for path in self.base.rglob("*") if path.is_file()}

        def doctor():
            before = snapshot()
            result = w.doctor(self.c)
            self.assertEqual(before, snapshot())
            self.assertFalse(result["capabilities"]["search"]["usable"])
            self.assertEqual(result["sourceSamples"], [])
            self.assertEqual(result["capabilities"]["search"]["status"],
                             "attention" if collection_missing else "unverified")
            self.assertEqual(result["capabilities"]["analysis"]["graphFreshness"], "unchecked")
            return result

        with patch.object(w, "run", side_effect=command), patch.object(w, "http", side_effect=http), \
                patch.object(w.shutil, "which", side_effect=lambda name: name if name in core else None):
            result = doctor()
            self.assertEqual(result["status"], "healthy")
            self.assertEqual(result["statusScope"], ["search"])
            self.assertEqual(result["capabilities"]["analysis"]["status"], "unavailable")
            self.assertEqual(result["capabilities"]["records"]["status"], "not_configured")
            collection_missing = True
            self.assertFalse(doctor()["checks"]["qdrant"]["reachable"])
            collection_missing = False

            self.c.update(recordsCommand=["node", "records.mjs"], maintenanceTimer="records.timer",
                          knowledgeRoot=str(helper.parent.parent), codePolicy=str(policy))
            cases = [(None, "unverified", "receipt_missing"), ("broken", "unverified", "receipt_unreadable"),
                     ("{}", "unverified", "receipt_invalid")]
            for status in ("complete", "failed", "pending", "uncertain"):
                cases.append((json.dumps({"at": now.isoformat(), "status": status}),
                              "ready" if status == "complete" else status, None))
            for raw, expected, reason in cases:
                with self.subTest(raw=raw):
                    if raw is not None:
                        receipt.write_text(raw)
                    result = doctor()
                    self.assertEqual(result["statusScope"], ["search", "records"])
                    records = result["capabilities"]["records"]
                    self.assertEqual((records["status"], records.get("reason")), (expected, reason))
                    self.assertEqual(result["status"], "healthy" if expected == "ready" else "attention")

            receipt.write_text(json.dumps({"at": now.isoformat(), "status": "complete"}))
            service.update(Result="exit-code", ExecMainStatus="1")
            self.assertEqual(doctor()["capabilities"]["records"]["reason"], "maintenance_service_failed")
            service.update(Result="success", ExecMainStatus="0",
                           ExecMainStartTimestamp=f"@{int(now.timestamp()) + 1}")
            self.assertEqual(doctor()["capabilities"]["records"]["reason"], "receipt_predates_service_run")
            service["ExecMainStartTimestamp"] = f"@{int(now.timestamp()) - 2}"
            runner = self.base / "custom-codex"
            runner.touch()
            runner.chmod(0o700)
            self.c.update(codexExecutable=str(runner), agent={"enabled": True})
            core.add(str(runner))
            result = doctor()
            self.assertEqual(result["checks"]["codex"], str(runner))
            self.assertEqual(result["capabilities"]["assessment"]["status"], "unverified")
            core.remove(str(runner))
            core.add("codex")
            result = doctor()
            self.assertIsNone(result["checks"]["codex"])
            self.assertEqual(result["capabilities"]["assessment"]["reason"], "assessment_runner_missing")
            self.assertEqual(result["capabilities"]["records"]["status"], "ready")
            grant["granted"] = False
            self.assertEqual(doctor()["capabilities"]["records"]["reason"], "missing_grant")
            del owner["codeRecords"]
            self.assertEqual(doctor()["capabilities"]["records"]["reason"], "owner_incompatible")

    def test_watcher_process_enumeration_fails_closed(self):
        with patch.object(w, "run", return_value=subprocess.CompletedProcess([], 1, stdout="", stderr="")):
            self.assertFalse(w.competing_writers(self.c, []))
        with patch.object(w, "run", return_value=subprocess.CompletedProcess([], 2, stdout="", stderr="error")):
            with self.assertRaisesRegex(RuntimeError, "Cannot establish existing watcher ownership"):
                w.competing_writers(self.c, [])

    def test_competing_workspace_watcher_blocks_changes_and_restoration(self):
        root = self.repo("project")
        with patch.object(w, "competing_writers", return_value=False), patch.object(w, "purge_excluded", return_value=0):
            w.reconcile(self.c, "fixture", True)
        self.c.update(watchService="watch.fixture.service", pruneNames=["new-exclusion"])
        actual_run = w.run
        actual_resolve = Path.resolve
        command = ""
        calls = []

        def resolve(path, *args, **kwargs):
            if str(path) == "/proc/123/exe": return Path("/usr/bin/grepai")
            if str(path) == "/proc/123/cwd": return self.base / "operations"
            return actual_resolve(path, *args, **kwargs)

        def control(args, **kwargs):
            if args[0] == "pgrep":
                return subprocess.CompletedProcess(args, 0, stdout="123 grepai watch " + command + "\n", stderr="")
            if args[0] == "systemctl":
                calls.append(args[2])
                return subprocess.CompletedProcess(args, 3, stdout="", stderr="")
            return actual_run(args, **kwargs)

        workspace = Path(self.c["workspaceFile"])
        config = root / ".grepai/config.yaml"
        before = (workspace.read_bytes(), config.read_bytes())
        with patch.object(Path, "resolve", resolve), patch.object(w, "run", side_effect=control), \
                patch.object(w, "purge_excluded") as purge:
            for command in ["--workspace fixture", "--workspace=fixture"]:
                with self.subTest(command=command), self.assertRaisesRegex(RuntimeError, "unmanaged grepai watcher"):
                    w.reconcile(self.c, "fixture", True)
                self.assertEqual((workspace.read_bytes(), config.read_bytes()), before)
                purge.assert_not_called()
            for command in ["--workspace", "--workspace=", "--workspace --no-ui", "--workspace fixture --workspace=other"]:
                with self.subTest(command=command), self.assertRaisesRegex(RuntimeError, "Cannot establish"):
                    w.competing_writers(self.c, [{"path": str(root)}])
            data = yaml.safe_load(workspace.read_text())
            data["workspaces"]["other"] = {"projects": [{"path": str(root)}]}
            workspace.write_text(yaml.safe_dump(data))
            command = "--workspace=other"
            self.assertTrue(w.competing_writers(self.c, [{"path": str(root)}]))
            workspace.write_bytes(before[0])
            self.c["pruneNames"] = []
            scope = {"workspace": self.c["workspace"], "backend": self.c["qdrant"],
                     "service": self.c["watchService"], "configDigest": w.digest(self.c)}
            pending = Path(self.c["stateRoot"]) / "reconcile-pending.json"
            for command in ["--workspace fixture", "--workspace=fixture"]:
                w.atomic(pending, {"scope": scope, "restoreWatcher": True, "retired": [], "purgeExcluded": False})
                with self.subTest(command=command), self.assertRaisesRegex(RuntimeError, "Cannot restore"):
                    w.reconcile(self.c, "fixture", True)
                self.assertTrue(pending.exists())
            self.assertNotIn("start", calls)

    def test_failed_purge_and_restart_resume_from_recovery_receipt(self):
        self.repo("project")
        with patch.object(w, "competing_writers", return_value=False), \
                patch.object(w, "purge_excluded", return_value=0):
            w.reconcile(self.c, "fixture", True)
        self.c.update(watchService="watch.fixture.service", pruneNames=["new-exclusion"])
        recovery = Path(self.c["stateRoot"]) / "reconcile-pending.json"
        actual_run = w.run
        active = True
        restart_fails = True
        calls = []

        def control(args, **kwargs):
            nonlocal active
            if args[0] != "systemctl":
                return actual_run(args, **kwargs)
            action = args[2]
            calls.append(action)
            if action == "stop":
                self.assertTrue(w.read(recovery)["restoreWatcher"])
                active = False
            if action == "start":
                self.assertFalse(w.read(recovery)["purgeExcluded"])
                if restart_fails:
                    raise RuntimeError("restart failed")
                active = True
            return subprocess.CompletedProcess(args, 0 if active else 3, stdout="", stderr="")

        with patch.object(w, "run", side_effect=control), \
                patch.object(w, "competing_writers", return_value=False), \
                patch.object(w, "purge_excluded", side_effect=[RuntimeError("purge failed"), 1]) as purge:
            with self.assertRaisesRegex(RuntimeError, "purge failed"):
                w.reconcile(self.c, "fixture", True)
            self.assertFalse(active)
            self.assertTrue(w.read(recovery)["purgeExcluded"])
            with self.assertRaisesRegex(ValueError, "scope changed"):
                w.reconcile({**self.c, "pruneNames": []}, "fixture", True)
            with self.assertRaisesRegex(RuntimeError, "restart failed"):
                w.reconcile(self.c, "fixture", True)
            self.assertEqual(purge.call_count, 2)
            self.assertTrue(recovery.is_file())
            restart_fails = False
            result = w.reconcile(self.c, "fixture", True)
            self.assertEqual(purge.call_count, 2)
        self.assertTrue(active)
        self.assertEqual(calls.count("stop"), 1)
        self.assertEqual(result["status"], "reconciled")
        self.assertEqual(result["configChanges"], 0)
        self.assertTrue(result["watcherRestarted"])
        self.assertFalse(recovery.exists())

    def test_nested_explicit_exclusions_share_literal_ignore_and_purge_scope(self):
        root = self.repo("parent")
        excluded = root / "private-1"
        operations = root / "operations"
        state = root / "state"
        self.c.update(excludePaths=[str(excluded)], operationsRoot=str(operations), stateRoot=str(state))
        ignored = w.project_ignores(root, [root], excluded=w.explicit_exclusions(self.c))
        self.assertIn(r"/private-1", ignored)
        self.assertIn("/operations", ignored)
        self.assertIn("/state", ignored)
        entry = {"name": "parent", "path": str(root)}
        candidates = ["fixture/parent/private-1/file.py", "fixture/parent/private1/file.py",
                      "fixture/parent/operations/notes.py", "fixture/parent/operations2/file.py",
                      "fixture/parent/state/state.py", "other/parent/private-1/file.py"]
        selected = []
        def purge(_, predicate):
            selected.extend(file for file in candidates if predicate(file))
            return len(selected)
        with patch.object(w, "purge_matching", side_effect=purge):
            w.purge_excluded(self.c, [entry])
        self.assertEqual(selected, [candidates[i] for i in (0, 2, 4)])

    def test_excluded_symlinks_do_not_require_literal_rules(self):
        root = self.repo("parent")
        excluded = root / "private"
        excluded.mkdir()
        self.c["excludePaths"] = [str(excluded)]
        with patch.object(w, "competing_writers", return_value=False), patch.object(w, "purge_excluded", return_value=0):
            w.reconcile(self.c, "fixture", True)
            (excluded / "link (1)").symlink_to(root / "source.py")
            result = w.reconcile(self.c, "fixture", True)
            self.assertEqual(result["status"], "reconciled")
            (excluded / ".grepaiignore").write_text("!source.py\n")
            with self.assertRaisesRegex(ValueError, "negation"):
                w.reconcile(self.c, "fixture", True)
            (excluded / ".grepaiignore").unlink()
            (root / "link (1)").symlink_to(root / "source.py")
            with self.assertRaisesRegex(ValueError, "unsupported by the qualified matcher"):
                w.reconcile(self.c, "fixture", True)

    def test_unsafe_literal_ignore_is_rejected_before_mutation(self):
        root = self.repo("parent")
        self.c["excludePaths"] = [str(root / "private(1)")]
        with self.assertRaisesRegex(ValueError, "unsupported by the qualified matcher"):
            w.reconcile(self.c, "fixture", True)
        self.assertFalse(Path(self.c["workspaceFile"]).exists())
        self.assertFalse((root / ".grepai/config.yaml").exists())

    def test_discovery_prunes_excluded_children_before_opening(self):
        root = self.repo("project")
        excluded = self.dev / "blocked"
        excluded.mkdir()
        self.c["excludePaths"] = [str(excluded)]
        actual = os.scandir
        def scan(path):
            if Path(path) == excluded:
                raise PermissionError("blocked")
            return actual(path)
        with patch.object(w.os, "scandir", side_effect=scan):
            self.assertIn(str(root), [x["path"] for x in w.discover(self.c)["projects"]])
            self.c["excludePaths"] = []
            with self.assertRaises(PermissionError):
                w.discover(self.c)

    def test_recovery_journals_membership_across_rename(self):
        self.repo("existing")
        with patch.object(w, "competing_writers", return_value=False), patch.object(w, "purge_excluded", return_value=0):
            w.reconcile(self.c, "fixture", True)
        newcomer = self.repo("newcomer")
        self.c["watchService"] = "watch.fixture.service"
        active = True
        actual_run = w.run
        def control(args, **kwargs):
            nonlocal active
            if args[0] != "systemctl":
                return actual_run(args, **kwargs)
            if args[2] == "stop": active = False
            if args[2] == "start": active = True
            return subprocess.CompletedProcess(args, 0 if active else 3, stdout="", stderr="")
        with patch.object(w, "run", side_effect=control), patch.object(w, "competing_writers", return_value=False), \
                patch.object(w, "purge_retired", return_value=0), \
                patch.object(w, "purge_excluded", side_effect=[RuntimeError("failed"), 0]) as purge:
            with self.assertRaisesRegex(RuntimeError, "failed"):
                w.reconcile(self.c, "fixture", True)
            newcomer.rename(self.dev / "renamed")
            result = w.reconcile(self.c, "fixture", True)
        self.assertEqual(purge.call_count, 2)
        self.assertTrue(active)
        self.assertTrue(result["watcherRestarted"])
        self.assertFalse((Path(self.c["stateRoot"]) / "reconcile-pending.json").exists())

    def test_recovery_does_not_adopt_unowned_workspace_entries(self):
        self.repo("existing")
        with patch.object(w, "competing_writers", return_value=False), patch.object(w, "purge_excluded", return_value=0):
            w.reconcile(self.c, "fixture", True)
        workspace = Path(self.c["workspaceFile"])
        data = yaml.safe_load(workspace.read_text())
        data["workspaces"]["fixture"]["projects"].append({"name": "foreign", "path": str(self.dev / "foreign")})
        workspace.write_text(yaml.safe_dump(data))
        scope = {"workspace": self.c["workspace"], "backend": self.c["qdrant"], "service": None,
                 "configDigest": w.digest(self.c)}
        w.atomic(Path(self.c["stateRoot"]) / "reconcile-pending.json", {
            "scope": scope, "membership": w.read(self.c["registry"])["projects"]})
        with self.assertRaisesRegex(ValueError, "unowned entries"):
            w.reconcile(self.c, "fixture", True)

    def test_discovery_handles_alias_cycles_and_rejects_partial_scan(self):
        root = self.repo("project")
        (root / "self").symlink_to(root, target_is_directory=True)
        old = w.discover(self.c)
        self.assertEqual(len(old["projects"]), 1)
        self.assertEqual(len(old["aliases"]), 1)
        w.atomic(self.c["registry"], old)
        baseline = Path(self.c["registry"]).read_bytes()

        def broken_walk(*args, onerror, **kwargs):
            onerror(PermissionError("inaccessible directory"))
            yield

        with patch.object(w.os, "walk", side_effect=broken_walk), \
                patch.object(w, "purge_retired") as purge:
            with self.assertRaisesRegex(PermissionError, "inaccessible"):
                w.reconcile(self.c, "fixture", True)
            purge.assert_not_called()
        with patch.object(w, "git", return_value=""), patch.object(w, "purge_retired") as purge:
            with self.assertRaisesRegex(RuntimeError, "registered Git root"):
                w.reconcile(self.c, "fixture", True)
            purge.assert_not_called()
        self.assertEqual(Path(self.c["registry"]).read_bytes(), baseline)

    def test_current_invocation_warning_is_visible_despite_progress_output(self):
        invocation = 'a' * 32
        message = 'Embedding [progress] (6/10)\r2026/10/28 Warning: vue compiler unavailable: missing compiler\n'
        result = subprocess.CompletedProcess([], 0, stdout=message, stderr='')
        with patch.object(w, 'run', return_value=result) as command:
            events = w.watcher_events(invocation)
        self.assertTrue(events['verified'])
        self.assertEqual(events['eventCountInReturnedMessages'], 1)
        self.assertIn('vue compiler unavailable', events['events'][0])
        self.assertIn('_SYSTEMD_INVOCATION_ID=' + invocation, command.call_args.args[0])
        self.assertIn('--all', command.call_args.args[0])

    def test_absent_warnings_and_unreadable_journal_are_distinct(self):
        with patch.object(w, 'run') as command:
            self.assertFalse(w.watcher_events('')['verified'])
            command.assert_not_called()
        with patch.object(w, 'run', return_value=subprocess.CompletedProcess([], 1, stdout='-- No entries --', stderr='')):
            result = w.watcher_events('b' * 32)
            self.assertTrue(result['verified'])
            self.assertEqual(result['events'], [])
        with patch.object(w, 'run', return_value=subprocess.CompletedProcess([], 1, stdout='', stderr='Permission denied')):
            self.assertFalse(w.watcher_events('b' * 32)['verified'])

    def test_remote_provenance_is_sanitized_and_branch_is_current(self):
        self.assertEqual(w.sanitized_remote("https://user:secret@example.invalid/org/repo.git?secret#secret"), "https://example.invalid/org/repo.git")
        self.assertEqual(w.sanitized_remote("git@example.invalid:org/repo.git"), "ssh://example.invalid/org/repo.git")
        for value in ["file:///private/repo", "/private/repo", "ext::helper", r"C:\private\repo", "bad value"]:
            self.assertIsNone(w.sanitized_remote(value))
        repo = self.repo("provenance")
        self.git(repo, "remote", "add", "origin", "https://user:secret@example.invalid/org/repo.git?secret")
        self.git(repo, "checkout", "-qb", "test-branch")
        entry = w.discover(self.c)["projects"][0]
        self.assertEqual(entry["remote"], "https://example.invalid/org/repo.git")
        self.assertEqual(entry["branch"], "test-branch")
        self.assertNotIn("secret", json.dumps(entry))

    def test_grepai_rfc3339_timestamp_survives_reconcile_and_legacy_space_is_repaired(self):
        valid = "2026-10-28T15:42:49.468570Z"
        current = w.load_yaml("watch:\n  last_index_time: " + valid + "\n")
        self.assertEqual(current["watch"]["last_index_time"], valid)
        w.repair_legacy_timestamp(current)
        self.assertEqual(w.load_yaml(yaml.safe_dump(current)), current)
        legacy = w.load_yaml("watch:\n  last_index_time: 2026-10-28 15:42:49.468570+00:00\n")
        w.repair_legacy_timestamp(legacy)
        self.assertEqual(legacy["watch"]["last_index_time"], "2026-10-28T15:42:49.468570+00:00")
        once = yaml.safe_dump(legacy)
        reloaded = w.load_yaml(once)
        w.repair_legacy_timestamp(reloaded)
        self.assertEqual(yaml.safe_dump(reloaded), once)

    def test_file_path_index_is_explicit_idempotent_and_does_not_replace_other_types(self):
        self.c["qdrant"]["filePathIndex"] = True
        with patch.object(w, "http", return_value={"result": {"payload_schema": {"file_path": {"data_type": "keyword"}}}}) as request:
            self.assertEqual(w.ensure_file_path_index(self.c), "present")
            self.assertEqual(request.call_count, 1)
        with patch.object(w, "http", return_value={"result": {"payload_schema": {"file_path": {"data_type": "text"}}}}) as request:
            with self.assertRaises(ValueError): w.ensure_file_path_index(self.c)
            self.assertEqual(request.call_count, 1)
        with patch.object(w, "http", side_effect=[{"result": {"payload_schema": {}}}, {"status": "ok"}]) as request:
            self.assertEqual(w.ensure_file_path_index(self.c), "created")
            self.assertEqual(request.call_args.args[1:], ("PUT", {"field_name": "file_path", "field_schema": "keyword"}))

    def test_custom_extensions_preserve_existing_scope_and_repeat_without_changes(self):
        root = self.repo("extensions")
        folder = root / ".grepai"
        folder.mkdir()
        (folder / "config.yaml").write_text("version: 1\nchunking:\n  custom_extensions: [.tengo]\n")
        self.c["customExtensions"] = [".MJS", ".nix", ".mjs"]
        path = self.base / "config.json"
        path.write_text(json.dumps(self.c))
        config = w.load_config(path)
        self.assertEqual(config["customExtensions"], [".mjs", ".nix"])
        with patch.object(w, "competing_writers", return_value=False), patch.object(w, "purge_excluded", return_value=0):
            w.reconcile(config, str(path), True)
            repeat = w.reconcile(config, str(path), True)
        actual = w.load_yaml((folder / "config.yaml").read_text())
        self.assertEqual(actual["chunking"]["custom_extensions"], [".mjs", ".nix", ".tengo"])
        self.assertEqual(repeat["configChanges"], 0)
        self.c["customExtensions"] = ["../private"]
        path.write_text(json.dumps(self.c))
        with self.assertRaises(ValueError): w.load_config(path)

    def test_vue_processing_choice_is_explicit_preserves_other_frameworks_and_is_idempotent(self):
        root = self.repo('vue-mode')
        folder = root / '.grepai'
        folder.mkdir()
        (folder / 'config.yaml').write_text('version: 1\nframework_processing:\n  mode: auto\n  frameworks:\n    vue:\n      enabled: true\n    astro:\n      enabled: false\n')
        path = self.base / 'config.json'
        self.c['vueProcessing'] = False
        path.write_text(json.dumps(self.c))
        config = w.load_config(path)
        with patch.object(w, 'competing_writers', return_value=False), patch.object(w, 'purge_excluded', return_value=0):
            w.reconcile(config, str(path), True)
            repeat = w.reconcile(config, str(path), True)
        actual = w.load_yaml((folder / 'config.yaml').read_text())['framework_processing']
        self.assertFalse(actual['frameworks']['vue']['enabled'])
        self.assertFalse(actual['frameworks']['astro']['enabled'])
        self.assertEqual(actual['mode'], 'auto')
        self.assertEqual(repeat['configChanges'], 0)
        self.c['vueProcessing'] = 'false'
        path.write_text(json.dumps(self.c))
        with self.assertRaises(ValueError): w.load_config(path)

    def test_actual_roots_aliases_nested_duplicates_and_worktree(self):
        a=self.repo("one/shared")
        b=self.repo("two/shared")
        nested=self.repo("one/shared/nested")
        self.repo("operations/fixture")
        (self.dev/"alias").symlink_to(a, target_is_directory=True)
        self.git(a,"worktree","add","-qb","fixture-linked",str(self.dev/"linked"))
        d=w.discover(self.c)
        active=[x for x in d["projects"] if x["status"]=="active"]
        self.assertEqual(len(active),3)
        self.assertEqual(len({x["name"] for x in active}),3)
        self.assertTrue(any(x["kind"]=="worktree" and x["status"]=="excluded" for x in d["projects"]))
        self.assertIn("/nested/",w.project_ignores(a,[a,b,nested]))
        self.assertEqual(len(d["aliases"]),1)

    def test_gitfile_submodule_is_separate_root(self):
        parent=self.repo("parent")
        source=self.repo("library")
        self.git(parent,"-c","protocol.file.allow=always","submodule","add","-q",str(source),"module")
        d=w.discover(self.c)
        item=next(x for x in d["projects"] if x["path"]==str(parent/"module"))
        self.assertTrue((parent/"module/.git").is_file())
        self.assertEqual(item["kind"],"submodule")

    def test_move_keeps_identity_and_removal_retires(self):
        p=self.repo("original")
        old=w.discover(self.c)
        moved=self.dev/"renamed"
        p.rename(moved)
        new=w.discover(self.c,old)
        self.assertEqual(len(new["projects"]),1)
        self.assertEqual(old["projects"][0]["id"],new["projects"][0]["id"])
        moved.rename(self.base/"outside")
        retired=w.discover(self.c,new)
        self.assertEqual(retired["projects"][0]["status"],"retired")
        self.c["roots"]=[str(self.base/"offline")]
        with self.assertRaises(ValueError): w.discover(self.c,new)

    def test_reconcile_idempotent_and_preserves_other_workspace_and_source(self):
        p=self.repo("root")
        (p/".gitignore").write_text("user-pattern\n")
        original=(p/".gitignore").read_bytes()
        Path(self.c["workspaceFile"]).write_text(yaml.safe_dump({"version":1,"workspaces":{"unrelated":{"name":"unrelated"}}}))
        with patch.object(w,"competing_writers",return_value=False), patch.object(w,"purge_excluded",return_value=0):
            first=w.reconcile(self.c,"unused",True)
            config=p/".grepai/config.yaml"
            before=config.stat().st_mtime_ns
            second=w.reconcile(self.c,"unused",True)
        self.assertEqual(first["configChanges"],1)
        self.assertEqual(second["configChanges"],0)
        self.assertFalse(second["membershipChanged"])
        self.assertEqual(before,config.stat().st_mtime_ns)
        self.assertIn("unrelated",yaml.safe_load(Path(self.c["workspaceFile"]).read_text())["workspaces"])
        self.assertEqual(original,(p/".gitignore").read_bytes())
        self.assertIn(".grepai/",(p/".git/info/exclude").read_text())

    def test_existing_links_excluded_and_negation_fails_before_mutation(self):
        p=self.repo("root")
        outside=self.base/"private.ts"
        outside.write_text("fixture secret marker")
        (p/"linked.ts").symlink_to(outside)
        self.assertIn("/linked.ts",w.project_ignores(p,[p]))
        (p/".grepaiignore").write_text("!.env.ts\n")
        with self.assertRaises(ValueError): w.reconcile(self.c,"unused",True)
        self.assertFalse(Path(self.c["workspaceFile"]).exists())

    def test_retirement_purge_is_exact_and_paged(self):
        calls=[]
        def http(url,method="GET",body=None):
            calls.append((url,body))
            if "/scroll" in url:
                if body.get("offset") is None:
                    return {"result":{"points":[{"id":1,"payload":{"file_path":"fixture/old/a.ts"}},{"id":2,"payload":{"file_path":"fixture/older/b.ts"}}],"next_page_offset":"page2"}}
                return {"result":{"points":[{"id":3,"payload":{"file_path":"other/old/a.ts"}}],"next_page_offset":None}}
            return {"result":{}}
        with patch.object(w,"http",side_effect=http): self.assertEqual(w.purge_retired(self.c,["old"]),1)
        self.assertEqual(calls[-1][1],{"points":[1]})

    def test_ignored_worktree_container_does_not_add_per_worktree_rules(self):
        root=self.repo("root")
        extra=[".task-worktrees"]
        first=w.project_ignores(root,[root,root/".task-worktrees/one"],extra)
        second=w.project_ignores(root,[root,root/".task-worktrees/one",root/".task-worktrees/two"],extra)
        self.assertEqual(first,second)
        self.assertIn(".task-worktrees",second)
        self.assertNotIn("/src/worktrees/",second)

    def test_remote_grpc_and_symlinked_managed_config_are_rejected(self):
        config=self.base/"config.json"
        self.c["qdrant"]["host"]="outside.example.invalid"
        config.write_text(json.dumps(self.c))
        with self.assertRaises(ValueError): w.load_config(config)
        self.c["qdrant"]["host"]="127.0.0.1"
        target=self.base/"external-config"
        target.write_text("not read by the loader")
        Path(self.c["workspaceFile"]).symlink_to(target)
        config.write_text(json.dumps(self.c))
        with self.assertRaises(ValueError): w.load_config(config)

    def test_setup_preview_creates_no_state_or_project_configuration(self):
        root=self.repo("root")
        config=self.base/"config.json"
        config.write_text(json.dumps(self.c))
        result=subprocess.check_output([sys.executable,str(SCRIPT),"setup","--config",str(config)],text=True)
        self.assertEqual(json.loads(result)["status"],"planned")
        self.assertFalse(Path(self.c["stateRoot"]).exists())
        self.assertFalse((root/".grepai").exists())

    def test_hard_exclusion_purge_is_namespace_bounded(self):
        root=self.repo("root")
        names=[{"name":"root-id", "path":str(root)}]
        captured=[]
        def purger(config,predicate):
            for file in ["fixture/root-id/.repos/vendor/example.ts", "fixture/root-id/.env.ts", "fixture/root-id/source.py", "other/root-id/.env.ts", "fixture/other/.env.ts"]:
                if predicate(file):captured.append(file)
            return len(captured)
        with patch.object(w,"purge_matching",side_effect=purger):
            self.assertEqual(w.purge_excluded(self.c,names),2)
        self.assertEqual(captured,["fixture/root-id/.repos/vendor/example.ts","fixture/root-id/.env.ts"])

    def test_exclusion_nesting_preserves_project_and_path_boundaries(self):
        root=self.repo("root")
        child=self.repo("root/child")
        peer=self.repo("root-peer")
        entries=[{"name":"root-id","path":str(root)}, {"name":"child-id","path":str(child)}, {"name":"peer-id","path":str(peer)}]
        expected={"fixture/root-id/child/source.py":True,
                  "fixture/root-id/childish/source.py":False,
                  "fixture/child-id/source.py":False,
                  "fixture/peer-id/source.py":False,
                  "fixture/root-id/source.py":False,
                  "fixture/root-id/../.env":False,
                  "other/root-id/.env":False}
        def purger(config,predicate):
            actual={key:predicate(key) for key in expected}
            self.assertEqual(actual,expected)
            return sum(actual.values())
        with patch.object(w,"purge_matching",side_effect=purger):
            self.assertEqual(w.purge_excluded(self.c,entries),1)

    def test_exclusion_preserves_glob_metacharacters_and_case(self):
        root=self.repo("root")
        self.c["pruneNames"]=["Cache[0-9]","*.generated","scratch?","odd[","new\nline"]
        expected={"Cache7/file.py":True,"Cache12/file.py":False,
                  "module.generated/source.py":True,"scratch1/file.py":True,
                  "scratch12/file.py":False,"odd[/file.py":True,
                  "oddx/file.py":False,"new\nline/file.py":True,
                  "vendor/file.py":True,"Vendor/file.py":True,"source.py":False}
        def purger(config,predicate):
            actual={path:predicate("fixture/root-id/"+path) for path in expected}
            self.assertEqual(actual,expected)
            return sum(actual.values())
        with patch.object(w,"purge_matching",side_effect=purger):
            self.assertEqual(w.purge_excluded(self.c,[{"name":"root-id","path":str(root)}]),sum(expected.values()))

    def test_exclusion_rechecks_leaf_and_parent_symlinks(self):
        root=self.repo("root")
        outside=self.base/"outside.py";outside.write_text("private fixture")
        leaf=root/"live.py";leaf.write_text("original fixture")
        def purger(config,predicate):
            key="fixture/root-id/live.py"
            self.assertFalse(predicate(key))
            leaf.unlink();leaf.symlink_to(outside)
            self.assertTrue(predicate(key))
            leaf.unlink();leaf.write_text("regular again")
            self.assertFalse(predicate(key))
            (root/"linked").symlink_to(self.base,target_is_directory=True)
            self.assertTrue(predicate("fixture/root-id/linked/outside.py"))
            return 2
        with patch.object(w,"purge_matching",side_effect=purger):
            self.assertEqual(w.purge_excluded(self.c,[{"name":"root-id","path":str(root)}]),2)

    def test_notify_minimizes_data_coalesces_and_suppresses_recursion(self):
        p=self.repo("root")
        w.atomic(self.c["registry"],w.discover(self.c))
        event={"type":"agent-turn-complete","cwd":str(p),"input-messages":["must never persist"],"last-assistant-message":"private"}
        self.assertEqual(w.notify(self.c,event)["status"],"queued")
        w.notify(self.c,event)
        queue=list((Path(self.c["stateRoot"])/"queue").glob("*.json"))
        self.assertEqual(len(queue),1)
        self.assertEqual(set(json.loads(queue[0].read_text())),{"repoId","at","trigger"})
        with patch.dict(os.environ,{"GREPPY_MAINTENANCE_RUN":"1"}): self.assertEqual(w.notify(self.c,event)["status"],"ignored")
        event["cwd"]=self.c["operationsRoot"]
        self.assertEqual(w.notify(self.c,event)["status"],"ignored")

    def test_hook_coalesces_every_stop_without_persisting_payload(self):
        root = self.repo("root")
        w.atomic(self.c["registry"], w.discover(self.c))
        event = {"hook_event_name": "Stop", "cwd": str(root),
                 "session_id": "fixture-session-private",
                 "transcript_path": str(self.base / "private-transcript.jsonl"),
                 "last_assistant_message": "must never persist"}
        timestamps = ["2026-01-01T00:00:00+00:00", "2026-01-01T00:01:00+00:00"]
        with patch.object(w, "stamp", side_effect=timestamps), \
                patch.object(w, "run", side_effect=AssertionError("No subprocess in hook")), \
                patch.object(w, "http", side_effect=AssertionError("No HTTP in hook")):
            for active in (False, True):
                event["stop_hook_active"] = active
                self.assertEqual(w.hook(self.c, event)["status"], "queued")
        queue = list((Path(self.c["stateRoot"]) / "queue").glob("*.json"))
        self.assertEqual(len(queue), 1)
        receipt = json.loads(queue[0].read_text())
        self.assertEqual(set(receipt), {"repoId", "at", "trigger"})
        self.assertEqual(receipt["at"], timestamps[-1])
        self.assertEqual(receipt["trigger"], "agent-turn-complete")
        self.assertEqual(w.read(Path(self.c["stateRoot"]) / "last-notify.json"), receipt)

    def test_hook_preserves_scope_and_maintenance_filters(self):
        root = self.repo("root")
        w.atomic(self.c["registry"], w.discover(self.c))
        events = [
            {"hook_event_name": "SessionStart", "cwd": str(root)},
            {"hook_event_name": "Stop", "cwd": self.c["operationsRoot"]},
            {"hook_event_name": "Stop", "cwd": str(self.base / "outside")},
        ]
        for event in events:
            with self.subTest(event=event):
                self.assertEqual(w.hook(self.c, event)["status"], "ignored")
        with patch.dict(os.environ, {"GREPPY_MAINTENANCE_RUN": "1"}):
            self.assertEqual(w.hook(self.c, {"hook_event_name": "Stop", "cwd": str(root)})["status"], "ignored")
        self.assertFalse((Path(self.c["stateRoot"]) / "queue").exists())
        self.assertFalse((Path(self.c["stateRoot"]) / "last-notify.json").exists())

    def test_hook_rejects_invalid_payload_without_queue_writes(self):
        invalid = [None, [], "Stop", {"hook_event_name": "Stop"}]
        invalid.extend({"hook_event_name": "Stop", "cwd": cwd}
                       for cwd in (None, "", "relative/repo", 7))
        for event in invalid:
            with self.subTest(event=event), self.assertRaises(ValueError):
                w.hook(self.c, event)
        self.assertFalse(Path(self.c["stateRoot"]).exists())

    def test_cli_preserves_notify_transports_and_hook_has_quiet_stdin_success(self):
        root = self.repo("root")
        w.atomic(self.c["registry"], w.discover(self.c))
        config = self.base / "workspace.json"
        w.atomic(config, self.c)
        legacy = json.dumps({"type": "agent-turn-complete", "cwd": str(root)})
        for args, input_text in [((legacy,), None), ((), legacy)]:
            with self.subTest(transport="argv" if args else "stdin"):
                result = self.cli("notify", "--config", str(config), *args, input=input_text)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(json.loads(result.stdout)["status"], "queued")
        event = json.dumps({"hook_event_name": "Stop", "cwd": str(root), "stop_hook_active": True})
        result = self.cli("hook", "--config", str(config), input=event)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "")
        queue = list((Path(self.c["stateRoot"]) / "queue").glob("*.json"))
        self.assertEqual(len(queue), 1)
        self.assertEqual(set(json.loads(queue[0].read_text())), {"repoId", "at", "trigger"})

    def test_cli_hook_failures_never_request_continuation(self):
        config = self.base / "workspace.json"
        w.atomic(config, self.c)
        event = json.dumps({"hook_event_name": "Stop", "cwd": str(self.dev)})
        cases = [
            (("hook",), event),
            (("hook", "--config"), event),
            (("hook", "--config", str(config), "--unknown"), event),
            (("--config", str(config), "hook", "--unknown"), event),
            (("hook", "--config", str(config), event), ""),
            (("hook", "--config", str(config), "--apply"), event),
            (("hook", "--config", str(config), "--discovery-only"), event),
            (("hook", "--config", str(config), "--migrate-from", str(config)), event),
            (("hook", "--config", str(config)), "not-json"),
            (("hook", "--config", str(config)), "[]"),
            (("hook", "--config", str(config)), '{"hook_event_name":"Stop"}'),
        ]
        for args, input_text in cases:
            with self.subTest(args=args, input=input_text):
                result = self.cli(*args, input=input_text)
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertEqual(result.stdout, "")
                self.assertTrue(result.stderr)
        self.assertFalse((Path(self.c["stateRoot"]) / "queue").exists())
        self.assertEqual(self.cli("notify").returncode, 2)




    def test_migration_refuses_stale_baseline_and_same_collection(self):
        import copy
        previous = copy.deepcopy(self.c)
        target = copy.deepcopy(self.c)
        target['embedding'].update(model='another', dimensions=1024)
        ws = w.workspace_settings(previous)
        with self.assertRaisesRegex(ValueError, 'exact --migrate-from'):
            w.migration_plan(target, ws, None)
        with self.assertRaisesRegex(ValueError, 'different collection'):
            w.migration_plan(target, ws, previous)
        target['qdrant']['collection'] = 'new_vectors'
        plan = w.migration_plan(target, ws, previous)
        self.assertTrue(plan['oldCollectionPreserved'])
        self.assertEqual(plan['fromCollection'], 'fixture')
        self.assertIsNone(w.migration_plan(target, w.workspace_settings(target), previous))
        ws['embedder']['model'] = 'concurrent_change'
        with self.assertRaisesRegex(ValueError, 'exact --migrate-from'):
            w.migration_plan(target, ws, previous)

    def test_migration_never_adopts_an_unknown_nonempty_collection(self):
        for size, count in [(768, 0), (1024, 12)]:
            self.c['embedding']['dimensions'] = 1024
            with patch.object(w, 'http', return_value={'result': {'points_count': count, 'config': {'params': {'vectors': {'size': size}}}}}):
                with self.assertRaises(ValueError):
                    w.verify_migration_target(self.c)

    def test_model_digest_gate_rejects_another_tag(self):
        self.c['embeddingModelDigest'] = 'expected'
        self.c['embedding']['model'] = 'fixture:pinned'
        with patch.object(w, 'http', return_value={'models': [{'name': 'fixture:latest', 'digest': 'expected'}]}):
            with self.assertRaises(ValueError):
                w.verify_model_identity(self.c)

if __name__=="__main__": unittest.main()
