"""Private workspace opt-in, exact Git identity and persistent bank mapping."""

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile
from urllib.parse import urlsplit

import project_scope

IDENTIFIER = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}")


class RepositoryIneligible(ValueError):
    """The accepted workspace scope does not currently include this repository."""


def absolute(value):
    if not isinstance(value, str) or not Path(value).is_absolute():
        raise ValueError("absolute workspace path required")
    path = Path(value)
    if any(item.is_symlink() for item in [path, *path.parents]):
        raise ValueError("symlink workspace path")
    return str(path.resolve())


def load(path):
    policy = json.loads(project_scope.private_read(Path(path).expanduser()))
    if (policy.get("schemaVersion") != 1 or policy.get("kind") != "hindsight-workspace"
            or type(policy.get("enabled")) is not bool):
        raise ValueError("workspace policy schema")
    if not policy["enabled"]:
        return policy  # An off switch must work without installed routes or roots.
    for name in ("stateRoot", "runtimeEnv", "privatePolicyFile"):
        policy[name] = absolute(policy[name])
    for name in ("roots", "exclude"):
        values = policy.get(name, [])
        if not isinstance(values, list) or len(values) > 512:
            raise ValueError("workspace root bound")
        policy[name] = [absolute(value) for value in values]
    if not policy["roots"] or any(not Path(root).is_dir() for root in policy["roots"]):
        raise ValueError("missing accepted workspace root")
    if any(Path(policy["stateRoot"]).is_relative_to(Path(root)) for root in policy["roots"]):
        raise ValueError("memory state must be outside source roots")
    sessions = policy.get("sessionsRoots", {})
    if not isinstance(sessions, dict) or not sessions or set(sessions) - {"codex", "pi"}:
        raise ValueError("session sources")
    for source, values in sessions.items():
        if not isinstance(values, list) or not values or len(values) > 16:
            raise ValueError("session roots")
        sessions[source] = [absolute(value) for value in values]
    for name in ("worktrees", "repositories"):
        values = policy.get(name, {})
        if not isinstance(values, dict) or len(values) > 512:
            raise ValueError("repository map")
        policy[name] = {absolute(root): value for root, value in values.items()}
    policy["worktrees"] = {root: absolute(target) for root, target in policy["worktrees"].items()}
    for item in policy["repositories"].values():
        if not isinstance(item, dict) or set(item) - {"enabled", "repoId", "bankId"}:
            raise ValueError("repository override")
        if "enabled" in item and type(item["enabled"]) is not bool:
            raise ValueError("repository opt-out")
        for name in ("repoId", "bankId"):
            if name in item and (not isinstance(item[name], str) or not IDENTIFIER.fullmatch(item[name])):
                raise ValueError("repository identity")
    for name in ("bankPrefix", "container"):
        if not isinstance(policy.get(name), str) or not IDENTIFIER.fullmatch(policy[name]):
            raise ValueError("workspace identifier")
    if len(policy["bankPrefix"]) > 48:
        raise ValueError("bank prefix bound")
    url = urlsplit(policy["endpoint"])
    if (url.scheme != "http" or url.hostname not in {"127.0.0.1", "localhost", "::1"}
            or not url.port or url.username or url.password or url.query or url.fragment or url.path not in ("", "/")):
        raise ValueError("local workspace API endpoint")
    if not re.fullmatch(r"ghcr.io/vectorize-io/hindsight:1\.2\.1@sha256:[a-f0-9]{64}", policy.get("image", "")):
        raise ValueError("unqualified image")
    if (policy.get("consent", {}).get("status") != "recorded"
            or policy["consent"].get("contentScope") != "compact-session-outcomes"):
        raise ValueError("workspace processing consent missing")
    return policy


def local_active(policy):
    """Only read the local grant. The outbound worker checks its effective binding."""
    if not policy["enabled"]:
        raise ValueError("workspace disabled")
    return project_scope.local_active(policy)


def active(policy, docker="docker"):
    return project_scope.active(policy, docker)


def git_run(cwd, arguments, check=True):
    cwd = absolute(str(cwd))
    env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull, GIT_TERMINAL_PROMPT="0", GIT_OPTIONAL_LOCKS="0")
    return subprocess.run(["git", "--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "core.hooksPath=" + os.devnull,
                           "-C", cwd, *arguments], capture_output=True, text=True, timeout=1, check=check, env=env)


