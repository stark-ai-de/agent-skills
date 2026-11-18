"""Reconcile display aliases for existing, policy-eligible workspace banks."""

import argparse
import hashlib
import json
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

    def request(bank, payload=None):
        path = endpoint.rstrip("/") + "/v1/default/banks/" + urllib.parse.quote(bank, safe="") + "/aliases"
        req = urllib.request.Request(path, data=None if payload is None else json.dumps(payload).encode(),
                                     headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
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


def reconcile(request, bank, repo, *, apply, revalidate):
    status, info = request(bank)
    if status == 404:
        return "bank_missing"
    if status != 200 or info.get("bank_id") != bank or not isinstance(info.get("aliases"), list):
        raise ValueError("cannot verify exact bank")
    if any(item.get("primary") is True for item in info["aliases"]):
        return "already_named"
    label = re.sub(r"[^a-zA-Z0-9_.-]+", "-", Path(repo).name).strip("._-")[:140] or "repo"
    if bank == label:
        return "already_named"
    if not apply:
        return "planned"
    existing = {item["alias"] for item in info["aliases"]}
    fallback = label + "-" + hashlib.sha256(bank.encode()).hexdigest()[:12]
    for alias in (label, fallback):
        if alias in existing:
            continue
        revalidate()
        status, _ = request(bank, {"alias": alias, "primary": True})
        if status == 409:
            continue
        if status not in (200, 201):
            raise ValueError("alias update failed")
        observed, value = request(bank)
        if (observed == 200 and value.get("bank_id") == bank
                and any(item.get("alias") == alias and item.get("primary") is True for item in value["aliases"])):
            return "named"
        raise ValueError("alias readback failed")
    return "collision"


def run(policy_file, docker, apply):
    policy = workspace_scope.load(policy_file)
    if not policy["enabled"]:
        return {"disabled": 1}
    state = Path(policy["stateRoot"])
    grant_path = state / "activation.json"
    registry_path = state / "repositories.json"
    policy_snapshot = project_scope.private_read(policy_file)
    grant_snapshot = project_scope.private_read(grant_path)
    workspace_scope.active(policy, docker)
    if not registry_path.exists():
        return {}
    registry = json.loads(project_scope.private_read(registry_path))
    if not isinstance(registry, dict) or len(registry) > 4096:
        raise ValueError("invalid repository registry")
    banks = [entry["bankId"] for entry in registry.values()]
    if len(set(banks)) != len(banks):
        raise ValueError("ambiguous repository registry")
    request = client(policy["endpoint"], project_scope.environment(policy["runtimeEnv"])["HINDSIGHT_API_TENANT_API_KEY"])
    counts = {}
    for repo_id, entry in registry.items():
        repo, bank = entry["root"], entry["bankId"]
        if not workspace_scope.IDENTIFIER.fullmatch(bank):
            raise ValueError("invalid bank identity")

        def revalidate():
            if (project_scope.private_read(policy_file) != policy_snapshot
                    or project_scope.private_read(grant_path) != grant_snapshot
                    or json.loads(project_scope.private_read(registry_path)).get(repo_id) != entry):
                raise ValueError("workspace binding changed")

        if not Path(repo).is_dir() or eligibility(policy, repo) != "eligible":
            continue
        if workspace_scope.git_identity(repo) != {key: value for key, value in entry.items() if key != "bankId"}:
            continue
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
