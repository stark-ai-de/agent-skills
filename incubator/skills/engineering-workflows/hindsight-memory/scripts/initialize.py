#!/usr/bin/env python3
"""Create local Hindsight credentials without placing secrets in Nix or Git."""

import argparse
import os
from pathlib import Path
import secrets
import shlex
import stat
import sys
from urllib.parse import urlsplit


def private_directory(path):
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
        raise ValueError("private directory permissions")


def read_key(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, encoding="utf-8") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
            raise ValueError("model key permissions")
        value = stream.read().strip()
    if not value or "\n" in value or "\r" in value:
        raise ValueError("model key")
    return value


def initialize(home, provider, model, base_url=None, key_file=None, embeddings="ollama", *, namespace="hindsight-greppy", embedding_model="bge-m3", accepted_http_base_url=None):
    home = Path(home)
    if not namespace or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in namespace):
        raise ValueError("namespace")
    config = home / ".config" / namespace
    private_directory(config)
    token = secrets.token_urlsafe(32)
    values = {
        "HINDSIGHT_API_TENANT_API_KEY": token,
        "HINDSIGHT_CP_DATAPLANE_API_KEY": token,
        "HINDSIGHT_CP_ACCESS_KEY": secrets.token_urlsafe(32),
        "HINDSIGHT_API_LLM_PROVIDER": provider,
        "HINDSIGHT_API_LLM_MODEL": model,
    }
    if embeddings == "ollama":
        values.update({
            "HINDSIGHT_API_EMBEDDINGS_PROVIDER": "openai",
            "HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL": "http://127.0.0.1:11434/v1",
            "HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL": embedding_model,
            "HINDSIGHT_API_EMBEDDINGS_OPENAI_API_KEY": "ollama",
            "HINDSIGHT_API_EMBEDDINGS_QUERY_PREFIX": ("Instruct: Given a query about software development, retrieve relevant documents. Query: " if embedding_model.startswith("qwen3-embedding") else ""),
        })
    elif embeddings == "bge-m3":
        values.update({"HINDSIGHT_API_EMBEDDINGS_PROVIDER": "local", "HINDSIGHT_API_EMBEDDINGS_LOCAL_MODEL": "BAAI/bge-m3", "HINDSIGHT_API_EMBEDDINGS_QUERY_PREFIX": ""})
    else:
        raise ValueError("embedding provider")
    if provider == "openai-responses":
        url = urlsplit(base_url or "")
        if ((url.scheme != "https" and not (url.scheme == "http" and base_url == accepted_http_base_url))
                or not url.hostname or url.username or url.password or url.query or url.fragment or not key_file):
            raise ValueError("model endpoint or key")
        values["HINDSIGHT_API_LLM_BASE_URL"] = base_url
        values["HINDSIGHT_API_LLM_API_KEY"] = read_key(key_file)
    elif provider == "openai-codex":
        values["HINDSIGHT_API_LLM_CODEX_HOME"] = "/home/hindsight/codex-auth"
    elif provider == "ollama":
        values["HINDSIGHT_API_LLM_BASE_URL"] = "http://127.0.0.1:11434/v1"
    else:
        raise ValueError("model provider")
    if not model or any(c in model for c in "\n\r"):
        raise ValueError("model")
    target = config / "runtime.env"
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            for key, value in values.items():
                stream.write(f"{key}={shlex.quote(value)}\n")
            stream.flush()
            os.fsync(stream.fileno())
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    return target


def main(accepted_http_base_url=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=("openai-responses", "openai-codex", "ollama"), required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--base-url")
    parser.add_argument("--key-file", type=Path)
    parser.add_argument("--embeddings", choices=("ollama", "bge-m3"), default="ollama")
    parser.add_argument("--namespace", default="hindsight-memory")
    parser.add_argument("--embedding-model", default="bge-m3")
    parser.add_argument("--accepted-http-base-url", help="Exact previously approved HTTP route; never an implicit transport exception")
    args = parser.parse_args()
    try:
        initialize(Path.home(), args.provider, args.model, args.base_url, args.key_file, args.embeddings, namespace=args.namespace, embedding_model=args.embedding_model, accepted_http_base_url=accepted_http_base_url or args.accepted_http_base_url)
    except (OSError, ValueError):
        print("Hindsight initialization failed; check private paths, selected provider, and existing configuration.", file=sys.stderr)
        return 1
    print("Private Hindsight configuration created. Qualify the model and embedding before activating the pilot.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