def git_identity(cwd):
    result = git_run(cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"])
    values = result.stdout.splitlines()
    if len(values) != 2:
        raise ValueError("exact repository identity")
    root, common = map(absolute, values)
    info = Path(common).stat()
    return {"root": root, "commonDir": common, "device": info.st_dev, "inode": info.st_ino}


def private_directory(path):
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise ValueError("private state directory")


def write_json(path, value):
    fd, name = tempfile.mkstemp(prefix=".memory-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(value, stream, sort_keys=True)
            stream.write("\n")
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def resolve(policy, cwd, register=False):
    actual = git_identity(cwd)
    root = actual["root"]
    canonical = policy["worktrees"].get(root, root)
    if (Path(root) / ".git").is_file() and root not in policy["worktrees"]:
        raise ValueError("worktree requires an exact explicit mapping")
    if not any(Path(canonical).is_relative_to(Path(allowed)) for allowed in policy["roots"]):
        raise RepositoryIneligible("repository is outside accepted roots")
    if any(Path(candidate).is_relative_to(Path(excluded)) for candidate in (root, canonical) for excluded in policy["exclude"]):
        raise RepositoryIneligible("repository excluded")
    override = policy["repositories"].get(canonical, {})
    if override.get("enabled") is False:
        raise RepositoryIneligible("repository disabled")
    identity = actual if canonical == root else git_identity(canonical)
    if identity["root"] != canonical or identity["commonDir"] != actual["commonDir"]:
        raise ValueError("worktree does not belong to mapped repository")
    state = Path(policy["stateRoot"])
    private_directory(state)
    registry_path = state / "repositories.json"
    fd = os.open(state / "repositories.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        registry = json.loads(project_scope.private_read(registry_path)) if registry_path.exists() else {}
        if not isinstance(registry, dict) or len(registry) > 4096:
            raise ValueError("repository registry")
        for repo_id, item in registry.items():
            if (not isinstance(repo_id, str) or not IDENTIFIER.fullmatch(repo_id)
                    or not isinstance(item, dict) or set(item) != {"root", "commonDir", "device", "inode", "bankId"}
                    or any(not isinstance(item[name], str) or not Path(item[name]).is_absolute() for name in ("root", "commonDir"))
                    or any(type(item[name]) is not int or item[name] < 0 for name in ("device", "inode"))
                    or not isinstance(item["bankId"], str) or not IDENTIFIER.fullmatch(item["bankId"])):
                raise ValueError("foreign or malformed repository registry; use a dedicated Hindsight stateRoot")
        matches = [(key, item) for key, item in registry.items() if item["root"] == canonical]
        if len(matches) > 1 or len({item["root"] for item in registry.values()}) != len(registry):
            raise ValueError("duplicate repository registry roots")
        explicit_id = override.get("repoId")
        if matches and explicit_id and explicit_id != matches[0][0]:
            raise ValueError("repository root is already mapped to another identity")
        if explicit_id and explicit_id in registry:
            repo_id, saved = explicit_id, registry[explicit_id]
        elif matches:
            repo_id, saved = matches[0]
        else:
            # An inode-preserving move needs explicit reassociation, never a new silent bank.
            if any(item.get("device") == identity["device"] and item.get("inode") == identity["inode"] for item in registry.values()):
                raise ValueError("moved repository requires its existing repoId override")
            repo_id = explicit_id or hashlib.sha256(canonical.encode()).hexdigest()[:24]
            if repo_id in registry:
                raise ValueError("repository ID collision requires explicit reassociation")
            saved = None
        if saved and saved != {**identity, "bankId": saved["bankId"]} and not explicit_id:
            raise ValueError("replaced or moved repository requires explicit reassociation")
        bank = override.get("bankId") or (saved["bankId"] if saved else policy["bankPrefix"] + "-" + repo_id)
        if not IDENTIFIER.fullmatch(bank):
            raise ValueError("bank identity bound")
        if any(key != repo_id and item["bankId"] == bank for key, item in registry.items()):
            raise ValueError("independent repositories cannot share a bank")
        if register:
            registry[repo_id] = {**identity, "bankId": bank}
            write_json(registry_path, registry)
        elif saved is None:
            raise ValueError("repository has no registered bank")
    return {"repoId": repo_id, "bankId": bank, "projectRoot": canonical, "worktreeRoot": root,
            "commonDir": identity["commonDir"]}


def transcript_path(policy, source, path):
    path = Path(absolute(str(path)))
    if source not in policy["sessionsRoots"] or not any(path.is_relative_to(Path(root)) for root in policy["sessionsRoots"][source]):
        raise ValueError("transcript outside source-specific roots")
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("doctor", "enable", "disable"))
    parser.add_argument("--workspace-policy", type=Path, required=True)
    parser.add_argument("--docker", default="docker")
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        policy = load(args.workspace_policy)
        if args.command == "enable":
            if not args.evidence:
                raise ValueError("qualification evidence required")
            result = project_scope.enable(policy, args.evidence, args.docker, args.apply)
        elif args.command == "disable":
            target = Path(policy["stateRoot"]) / "activation.json"
            if args.apply and target.exists():
                fd = os.open(target.parent / "scope.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
                with os.fdopen(fd, "a") as lock:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    project_scope.private_read(target)
                    target.unlink(missing_ok=True)
            result = {"status": "disabled" if args.apply else "planned", "action": "disable"}
        else:
            if args.apply:
                raise ValueError("doctor never writes")
            if not policy["enabled"]:
                result = {"status": "disabled"}
            else:
                binding = project_scope.fingerprint(policy, args.docker)
                try:
                    local_active(policy)
                    record = json.loads(project_scope.private_read(Path(policy["stateRoot"]) / "activation.json"))
                    ready = record["bindingSha256"] == binding
                except (OSError, ValueError, KeyError, TypeError):
                    ready = False
                result = {"status": "ready" if ready else "unverified", "bindingSha256": binding,
                          "scope": "workspace", "freshness": "separate"}
        print(json.dumps(result))
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print(json.dumps({"status": "attention", "reason": "Workspace policy or effective route requires review."}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
