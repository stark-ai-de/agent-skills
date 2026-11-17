"""Start the local MCP transport with a credential from the private env file."""

import argparse
from contextlib import contextmanager
import http.client
import json
import os
from pathlib import Path
import re
import shlex
import signal
import stat
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

from project_scope import project_directory

_BANK_HTTP_SECONDS = 5.0


class BankBootstrapError(ValueError):
    """A bounded, nonsecret bank-startup diagnostic."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


@contextmanager
def _bank_deadline(deadline):
    """Interrupt blocking headers/body reads on the supported Linux/WSL host."""
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise BankBootstrapError("Hindsight workspace bank startup exceeded its five-second HTTP budget.")
    if any(signal.getitimer(signal.ITIMER_REAL)):
        raise BankBootstrapError("Hindsight workspace bank startup cannot replace an existing process timer.")

    def expired(signum, frame):
        raise BankBootstrapError("Hindsight workspace bank startup exceeded its five-second HTTP budget.")

    try:
        previous = signal.signal(signal.SIGALRM, expired)
    except ValueError:
        raise BankBootstrapError("Hindsight workspace bank startup requires the launcher main thread.") from None
    try:
        signal.setitimer(signal.ITIMER_REAL, remaining)
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


def ensure_workspace_bank(endpoint, bank_id, token, revalidate):
    """Make a qualified workspace's exact bank readable before its first retain.

    Hindsight 1.2.1 does not create banks during reads. PUT {} initializes only
    an absent bank profile; it supplies no facts, name or configuration changes.
    """
    url = urlsplit(endpoint)
    if (url.scheme != "http" or url.hostname not in {"127.0.0.1", "localhost", "::1"}
            or not url.port or url.username is not None or url.password is not None
            or url.query or url.fragment or url.path not in {"", "/"}
            or not isinstance(bank_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", bank_id)
            or not isinstance(token, str) or not token
            or any(ord(character) < 33 or ord(character) > 126 for character in token)):
        raise BankBootstrapError("Hindsight workspace bank endpoint or credential is invalid.")
    base = endpoint.rstrip("/") + "/v1/default/banks/" + bank_id
    deadline = time.monotonic() + _BANK_HTTP_SECONDS
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def request(method, suffix):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise BankBootstrapError("Hindsight workspace bank startup exceeded its five-second HTTP budget.")
        req = urllib.request.Request(base + suffix, data=b"{}" if method == "PUT" else None, method=method,
            headers={"Authorization": "Bearer " + token, "Accept": "application/json", "Content-Type": "application/json"})
        try:
            with opener.open(req, timeout=remaining) as response:
                status = response.status
                raw = response.read(1048577)
        except urllib.error.HTTPError as error:
            status = error.code
            error.close()
            return status, None
        except (OSError, urllib.error.URLError, http.client.HTTPException):
            raise BankBootstrapError("Hindsight workspace bank request failed or timed out.") from None
        if len(raw) > 1048576 or time.monotonic() > deadline:
            raise BankBootstrapError("Hindsight workspace bank response exceeded its size or time bound.")
        try:
            result = json.loads(raw)
        except (ValueError, UnicodeError, RecursionError):
            raise BankBootstrapError("Hindsight workspace bank returned invalid JSON.") from None
        return status, result

    def checked(status, result, *, configuration=False):
        if status != 200:
            raise BankBootstrapError(f"Hindsight workspace bank request returned HTTP {status}.")
        if (not isinstance(result, dict) or result.get("bank_id") != bank_id
                or "error" in result or result.get("success") is False
                or result.get("status") in ("error", "failed")
                or (configuration and (not isinstance(result.get("config"), dict)
                                       or not isinstance(result.get("overrides"), dict)))):
            raise BankBootstrapError("Hindsight workspace bank response did not verify the exact mapped bank.")

    with _bank_deadline(deadline):
        revalidate()
        status, result = request("GET", "/config")
        if status == 404:
            revalidate()
            checked(*request("PUT", ""))
            status, result = request("GET", "/config")
        checked(status, result, configuration=True)
        revalidate()


def launch(path, proxy, policy_path=None, workspace_policy_path=None):
    if os.environ.get("HINDSIGHT_MEMORY_DISABLED") == "1":
        raise SystemExit("Hindsight is disabled for this client session.")
    endpoint = "http://127.0.0.1:18888/mcp/greppy/"
    if policy_path and workspace_policy_path:
        raise ValueError("choose one memory policy")
    if workspace_policy_path:
        from workspace_scope import load, active, local_active, resolve
        from project_scope import private_read
        scope = load(workspace_policy_path)
        inputs = {Path(workspace_policy_path), Path(scope["stateRoot"]) / "activation.json", Path(scope["runtimeEnv"])}
        snapshot = {item: private_read(item) for item in inputs}
        cutoff = active(scope)
        cwd = Path.cwd()
        repository = resolve(scope, cwd, register=True)
        path = Path(scope["runtimeEnv"])
        endpoint = scope["endpoint"].rstrip("/") + "/mcp/" + repository["bankId"] + "/"

        def revalidate():
            # The full route was checked above. Keep this local guard bounded;
            # repeated Docker/model metadata calls would consume client startup.
            if (os.environ.get("HINDSIGHT_MEMORY_DISABLED") == "1"
                    or any(private_read(item) != original for item, original in snapshot.items())
                    or load(workspace_policy_path) != scope or local_active(scope) != cutoff
                    or resolve(scope, cwd) != repository):
                raise BankBootstrapError("Hindsight workspace scope changed before MCP startup.")
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
    if workspace_policy_path:
        ensure_workspace_bank(scope["endpoint"], repository["bankId"], token, revalidate)
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
    except BankBootstrapError as error:
        raise SystemExit(str(error)) from None
    except Exception:
        raise SystemExit("MCP project scope or effective route could not be verified.") from None
