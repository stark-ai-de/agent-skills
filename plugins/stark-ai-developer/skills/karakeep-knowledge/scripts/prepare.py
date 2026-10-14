"""Prepare a NEW local stack. Dry-run by default; --apply creates private files only."""

import argparse
import json
import os
from pathlib import Path
import secrets
import sys

from runtime import ConfigurationError, default_paths


ASSETS = Path(__file__).resolve().parent.parent / "assets"


def validate_roots(roots, port):
    if os.name != "posix":
        raise ConfigurationError("Prepare this stack from its Linux/POSIX execution environment.")
    if not 1024 <= port <= 65535:
        raise ConfigurationError("Choose an unprivileged port from 1024 through 65535.")
    for root in roots:
        if not root.is_absolute() or ".." in root.parts or any(c in str(root) for c in ("\n", "\r", "$")):
            raise ConfigurationError("Use absolute paths without parent traversal, newlines or Compose interpolation.")
        if root == Path.home() or str(root).startswith(("/nix/store/", "/mnt/")):
            raise ConfigurationError("Select dedicated persistent directories on the native Linux filesystem.")
        if any(p.is_symlink() for p in (root, *root.parents)):
            raise ConfigurationError("Refusing symlinked setup paths; inspect the existing installation.")
        if root.exists():
            raise ConfigurationError("A target already exists. Inspect/adopt it; preparation never replaces existing state.")
    for index, root in enumerate(roots):
        if any(root == other or root in other.parents or other in root.parents for other in roots[index + 1:]):
            raise ConfigurationError("Configuration, data and backup roots must be separate directories.")


def render_compose(config, data, port):
    template = json.loads((ASSETS / "compose.template.json").read_text())
    replacements = {"@CONFIG@": str(config), "@DATA@": str(data), "@PORT@": str(port)}

    def replace(value):
        if isinstance(value, dict):
            return {key: replace(item) for key, item in value.items()}
        if isinstance(value, list):
            return [replace(item) for item in value]
        if isinstance(value, str):
            for token, replacement in replacements.items():
                value = value.replace(token, replacement)
        return value

    return replace(template)


def write_private(path, text):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as stream:
        stream.write(text)


def prepare(config, data, state, port=3000, apply=False):
    roots = (config, data, state)
    validate_roots(roots, port)
    compose = render_compose(config, data, port)
    if not apply:
        return {"state": "dry_run", "roots": [str(p) for p in roots], "port": port, "writes": False}
    # Directory and file exclusive creation refuses a second concurrent preparer.
    old_mask = os.umask(0o077)
    try:
        for root in roots:
            root.mkdir(parents=True, mode=0o700, exist_ok=False)
            write_private(root / ".gitignore", "*\n")
        for root in (data / "data", data / "meilisearch", state / "backups"):
            root.mkdir(mode=0o700)
        master = secrets.token_urlsafe(48)
        settings = {
            "NEXTAUTH_URL": f"http://localhost:{port}",
            "NEXTAUTH_SECRET": secrets.token_urlsafe(48),
            "MEILI_MASTER_KEY": master,
            "DISABLE_SIGNUPS": "false",
            "EMAIL_VERIFICATION_REQUIRED": "false",
            "DB_WAL_MODE": "true",
            "CRAWLER_STORE_SCREENSHOT": "true",
            "CRAWLER_FULL_PAGE_ARCHIVE": "true",
            "CRAWLER_VIDEO_DOWNLOAD": "false",
            "INFERENCE_ENABLE_AUTO_TAGGING": "false",
            "INFERENCE_ENABLE_AUTO_SUMMARIZATION": "false",
            "EMBEDDING_ENABLE_AUTO_INDEXING": "false",
            "SEMANTIC_SEARCH_ENABLED": "false",
            "LOG_LEVEL": "warn",
        }
        write_private(config / "karakeep.env", "".join(f"{k}={v}\n" for k, v in settings.items()))
        write_private(config / "meilisearch.env", f"MEILI_MASTER_KEY={master}\n")
        write_private(config / "compose.json", json.dumps(compose, indent=2) + "\n")
    finally:
        os.umask(old_mask)
    return {"state": "prepared", "started": False, "account_created": False, "mcp_connected": False}


def main():
    config, data, state = default_paths()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config-dir", type=Path, default=config)
    parser.add_argument("--data-dir", type=Path, default=data)
    parser.add_argument("--state-dir", type=Path, default=state)
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--apply", action="store_true", help="Create files after user-authorized setup and inspection.")
    args = parser.parse_args()
    try:
        result = prepare(args.config_dir, args.data_dir, args.state_dir, args.port, args.apply)
    except (ConfigurationError, OSError) as error:
        message = str(error) if isinstance(error, ConfigurationError) else "Preparation failed; inspect partial state before recovery. Nothing was overwritten."
        print(message, file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
