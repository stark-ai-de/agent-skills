# Script inventory and side effects

Read the applicable entry before running a helper. Script paths are relative to the selected installed skill directory.

- `scripts/jev_hooks.py`: explicit hook `install`/`uninstall` mutate the selected host configuration and private ownership state; `status` and `--dry-run` are read-only; `render` prints a repository-policy fragment without accessing user configuration or ownership state. Embeds static guidance; no provider access, dependency installation or trust changes.
- `scripts/hook_catalog.py`: read-only consistency check for a private current-session catalog sidecar; no discovery, credentials, network, cache or host-attestation claim.
- `scripts/jev_advisor.py`: recommendation client; network access only for a fresh requested recommendation. `--output` writes the requested local result file; `--cache-dir` opts in to decision-cache writes; `--index-cache-dir` separately enables local index-cache writes, including during offline inspection.
- `scripts/retrieval.py`: deterministic candidate retrieval, used by the client. No network or installation.
- `scripts/decision_cache.py`: private, bounded cache used only when explicitly configured. Stores decisions without query text, provider payloads or credentials.
- `scripts/index_cache.py`: bounded session-owned lexical-index reuse plus an optional private disk cache; fresh-index fallback on unavailable reuse.
- `scripts/routing_metadata.py`: validates optional public applicability guidance and creates bounded model-card text.
- `scripts/https_transport.py`: verified HTTPS with session-scoped connection reuse, bounded responses, proxy fallback and no automatic request replay.
- `scripts/jev_session.py`: optional owner-process Python/NDJSON interface; reads each task and catalog from its caller and writes bounded advisory IDs to stdout. Requires fresh inventory; caches derived search data, never decisions or inventory authority. No listener or host configuration changes.
