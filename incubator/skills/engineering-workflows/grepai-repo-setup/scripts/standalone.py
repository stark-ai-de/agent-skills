"""Prepare a new native GrepAI standalone configuration; preview by default."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

import yaml


MODEL = "bge-m3"
MODEL_DIGEST = "7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab"
EXCLUSIONS = [".env", ".env.*", "*.pem", "*.key", "id_rsa", "id_ed25519", ".codegraph", ".local", ".codex", ".aws"]


def prepare(repo, apply=False, executable="grepai", workspace_file=None):
    repo = Path(repo).resolve(strict=True)
    git = ["git", "-c", "core.fsmonitor=false", "-C", str(repo)]
    root = subprocess.check_output([*git, "rev-parse", "--show-toplevel"], text=True).strip()
    if repo != Path(root).resolve():
        raise ValueError("Select the exact Git root")
    gitdir = subprocess.check_output([*git, "rev-parse", "--path-format=absolute", "--git-dir"], text=True).strip()
    common = subprocess.check_output([*git, "rev-parse", "--path-format=absolute", "--git-common-dir"], text=True).strip()
    if gitdir != common:
        raise ValueError("Linked worktrees need an explicit owner/inheritance decision")
    workspace_file = Path(workspace_file) if workspace_file else Path.home() / ".grepai/workspace.yaml"
    if workspace_file.exists():
        shared = yaml.safe_load(workspace_file.read_text()) or {}
        for workspace in shared.get("workspaces", {}).values():
            for project in workspace.get("projects", []):
                if Path(project["path"]).expanduser().resolve() == repo:
                    raise ValueError("This exact root already has a shared workspace owner")
    directory = repo / ".grepai"
    target = directory / "config.yaml"
    if directory.is_symlink() or target.is_symlink():
        raise ValueError("Refusing a symlink configuration")
    if target.exists():
        return {"status": "existing", "reason": "Existing configuration preserved; use its owner to qualify it."}
    if directory.exists():
        raise ValueError("Existing GrepAI state has no configuration; recover it through its owner")
    ignores = repo / ".grepaiignore"
    if ignores.exists() and any(line.strip().startswith("!") for line in ignores.read_text().splitlines()):
        raise ValueError("Review .grepaiignore negations before enforcing exclusions")
    command = [executable, "init", "--provider", "ollama", "--model", MODEL, "--backend", "gob", "--yes"]
    if not apply:
        return {"status": "planned", "command": command, "cwd": str(repo),
                "modelDigest": MODEL_DIGEST, "dimensions": 1024, "indexing": "not started"}
    result = subprocess.run(command, cwd=repo, capture_output=True, timeout=30)
    if result.returncode:
        raise ValueError("Native initialization failed; inspect its partial configuration before retrying")
    config = yaml.safe_load(target.read_text())
    if config["embedder"]["provider"] != "ollama" or config["embedder"]["model"] != MODEL or config["store"]["backend"] != "gob":
        raise ValueError("Native initialization produced an unexpected configuration")
    config["embedder"]["dimensions"] = 1024
    config["ignore"] = list(dict.fromkeys([*config.get("ignore", []), *EXCLUSIONS]))
    # The native initializer just created this file; never rewrite adopted config.
    directory.chmod(0o700)
    fd = os.open(target, os.O_WRONLY | os.O_TRUNC | os.O_NOFOLLOW)
    with os.fdopen(fd, "w") as stream:
        os.fchmod(stream.fileno(), 0o600)
        yaml.safe_dump(config, stream, sort_keys=False)
    return {"status": "prepared", "config": str(target), "indexing": "not started",
            "next": "Verify the pinned model, dimensions and exclusion scope before starting the native watcher."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(prepare(args.repo, args.apply)))
        return 0
    except (OSError, ValueError, TypeError, KeyError, AttributeError, yaml.YAMLError, subprocess.SubprocessError):
        print(json.dumps({"status": "attention", "reason": "Exact root, existing owner, ignore rules or native configuration needs review."}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
