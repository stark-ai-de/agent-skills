"""Start the local MCP transport with a credential from the private env file."""

import argparse
import os
from pathlib import Path
import shlex
import stat
import sys

from project_scope import project_directory


def launch(path, proxy, policy_path=None, workspace_policy_path=None):
    if os.environ.get("HINDSIGHT_MEMORY_DISABLED") == "1":
        raise SystemExit("Hindsight is disabled for this client session.")
    endpoint = "http://127.0.0.1:18888/mcp/greppy/"
    if policy_path and workspace_policy_path:
        raise ValueError("choose one memory policy")
    if workspace_policy_path:
        from workspace_scope import load, active, resolve
        scope = load(workspace_policy_path)
        active(scope)
        repository = resolve(scope, Path.cwd(), register=True)
        path = Path(scope["runtimeEnv"])
        endpoint = scope["endpoint"].rstrip("/") + "/mcp/" + repository["bankId"] + "/"
    elif policy_path:
        from project_scope import load, active
        scope = load(policy_path)
        active(scope)
        project_directory(Path.cwd(), scope["projectRoot"])
        if Path(path).resolve() != Path(scope["runtimeEnv"]):
            raise SystemExit("MCP runtime environment differs from project policy.")
        endpoint = scope["endpoint"].rstrip("/") + "/mcp/" + scope["bankId"] + "/"
    if not policy_path and not workspace_policy_path and not (Path.home() / ".local/state/hindsight-greppy/pilot-start").is_file():
        raise SystemExit("Hindsight MCP becomes available after pilot qualification.")
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(fd, encoding="utf-8") as stream:
            info = os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
                raise ValueError("permissions")
            token = None
            for line in stream:
                name, separator, raw = line.rstrip().partition("=")
                if separator and name == "HINDSIGHT_API_TENANT_API_KEY":
                    if token is not None:
                        raise ValueError("duplicate")
                    parts = shlex.split(raw)
                    if len(parts) != 1:
                        raise ValueError("value")
                    token = parts[0]
            if not token:
                raise ValueError("missing")
    except (OSError, ValueError):
        raise SystemExit("Hindsight requires an owned mode-0600 runtime.env with a local API key.") from None
    env = dict(os.environ)
    env.update(API_ACCESS_TOKEN=token, NO_PROXY="127.0.0.1,localhost", no_proxy="127.0.0.1,localhost")
    os.execve(proxy, [proxy, "--transport", "streamablehttp", endpoint], env)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("runtime", type=Path)
    parser.add_argument("proxy")
    selected = parser.add_mutually_exclusive_group()
    selected.add_argument("--policy", type=Path)
    selected.add_argument("--workspace-policy", type=Path)
    args = parser.parse_args()
    try:
        launch(args.runtime, args.proxy, args.policy, args.workspace_policy)
    except Exception:
        raise SystemExit("MCP project scope or effective route could not be verified.") from None
