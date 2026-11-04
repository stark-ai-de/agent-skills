---
name: greppy-workspace
description: Set up, diagnose, or maintain cross-repository code reuse with local grepai search, per-repository CodeGraph, ast-grep and private Karakeep records. Use when the user asks for a shared code-search workspace, automatic repository discovery, or bounded reuse-record maintenance. Not for refactoring source repositories or general knowledge ingestion.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.2.0"
  internal: true
---

# Greppy Workspace

## Goal

Find reusable code across actual local repositories and maintain source-bound private records through the existing knowledge owner.

## When to use

Use for shared semantic-search setup, its diagnosis, or authorized repository and reuse-record maintenance.

## When not to use

Do not use for source refactoring, arbitrary knowledge imports, remote search indexing or publication.

Select `setup`, `doctor`, or `maintain` from the user's intent and announce the authorized route. For a bare or ambiguous request, show all three in that order and ask which workflow to use. An options request only shows the choices.

## Inputs to inspect

Inspect the operating environment, actual Git roots, protected working trees, package/service managers, existing binaries and help, Codex configuration, and the installed `codegraph-ast-grep` and `karakeep-knowledge` skills. Verify an actual Git root with `git rev-parse --show-toplevel`, then load the latter and run its read-only `check --repo` at the first substantive repository work. An operations directory need not be a Git repository; skip that Git-specific check there. Do not invent credentials or treat `needs_setup` as permission to import code. A repository's general knowledge-adoption status is separate from this workspace's bounded Code-Reuse grant; inspect both scopes before diagnosing missing setup.

Use one private configuration based on `assets/workspace.example.json`. Resolve every placeholder during guided setup. Keep credentials in the Karakeep owner's credential loader, never in this configuration. This skill owns discovery, index orchestration and the assessment queue. Karakeep owns every remote record write, policy, lock, conflict and recovery receipt. Reference repositories supply source evidence. Use `grepai-repo-setup` for individual repository onboarding and diagnosis. An existing deployment may use the legacy `code-reuse-workspace` path in `skillRoot`, service units, or the completion hook. Preserve those references when operating the deployed workspace. Migrate the path as a separate rollout.

## Workflow

### setup

1. Follow `references/local-inference.md` and `references/setup.md`: inspect Windows/WSL, GPU/driver access, actual free resources and existing servers before selecting same-distribution or Windows-native Ollama. Adopt existing package/service owners; prove actual inference rather than inferring it from an installed driver. Start with a measured BGE-M3 pilot (1024 dimensions), ten predeclared retrieval cases, and server-side `OLLAMA_NO_CLOUD=1`. Keep the previous collection during a model migration.
2. Inventory actual Git roots with `python3 scripts/workspace.py discover --config /absolute/private/workspace.json`. Review exclusions, duplicate paths, linked worktrees and nested repositories. Keep the operations root and fixtures outside the productive corpus.
3. Resolve and integrate the dependencies in `references/integration.md` for the selected Codex context. Back up targeted runtime configuration and update its declarative source. Use `grepai mcp-serve --workspace <name>`; route CodeGraph with `projectPath`. Do not replace another notify hook silently.
4. Record the authorized roots, private list and bounded code-record grant with `karakeep-knowledge`. Its `codeRecords` extension is required; an older owner is not compatible. Use its normal policy validation and `inspect → plan → apply` protocol, never session records as a workaround.
5. Preview `python3 scripts/workspace.py setup --config /absolute/private/workspace.json`; after scope adoption, add `--apply`. Configure the supervised services and timers from `assets/` with resolved executable paths. No install/service changes are performed by the Python preview.
6. Qualify three representative repositories plus isolated fixture repositories using `references/qualification.md`. Verify actual tools, source lines, ignore behavior, updates/deletions, background execution, live Karakeep readback and unchanged reruns. Then expand the selected registry scope, wait for the complete initial watchloop and repeat doctor. Measure restart and an unchanged second run. Keep missing native Windows reboot evidence explicit.

### doctor

