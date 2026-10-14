"""Inspect selected local paths and read API readiness; never install or repair anything."""

import argparse
import json
from pathlib import Path

from runtime import ConfigurationError, default_paths, get_json, local_url, private_settings


def inspect(config_dir, data_dir, address=None, network=True):
    evidence = config_dir.exists() or config_dir.is_symlink() or data_dir.exists() or data_dir.is_symlink()
    result = {"scope": "selected paths and endpoint only", "installation_evidence": evidence}
    env_file = config_dir / "mcp.env"
    settings = None
    try:
        if env_file.exists() or env_file.is_symlink():
            settings = private_settings(env_file)
        target = local_url(address or (settings or {}).get("KARAKEEP_API_ADDR", "http://localhost:3000"))
        if settings and address and target != settings["KARAKEEP_API_ADDR"]:
            raise ConfigurationError("Endpoint override differs from the key's configured origin.")
    except ConfigurationError as error:
        return dict(result, state="configuration_error", detail=str(error))
    result.update(endpoint=target, credential_file_valid=settings is not None)
    if not network:
        return dict(result, state="configured_unverified" if evidence else "not_detected", network="not_checked")
    if not settings:
        status, body = get_json(target, "/api/health")
        if status == 200 and isinstance(body, dict):
            state = "authentication_required"
        elif status is not None:
            state = "endpoint_unverified"
        else:
            state = "configured_unreachable" if evidence else "not_detected"
        return dict(result, state=state, http_status=status)
    status, body = get_json(target, "/api/v1/bookmarks?limit=1&includeContent=false", settings["KARAKEEP_API_KEY"])
    if status == 200 and isinstance(body, dict) and isinstance(body.get("bookmarks"), list):
        return dict(result, state="api_readable", http_status=status, sample_available=bool(body["bookmarks"]), mcp="not_checked", key_scopes="not_verified")
    state = {401: "authentication_failed", 403: "scope_insufficient"}.get(status)
    return dict(result, state=state or ("configured_unreachable" if status is None else "endpoint_unverified"), http_status=status)


def main():
    config, data, _ = default_paths()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config-dir", type=Path, default=config)
    parser.add_argument("--data-dir", type=Path, default=data)
    parser.add_argument("--url")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    result = inspect(args.config_dir, args.data_dir, args.url, not args.offline)
    print(json.dumps(result, indent=2))
    return 0 if result["state"] in ("api_readable", "configured_unverified", "not_detected") else 1


if __name__ == "__main__":
    raise SystemExit(main())
