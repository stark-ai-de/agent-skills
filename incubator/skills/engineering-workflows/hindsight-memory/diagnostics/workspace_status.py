"""Read the owner's effective workspace policy without opening a bank or registering a repository."""

import argparse
import json
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import project_scope
import workspace_scope


def eligibility(policy, repo):
    actual = workspace_scope.git_identity(repo)
    if actual["root"] != repo:
        raise ValueError("select the exact repository root")
    canonical = policy["worktrees"].get(repo, repo)
    if (Path(repo) / ".git").is_file() and repo not in policy["worktrees"]:
        return "excluded"
    if not any(Path(canonical).is_relative_to(allowed) for allowed in policy["roots"]):
        return "excluded"
    if any(Path(candidate).is_relative_to(excluded) for candidate in (repo, canonical) for excluded in policy["exclude"]):
        return "excluded"
    if policy["repositories"].get(canonical, {}).get("enabled") is False:
        return "excluded"
    identity = actual if canonical == repo else workspace_scope.git_identity(canonical)
    if identity["root"] != canonical or identity["commonDir"] != actual["commonDir"]:
        raise ValueError("worktree does not belong to mapped repository")
    return "eligible"


def inspect(policy_file, project, docker):
    policy = workspace_scope.load(policy_file)
    repo = workspace_scope.absolute(str(project.expanduser()))
    result = {"scope": "workspace", "projectRoot": repo, "freshness": "separate"}
    if not policy["enabled"]:
        return {**result, "status": "disabled", "eligibility": "disabled"}
    result["eligibility"] = eligibility(policy, repo)
    if result["eligibility"] == "excluded":
        return {**result, "status": "disabled"}
    binding = project_scope.fingerprint(policy, docker)
    try:
        workspace_scope.local_active(policy)
        grant = json.loads(project_scope.private_read(Path(policy["stateRoot"]) / "activation.json"))
        ready = grant["bindingSha256"] == binding
    except (OSError, ValueError, KeyError, TypeError):
        ready = False
    return {**result, "status": "ready" if ready else "unverified", "bindingSha256": binding}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace-policy", type=Path, required=True)
    parser.add_argument("--repo", type=Path, required=True, help="Exact repository root")
    parser.add_argument("--docker", default="docker")
    args = parser.parse_args()
    try:
        print(json.dumps(inspect(args.workspace_policy, args.repo, args.docker)))
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print(json.dumps({"status": "attention", "reason": "Workspace policy or effective route requires review."}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
