"""Shared, read-only primitives for the local Karakeep helpers (Python 3.10+)."""

import json
import os
from pathlib import Path
import shlex
import stat
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


class ConfigurationError(Exception):
    """Messages must never contain a credential or an untrusted response body."""


def default_paths():
    home = Path.home()
    return tuple(
        Path(os.environ.get(variable, str(home / suffix))) / "karakeep"
        for variable, suffix in (
            ("XDG_CONFIG_HOME", ".config"),
            ("XDG_DATA_HOME", ".local/share"),
            ("XDG_STATE_HOME", ".local/state"),
        )
    )


def local_url(value):
    try:
        parsed = urlsplit(value)
        valid = (
            not any(c.isspace() or ord(c) < 32 for c in value)
            and parsed.scheme in ("http", "https")
            and parsed.hostname in ("localhost", "127.0.0.1", "::1")
            and parsed.username is None
            and parsed.password is None
            and parsed.path in ("", "/")
            and not parsed.query
            and not parsed.fragment
            and (parsed.port is None or 1 <= parsed.port <= 65535)
        )
    except (ValueError, TypeError):
        valid = False
    if not valid:
        raise ConfigurationError("Use a loopback HTTP(S) origin without credentials, path or query.")
    return value.rstrip("/")


def private_settings(path):
    """Read two literal assignments; never source a shell file or follow its symlink."""
    if os.name != "posix" or not hasattr(os, "O_NOFOLLOW"):
        raise ConfigurationError("These helpers require POSIX file permissions; use the Linux host.")
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except OSError:
        raise ConfigurationError("Cannot open private MCP settings; inspect the selected file.") from None
    with os.fdopen(fd, encoding="utf-8") as stream:
        info = os.fstat(stream.fileno())
        if (
            not stat.S_ISREG(info.st_mode)
            or info.st_uid != os.getuid()
            or stat.S_IMODE(info.st_mode) != 0o600
            or info.st_size > 16384
        ):
            raise ConfigurationError("MCP settings must be a small, user-owned regular file with mode 0600.")
        try:
            lines = stream.read(16385).splitlines()
        except UnicodeError:
            raise ConfigurationError("MCP settings must use UTF-8.") from None
    values = {}
    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        name, sep, raw = line.partition("=")
        if not sep or name not in ("KARAKEEP_API_ADDR", "KARAKEEP_API_KEY") or name in values:
            raise ConfigurationError("MCP settings require exactly the two documented assignments.")
        try:
            parts = shlex.split(raw, comments=True)
        except ValueError:
            raise ConfigurationError("Invalid quoting in MCP settings.") from None
        if len(parts) != 1 or not parts[0] or any(ord(c) < 32 for c in parts[0]):
            raise ConfigurationError("MCP settings contain an invalid value.")
        values[name] = parts[0]
    if set(values) != {"KARAKEEP_API_ADDR", "KARAKEEP_API_KEY"}:
        raise ConfigurationError("Both the API address and key are required.")
    values["KARAKEEP_API_ADDR"] = local_url(values["KARAKEEP_API_ADDR"])
    return values


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def get_json(address, route, key=None):
    """One bounded GET. Bypass proxies and reject redirects before sending credentials."""
    request = Request(local_url(address) + route, headers={"Accept": "application/json"})
    if key:
        request.add_header("Authorization", "Bearer " + key)
    opener = build_opener(ProxyHandler({}), NoRedirect())
    try:
        with opener.open(request, timeout=5) as response:
            status = response.status
            raw = response.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            return status, None
        try:
            return status, json.loads(raw)
        except (ValueError, UnicodeError):
            return status, None
    except HTTPError as error:
        code = error.code
        error.close()
        return code, None
    except (URLError, OSError, ValueError):
        return None, None
