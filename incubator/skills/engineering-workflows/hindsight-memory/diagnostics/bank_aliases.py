"""Reconcile display aliases for existing, policy-eligible workspace banks."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

from workspace_status import eligibility, project_scope, workspace_scope


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def client(endpoint, token):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def request(bank, payload=None, *, alias=None):
        path = endpoint.rstrip("/") + "/v1/default/banks/" + urllib.parse.quote(bank, safe="") + "/aliases"
        if alias is not None:
            path += "/" + urllib.parse.quote(alias, safe="")
        req = urllib.request.Request(path, data=None if payload is None else json.dumps(payload).encode(),
                                     headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
                                     method="PATCH" if alias is not None else ("POST" if payload is not None else "GET"))
        try:
            with opener.open(req, timeout=5) as response:
                body = response.read(1048577)
                if len(body) > 1048576:
                    raise ValueError("oversized bank response")
                return response.status, json.loads(body)
        except urllib.error.HTTPError as error:
            with error:
                return error.code, None

    return request


def aliases_for_bank(status, info, bank):
    if (status != 200 or not isinstance(info, dict) or info.get("bank_id") != bank
            or not isinstance(info.get("aliases"), list)):
        raise ValueError("cannot verify exact bank")
    aliases = info["aliases"]
    if (any(not isinstance(item, dict) or not isinstance(item.get("alias"), str) or not item["alias"]
            or type(item.get("primary")) is not bool for item in aliases)
            or len({item["alias"] for item in aliases}) != len(aliases)
            or sum(item["primary"] for item in aliases) > 1):
        raise ValueError("invalid bank aliases")
    return aliases


def reconcile(request, bank, repo, *, apply, revalidate):
    status, info = request(bank)
    if status == 404:
        return "bank_missing"
    aliases = aliases_for_bank(status, info, bank)
    if any(item["primary"] for item in aliases):
        return "already_named"
    label = re.sub(r"[^a-zA-Z0-9_.-]+", "-", Path(repo).name).strip("._-")[:140] or "repo"
    if bank == label:
        return "already_named"
    if not apply:
        return "planned"
    existing = {item["alias"] for item in aliases}
    fallback = label + "-" + hashlib.sha256(bank.encode()).hexdigest()[:12]
    for alias in (label, fallback):
        revalidate()
        if alias in existing:
            status, _ = request(bank, {"primary": True}, alias=alias)
        else:
            status, _ = request(bank, {"alias": alias, "primary": True})
        if status == 409:
            continue
        if status not in (200, 201):
            raise ValueError("alias update failed")
        observed, value = request(bank)
        if any(item["alias"] == alias and item["primary"] for item in aliases_for_bank(observed, value, bank)):
            return "named"
        raise ValueError("alias readback failed")
    return "collision"


def run(policy_file, docker, apply):
    if os.environ.get("HINDSIGHT_MEMORY_DISABLED") == "1":
        return {"disabled": 1}
    policy_file = Path(policy_file).expanduser()
    policy_snapshot = project_scope.private_read(policy_file)
    policy = workspace_scope.load(policy_file)
    if project_scope.private_read(policy_file) != policy_snapshot:
        raise ValueError("workspace policy changed")
    if not policy["enabled"]:
        return {"disabled": 1}
    state = Path(policy["stateRoot"])
    grant_path = state / "activation.json"
    registry_path = state / "repositories.json"
    grant_snapshot = project_scope.private_read(grant_path)
    if not registry_path.exists():
        return {}
    registry_snapshot = project_scope.private_read(registry_path)
    registry = workspace_scope.validate_registry(json.loads(registry_snapshot))
    runtime_snapshot = project_scope.private_read(policy["runtimeEnv"])

    def unchanged():
        if (os.environ.get("HINDSIGHT_MEMORY_DISABLED") == "1"
                or project_scope.private_read(policy_file) != policy_snapshot
                or project_scope.private_read(grant_path) != grant_snapshot
                or project_scope.private_read(policy["runtimeEnv"]) != runtime_snapshot
                or project_scope.private_read(registry_path) != registry_snapshot):
            raise ValueError("workspace binding changed")

    def eligible_entry(repo_id, entry):
        repo, bank = entry["root"], entry["bankId"]
        if not Path(repo).is_dir() or eligibility(policy, repo) != "eligible":
            return False
        override = policy["repositories"].get(repo, {})
        if (policy["worktrees"].get(repo, repo) != repo
                or override.get("repoId", repo_id) != repo_id or override.get("bankId", bank) != bank
                or any(root != repo and (item.get("repoId") == repo_id or item.get("bankId") == bank)
                       for root, item in policy["repositories"].items())):
            raise ValueError("repository mapping changed; refresh its registry through the existing owner")
        return workspace_scope.git_identity(repo) == {key: value for key, value in entry.items() if key != "bankId"}

    # Validate every selection before opening any bank, including preview mode.
    selected = [(repo_id, entry) for repo_id, entry in registry.items() if eligible_entry(repo_id, entry)]
    unchanged()
    if not selected:
        return {}
    workspace_scope.active(policy, docker)
    token = project_scope.environment(policy["runtimeEnv"])["HINDSIGHT_API_TENANT_API_KEY"]
    unchanged()
    request = client(policy["endpoint"], token)
    counts = {}
    for repo_id, entry in selected:
        repo, bank = entry["root"], entry["bankId"]

        def revalidate():
            unchanged()
            workspace_scope.active(policy, docker)
            if not eligible_entry(repo_id, entry):
                raise ValueError("repository identity or eligibility changed")
            unchanged()

        unchanged()
        result = reconcile(request, bank, repo, apply=apply, revalidate=revalidate)
        counts[result] = counts.get(result, 0) + 1
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace-policy", required=True, type=Path)
    parser.add_argument("--docker", default="docker")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(run(args.workspace_policy, args.docker, args.apply)))
    except Exception:
        raise SystemExit("Could not verify workspace bank aliases; review the local owner state before retrying.") from None


if __name__ == "__main__":
    main()
