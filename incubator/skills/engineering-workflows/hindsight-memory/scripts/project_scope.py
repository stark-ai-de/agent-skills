"""Private project scope and effective-route qualification for Hindsight 1.2.1."""

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import stat
import subprocess
import sys
import urllib.request
from urllib.parse import urlsplit


def private_read(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600 or info.st_size > 1048576:
            raise ValueError("private input permissions or size")
        return stream.read(1048577)


def project_directory(path, project):
    path = Path(path).resolve(strict=True)
    project = Path(project).resolve(strict=True)
    path.relative_to(project)
    if not path.is_dir():
        raise ValueError("project working directory")
    current = path
    while current != project:
        marker = current / ".git"
        if marker.exists() or marker.is_symlink():
            raise ValueError("nested repository requires its own project grant")
        current = current.parent
    return path


def load(path):
    policy = json.loads(private_read(Path(path).expanduser()))
    if policy.get("schemaVersion") != 1 or type(policy.get("enabled")) is not bool:
        raise ValueError("project policy schema")
    for key in ("projectRoot", "sessionsRoot", "stateRoot", "runtimeEnv", "privatePolicyFile"):
        value = policy[key]
        if not isinstance(value, str) or not Path(value).is_absolute():
            raise ValueError("absolute policy paths required")
        candidate = Path(value)
        if any(p.is_symlink() for p in [candidate, *candidate.parents]):
            raise ValueError("symlink policy path")
        policy[key] = str(candidate.resolve())
    if not Path(policy["projectRoot"]).is_dir() or not Path(policy["sessionsRoot"]).is_dir():
        raise ValueError("missing project or session root")
    state = Path(policy["stateRoot"])
    if state == Path(policy["projectRoot"]) or state.is_relative_to(Path(policy["projectRoot"])):
        raise ValueError("memory state must be outside source")
    for key in ("bankId", "container"):
        if not isinstance(policy.get(key), str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", policy[key]):
            raise ValueError("bank or container identity")
    url = urlsplit(policy["endpoint"])
    if (url.scheme != "http" or url.hostname not in {"127.0.0.1", "localhost", "::1"}
            or url.username is not None or url.password is not None or url.query or url.fragment
            or url.path not in {"", "/"} or not url.port):
        raise ValueError("local API endpoint")
    if not re.fullmatch(r"ghcr.io/vectorize-io/hindsight:1\.2\.1@sha256:[a-f0-9]{64}", policy.get("image", "")):
        raise ValueError("unqualified image")
    if (policy.get("consent", {}).get("status") != "recorded"
            or policy["consent"].get("contentScope") not in {"manual-memory", "codex-session-content"}):
        raise ValueError("project processing consent missing")
    return policy


def environment(path):
    values = {}
    for line in private_read(path).decode().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, raw = line.partition("=")
        parts = shlex.split(raw)
        if not sep or not re.fullmatch(r"HINDSIGHT_[A-Z0-9_]+", key) or key in values or len(parts) != 1:
            raise ValueError("runtime environment")
        values[key] = parts[0]
    if any(not values.get(key) for key in ("HINDSIGHT_API_TENANT_API_KEY", "HINDSIGHT_API_LLM_PROVIDER", "HINDSIGHT_API_LLM_MODEL")):
        raise ValueError("missing API credential or model route")
    return values


def fingerprint(policy, docker="docker"):
    declared = environment(policy["runtimeEnv"])
    result = subprocess.run([docker, "inspect", "--format",
        '{"image":{{json .Config.Image}},"env":{{json .Config.Env}},"mounts":{{json .Mounts}},"running":{{json .State.Running}}}',
        policy["container"]], capture_output=True, text=True, timeout=5, check=True)
    if len(result.stdout) > 1048576:
        raise ValueError("container metadata bound")
    actual = json.loads(result.stdout)
    values = dict(item.split("=", 1) for item in actual["env"] if "=" in item)
    if actual["running"] is not True or actual["image"] != policy["image"]:
        raise ValueError("running image differs from approved pin")
    if any(values.get(key) != value for key, value in declared.items()):
        raise ValueError("running route differs from runtime environment")
    required = {"HINDSIGHT_API_STORE_DOCUMENT_TEXT": "false", "HINDSIGHT_API_LLM_TRACE_ENABLED": "false",
                "HINDSIGHT_API_OTEL_TRACES_ENABLED": "false", "HINDSIGHT_API_FAIL_ON_EXTRACTION_ERRORS": "true",
                "HINDSIGHT_API_HOST": "127.0.0.1", "HINDSIGHT_CP_HOSTNAME": "127.0.0.1",
                "HINDSIGHT_API_LOG_LEVEL": "warning", "HINDSIGHT_API_LLM_DEBUG_DUMP_4XX": "false",
                "HINDSIGHT_API_TENANT_EXTENSION": "private_policy:PrivateTenantExtension",
                "HINDSIGHT_API_OPERATION_VALIDATOR_EXTENSION": "private_policy:PrivateStorageValidator"}
    if any(values.get(key) != value for key, value in required.items()):
        raise ValueError("running privacy settings differ")
    if values.get("HINDSIGHT_API_PORT") != str(urlsplit(policy["endpoint"]).port):
        raise ValueError("running API port differs")
    mounts = [m for m in actual["mounts"] if m.get("Destination") == "/hindsight/private_policy.py"]
    if len(mounts) != 1 or mounts[0].get("RW") is not False or Path(mounts[0]["Source"]).resolve() != Path(policy["privatePolicyFile"]):
        raise ValueError("privacy extension mount differs")
    digest = hashlib.sha256(json.dumps(policy, sort_keys=True, separators=(",", ":")).encode())
    digest.update(json.dumps({k: v for k, v in values.items() if k.startswith("HINDSIGHT_")}, sort_keys=True).encode())
    digest.update(Path(policy["privatePolicyFile"]).read_bytes())
    for source in sorted(Path(__file__).parent.glob("*.py")):
        digest.update(source.name.encode() + source.read_bytes())
    if values.get("HINDSIGHT_API_EMBEDDINGS_PROVIDER") != "openai":
        raise ValueError("new project grants require qualified Ollama embeddings")
    base = values.get("HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL", "")
    url = urlsplit(base)
    if (url.scheme != "http" or url.hostname not in {"127.0.0.1", "localhost", "::1"}
            or url.username is not None or url.password is not None or url.path != "/v1" or url.query or url.fragment):
        raise ValueError("unqualified embedding route")
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(base.removesuffix("/v1") + "/api/tags", timeout=3) as response:
        raw = response.read(1048577)
    if len(raw) > 1048576:
        raise ValueError("model metadata bound")
    models = json.loads(raw)["models"]
    selected = [(values["HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL"], policy.get("embeddingDigest"))]
    if values.get("HINDSIGHT_API_LLM_PROVIDER") == "ollama":
        if values.get("HINDSIGHT_API_LLM_BASE_URL") != base:
            raise ValueError("local generative and embedding routes must use the same qualified Ollama instance")
        selected.append((values["HINDSIGHT_API_LLM_MODEL"], policy.get("generativeDigest")))
    for model, expected in selected:
        name = model if ":" in model else model + ":latest"
        found = [item.get("digest") for item in models if item.get("name") == name]
        if not isinstance(expected, str) or not re.fullmatch(r"[a-f0-9]{64}", expected) or found != [expected]:
            raise ValueError("model identity changed or is unqualified")
        digest.update(expected.encode())
    return digest.hexdigest()


def active(policy, docker="docker"):
    if not policy["enabled"]:
        raise ValueError("project disabled")
    record = json.loads(private_read(Path(policy["stateRoot"]) / "activation.json"))
    if record.get("schemaVersion") != 1 or record.get("bindingSha256") != fingerprint(policy, docker):
        raise ValueError("qualification binding changed")
    cutoff = dt.datetime.fromisoformat(record["enabledAt"])
    if cutoff.tzinfo is None:
        raise ValueError("qualification time")
    return cutoff


def enable(policy, evidence_path, docker="docker", apply=False):
    evidence = json.loads(private_read(evidence_path))
    binding = fingerprint(policy, docker)
    checks = evidence.get("checks", {})
    if (not policy["enabled"] or evidence.get("schemaVersion") != 1 or evidence.get("bindingSha256") != binding
            or any(checks.get(key) is not True for key in ("retainReadback", "projectIsolation", "rawTextDisabled", "embeddingDimensions"))
            or not (evidence.get("modelRouteReviewed") is True or evidence.get("modelRoutePrivacyAccepted") is True)):
        raise ValueError("scope, route or qualification incomplete")
    state = Path(policy["stateRoot"])
    if not apply:
        return {"status": "planned", "action": "enable", "bindingSha256": binding}
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    info = state.stat()
    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise ValueError("state permissions")
    with (state / "scope.lock").open("a") as lock:
        os.chmod(lock.name, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        target = state / "activation.json"
        if target.exists():
            active(policy, docker)
            return {"status": "unchanged"}
        record = {"schemaVersion": 1, "enabledAt": dt.datetime.now(dt.timezone.utc).isoformat(),
                  "bindingSha256": binding, "evidenceSha256": hashlib.sha256(private_read(evidence_path)).hexdigest()}
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, "w") as stream:
            json.dump(record, stream)
            stream.write("\n")
    return {"status": "enabled"}


def doctor(policy, docker="docker"):
    if not policy["enabled"]:
        return {"status": "disabled", "enabled": False, "scope": policy["projectRoot"], "reason": "Project memory is disabled."}
    binding = fingerprint(policy, docker)
    try:
        active(policy, docker)
        return {"status": "ready", "enabled": True, "bindingSha256": binding,
                "scope": policy["projectRoot"], "reason": "Recorded qualification matches the current effective route; retrieval freshness is separate."}
    except (OSError, ValueError, KeyError, TypeError):
        return {"status": "unverified", "enabled": False, "bindingSha256": binding,
                "scope": policy["projectRoot"], "reason": "Project is disabled, unqualified or its binding changed."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["doctor", "enable", "disable"])
    parser.add_argument("--policy", required=True, type=Path)
    parser.add_argument("--docker", default="docker")
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        policy = load(args.policy)
        if args.command == "doctor":
            if args.apply:
                raise ValueError("doctor never applies changes")
            result = doctor(policy, args.docker)
        elif args.command == "enable":
            if not args.evidence:
                raise ValueError("qualification evidence required")
            result = enable(policy, args.evidence, args.docker, args.apply)
        elif not args.apply:
            result = {"status": "planned", "action": "disable"}
        else:
            target = Path(policy["stateRoot"]) / "activation.json"
            if target.exists():
                private_read(target)
                with (target.parent / "scope.lock").open("a") as lock:
                    os.chmod(lock.name, 0o600)
                    fcntl.flock(lock, fcntl.LOCK_EX)
                    target.unlink(missing_ok=True)
            result = {"status": "disabled"}
        print(json.dumps(result))
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print(json.dumps({"status": "attention", "reason": "Private policy, effective route or qualification needs review; no content was exposed."}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
