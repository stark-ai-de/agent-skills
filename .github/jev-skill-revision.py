"""Temporary, bounded source assembly; removed before the final PR.

No installation of Jev, provider request, or live permission change occurs.
The repository's own generator produces all committed plugin projections.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

REPO = "stark-ai-de/agent-skills"
BRANCH = "codex/jev-portable-network-contract"
PREFIX = "skills/skill-maintenance/jev-capability-advisor/"
FILES = ("SKILL.md", "references/network-access.md", "references/hook-integration.md",
         "scripts/jev_advisor.py", "assets/hook-guidance.txt", "assets/repository-hook-guidance.txt")
EVAL = "skill-evals/jev-capability-advisor/README.md"
ALLOWED = {PREFIX + name for name in FILES} | {
    "plugins/stark-ai-developer/skills/jev-capability-advisor/" + name for name in FILES
} | {"plugins/stark-ai-developer/SOURCE-MANIFEST.json", EVAL}
BASELINES = {
    "SKILL.md": "ce255a39283c6c7b3c60ce0c48faabc90d50ee1e",
    "references/hook-integration.md": "97ff95fb8fd2af99751a3ffe9d69a95624e75c69",
    "scripts/jev_advisor.py": "fa21b3684801ed7c8338c7c1d89ca1f5946e6b0d",
    "assets/hook-guidance.txt": "1259ae15173c901001ab4492eaecd4dd081dbf60",
}


def blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError("replacement anchor changed")
    return text.replace(old, new, 1)


def apply():
    skill = Path(PREFIX)
    for name, expected in BASELINES.items():
        if blob((skill / name).read_bytes()) != expected:
            raise ValueError("source changed: " + name)
    p = skill / "SKILL.md"
    s = p.read_text(encoding="utf-8")
    s = once(s, "license: Apache-2.0\n", "license: Apache-2.0\ncompatibility: >-\n  Requires Python 3.10+, TypeSafe API credentials, and host-authorized\n  HTTPS access to api.typesafe.ai for recommendations.\n")
    s = once(s, 'version: "0.3.1"', 'version: "0.3.2"')
    s = once(s, "## Enabled-hook entry\n", '''## Network prerequisite

Recommendations need host-authorized HTTPS access to `api.typesafe.ai:443` and
existing TypeSafe credentials. Installation, hook trust, processing consent and
network permission are separate. The user or administrator owns permissions;
the skill never edits sandbox, firewall, proxy or approval policy. Use an
applicable native approval route only when needed. A denial ends the attempt:
no alternate route, repeated prompt or automatic retry. Follow the
[network and failure contract](references/network-access.md) for actionable,
secret-free messages. Without usable API access, no Jev recommendation was
produced; native selection and local `Inspect` are not Jev advice.

The contract is the same on native Windows, macOS and Linux; WSL is a separate
environment, not a prerequisite. Use the installed OS-native Python interpreter.
Concrete host approval controls belong in the [hook reference](references/hook-integration.md).

## Enabled-hook entry
''')
    old = "When the active host requires network approval, obtain it through the host's normal route before the first provider command. In Codex, when the active `exec_command` exposes `sandbox_permissions` and network access is restricted, set it to `require_escalated` with a scoped `justification` on the advisor command itself. Prepare local input files separately; shell text cannot request this tool-level approval. Denied or unavailable required approval means native fallback without a provider attempt."
    s = once(s, old, "Use the executing host's applicable native approval route as described in the hook reference before dispatch. Prepare permitted local inputs separately. Denied or unavailable required approval means no provider attempt; explain that Jev did not produce a recommendation before any native continuation.")
    s = once(s, "- Missing key or network failure: inspect candidates locally and state that semantic selection was not completed.", "- Missing credentials or API access: follow the [network and failure contract](references/network-access.md). Report no Jev result and the evidenced cause; do not relabel a generic connection failure as a sandbox denial. Automatic hooks may continue natively; explicit Jev-only requests remain unfulfilled. Local inspection is a separate available workflow, not an automatic substitute.")
    s = once(s, "Return status, selected capability names/IDs, why the selection fits the requested first step, and any unresolved ambiguity or coverage limit.", "Return status, selected capability names/IDs, why the selection fits the requested first step, and any unresolved ambiguity or coverage limit. On failure, use the safe summary `error_message` with the observed error category and localize it to the user. Only the host can establish an approval denial; no Python error implies one. Keep an explicit Jev failure separate from any native advice.")
    p.write_text(s, encoding="utf-8")

    p = skill / "references/hook-integration.md"
    s = p.read_text(encoding="utf-8")
    s = once(s, "Before the provider command, check the executing host's network policy.", "Follow the [portable network and failure contract](network-access.md). Before the provider command, check the executing host's network policy.")
    old = "For Codex hosts whose active `exec_command` schema exposes `sandbox_permissions`, request `require_escalated` on the **first advisor invocation** when its network access needs approval."
    new = "Use the narrowest applicable approval offered by the current host/tool schema. If Codex requires approval and exposes only `exec_command` with `sandbox_permissions` for this invocation, request `require_escalated` on the **first advisor invocation**; prefer a supported narrower network permission when available. Approval that runs outside the sandbox is broader than a domain allowance and must not be described as network-only."
    s = once(s, old, new)
    s = once(s, "## Capture a bounded current-session catalog\n", '''For Claude, use the active client's normal command or domain-approval mechanism
where supported; do not add persistent allow rules, change sandbox settings or
request an alternate unsandboxed retry after denial. Native Windows Python/hook
support does not establish support for Claude's Bash sandbox. A missing host
control does not make WSL a prerequisite for the portable advisor: respect the
actual native host policy and report unavailable approval truthfully.

## Capture a bounded current-session catalog
''')
    p.write_text(s, encoding="utf-8")
    for name in ("hook-guidance.txt", "repository-hook-guidance.txt"):
        p = skill / "assets" / name
        s = p.read_text(encoding="utf-8").rstrip()
        s += " Follow references/network-access.md for required TypeSafe access and failure messages. Say no Jev recommendation was produced before automatic native continuation; explicit Jev-only requests remain unfulfilled. Only host evidence establishes denial. Respect its scope without repeated prompts, policy edits or alternate routes.\n"
        p.write_text(s, encoding="utf-8")

    p = skill / "scripts/jev_advisor.py"
    s = p.read_text(encoding="utf-8")
    marker = "\n\ndef summarize(result, catalog=()):"
    addition = '''

def _failure_message(code):
    """Constant, secret-free presentation; transport errors never prove denial.

    The existing error code remains authoritative. The host localizes this text
    and supplies observed approval facts; this helper cannot inspect its policy.
    """
    messages = {
        'network_error': 'Jev could not reach the TypeSafe API; the cause is unknown. No Jev recommendation was produced.',
        'request_timeout': 'The TypeSafe request timed out; completion is unknown. No Jev recommendation was produced. Do not automatically retry.',
        'missing_api_key': 'Jev requires existing TypeSafe credentials. No Jev recommendation was produced.',
        'credential_unavailable': 'The configured TypeSafe credential file is unavailable. No fallback credential was used; no Jev recommendation was produced.',
        'credential_invalid': 'The configured TypeSafe credential is invalid. No Jev recommendation was produced.',
        'invalid_api_key': 'The configured TypeSafe credential is invalid. No Jev recommendation was produced.',
        'http_401': 'TypeSafe rejected authentication. Check the configured credential; this is not evidence of a sandbox denial. No Jev recommendation was produced.',
        'http_403': 'The API request was refused (HTTP 403); this alone does not establish a sandbox denial. No Jev recommendation was produced.',
        'http_404': 'The API request returned HTTP 404, not a valid Jev result. No Jev recommendation was produced.',
    }
    return messages.get(code, 'The Jev request failed. No Jev recommendation was produced; the failure does not establish a sandbox denial.')
'''
    s = once(s, marker, addition + marker)
    s = once(s, "    summary['format'] = 'recommendation_summary'", "    summary['format'] = 'recommendation_summary'\n    if result.get('status') == 'error':\n        summary['error_message'] = _failure_message(result.get('error'))")
    p.write_text(s, encoding="utf-8")

    p = Path(EVAL)
    if blob(p.read_bytes()) != "6960e05de238747f5858100842ccb81354d31e7d":
        raise ValueError("evaluation baseline changed")
    p.write_text(p.read_text(encoding="utf-8") + '''

## Portable network contract — 2026-09-28

Skill revision `0.3.2` adds descriptive API compatibility, a shared network/failure
contract, narrower host-specific approval guidance, and a safe `error_message`
for failed summaries. It does not change selection, transport, permissions,
request budgets, credentials or caches. Historical benchmark observations above
remain historical; no new speed or provider-quality claim is made.

`test_network_contract.py` runs the real helper with injected replies and checks
no replay, credential precedence, secret-free error presentation, valid `none`,
and no-write offline inspection. Text checks cover the declared host approval
states; they are not execution evidence for an actual approval dialog. The
portable-network workflow runs these tests on native Windows, macOS and Linux
with Python 3.10 and 3.14. Use the exact current CI run for observed results;
a configured matrix is not a passing result.

Live host approval/denial, provider results, fresh-session eligible inventory,
and automatic hook delivery/use for this revision remain `not_run` until a
separately authorized qualification records them. WSL is qualified separately.
No live TypeSafe request or credential was used for this implementation. Changed
guidance invalidates relevant installed-registration evidence; review and
explicitly refresh an existing registration rather than silently reinstalling.
''', encoding="utf-8")


def api(route, data=None, method=None):
    request = urllib.request.Request("https://api.github.com/repos/" + REPO + route,
        data=None if data is None else json.dumps(data).encode(), method=method,
        headers={"Authorization": "Bearer " + os.environ["GH_TOKEN"],
        "Accept": "application/vnd.github+json", "Content-Type": "application/json",
        "User-Agent": "bounded-implementation-assembly"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def publish():
    if os.environ.get("GITHUB_REPOSITORY") != REPO or os.environ.get("GITHUB_REF") != "refs/heads/" + BRANCH:
        raise ValueError("wrong publication scope")
    expected = os.environ["EXPECTED_HEAD"]
    if api("/git/ref/heads/" + BRANCH)["object"]["sha"] != expected:
        raise ValueError("branch moved; refusing publication")
    names = set(filter(None, subprocess.check_output(["git", "diff", "--name-only", "-z"]).decode().split("\0")))
    names |= set(filter(None, subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard", "-z"]).decode().split("\0")))
    if not names or not names <= ALLOWED:
        raise ValueError("unexpected changed-file scope: " + ", ".join(sorted(names - ALLOWED)))
    entries = []
    for name in sorted(names):
        path = Path(name)
        if path.is_symlink() or not path.is_file():
            raise ValueError("unexpected file kind")
        tracked = subprocess.check_output(["git", "ls-files", "-s", "--", name]).decode().split()
        mode = tracked[0] if tracked else "100644"
        entries.append({"path": name, "mode": mode, "type": "blob", "content": path.read_text(encoding="utf-8")})
    parent = api("/git/commits/" + expected)
    tree = api("/git/trees", {"base_tree": parent["tree"]["sha"], "tree": entries})
    commit = api("/git/commits", {"message": "fix(jev): clarify portable API authorization and failure outcomes", "tree": tree["sha"], "parents": [expected]})
    if api("/git/ref/heads/" + BRANCH)["object"]["sha"] != expected:
        raise ValueError("branch moved before ref update")
    api("/git/refs/heads/" + BRANCH, {"sha": commit["sha"], "force": False}, "PATCH")
    print("Recorded implementation commit:", commit["sha"])
    for entry in entries:
        print(entry["path"], blob(entry["content"].encode()))


if __name__ == "__main__":
    if sys.argv[1:] == ["apply"]:
        apply()
    elif sys.argv[1:] == ["publish"]:
        publish()
    else:
        raise SystemExit("expected apply or publish")