Run `python3 scripts/workspace.py doctor --config /absolute/private/workspace.json`. It performs read-only configuration, endpoint, service, queue and semantic-search probes. Read its evidence and the private receipts; reachability alone is not index freshness or a successful agent run. Use the CodeGraph owner's doctor procedure for each selected root; this command does not open/migrate graphs. Report stale/missing evidence and route repairs to setup or maintain. If the host sandbox denies loopback, service or journal access, obtain its normal permission for the same read-only probes. A sandbox denial alone does not prove that a local service or GPU is unavailable.

### maintain

Preview `python3 scripts/workspace.py maintain --config /absolute/private/workspace.json`. With the existing adopted scope, add `--apply` to discover repositories, reconcile membership/ignores, purge retired vector namespaces and run bounded record maintenance. `--discovery-only` skips record processing. The orchestrator serializes its own runs, and the owner serializes Karakeep writes across all collections on the account. A busy owner remains pending. Never steal its lock.

Agent completions enqueue repository identity and time only. Periodic maintenance hashes known sources, rechecks records in bounded batches, and assesses at most one eligible completion through the configured local Codex runner. It does not invoke an LLM per saved file. Read `references/records-and-operations.md` before enabling the runner, including provider disclosure and uncertain-write recovery. Use the supported existing Codex login/subscription when that is the adopted constraint; verify `codex login status` without extracting tokens. Do not substitute an OpenAI Platform key or proxy.

## Coding workflow after adoption

Before implementing, search the private Code-Reuse list and the configured grepai workspace. Use the query-instruction format qualified for the actual admitted corpus; if grepai does not add it, supply it explicitly in the query text. Recheck a pilot query-format choice after substantial corpus expansion. Inspect the best candidates in current source, with a refreshed per-repository CodeGraph and bounded ast-grep structural query. Report repository, file, symbol, exact lines, dependencies/license and adaptations. Save eligible records through the owner. After actual reuse, append the real adaptations and execution results; model assessment is neither human approval nor an executed test.

## Safety rules

The executable adapter supports Linux/POSIX, Python 3.10+ with PyYAML, Node 24+, Git, systemd user services, grepai 1.1.x, local Ollama and Qdrant. macOS, Windows-native, launchd and pgvector are not qualified adapters. Do not silently apply this systemd recipe there. WSL services run while the distribution is alive. Windows-native Ollama may be a local server for the Linux client; the orchestration adapter itself stays Linux/POSIX. Its loopback endpoint restriction does not automatically support Windows NAT host addresses.

## Output format

Report changed paths, backup locations, versions/provenance, commands, actual observed evidence, pending work and rollback. Separate deterministic tests, real local operation, real provider execution and undocumented assumptions. Do not claim every repository is indexed or continuously watched by CodeGraph merely because MCP registration succeeded.

## Scripts

Bundled scripts: `inference.py` (read-only inventory; preview or explicit `--apply` local model benchmark), `workspace.py` (preview/read-only commands; explicit `--apply` changes generated state and owned services), `records.mjs` (authorized owner-backed remote maintenance and optional bounded Codex execution). Tests and qualification criteria live in `skill-evals/greppy-workspace/` in the source repository.

## References

Read `references/local-inference.md` for hardware, server placement, models and measurement; `references/setup.md` for adoption and ignore semantics, `references/integration.md` for skills/MCP, `references/records-and-operations.md` for triggers/data flow/recovery, and `references/qualification.md` for evidence gates. Resolve templates under `assets/` against the actual host.

## Completion criteria

The selected workflow has concrete evidence: setup is adopted and qualified before rollout; doctor distinguishes observations from gaps; maintain records its bounded outcomes and pending items. Reference source and foreign configuration remain preserved. A fresh agent can use the documented configuration and commands.

## Failure modes

Missing credentials or an unadopted scope blocks dependent writes only. Lock contention remains pending. Source/managed-body conflicts require reassessment; uncertain creates require owner recovery. An unsupported platform or storage migration needs an explicit adapter decision. Report incomplete indexing and provider failures without declaring them passes.
