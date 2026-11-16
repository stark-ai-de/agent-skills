---
name: greppy-workspace
description: Set up, diagnose, or maintain cross-repository code reuse with shared local GrepAI search and optional source-backed Karakeep records. Use when the user asks for a shared code-search workspace, automatic repository discovery, or bounded reuse-record maintenance. Not for refactoring source repositories or general knowledge ingestion.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.3.1"
  internal: true
---

# Greppy Workspace

## Goal

- Find reusable code across actual local repositories and maintain source-bound private records through the existing knowledge owner.

## When to use

- Use for shared semantic-search setup, its diagnosis, or authorized repository and reuse-record maintenance.

## When not to use

- Do not use for source refactoring, arbitrary knowledge imports, remote search indexing or publication.

## Workflow selection

| Workflow   | Outcome                                                             |
| ---------- | ------------------------------------------------------------------- |
| `setup`    | Adopt and qualify shared search and selected companion integrations |
| `doctor`   | Inspect combined readiness or the existing shared workspace         |
| `maintain` | Preview or apply bounded maintenance within adopted scope           |

- Select `setup`, `doctor`, or `maintain` from the user's intent and announce the authorized route.
- For a bare or ambiguous request, show all three in that order and ask which workflow to use.
- An options request only shows the choices.

## Inputs to inspect

- Inspect the host, actual Git roots, protected working trees, package and service owners, GrepAI, and the selected agent context.
- Shared search works independently of its companions.
- Load only the companion needed for the requested capability: `codegraph-ast-grep` owns per-root graph and structural tooling, and `karakeep-knowledge` owns knowledge access and writes.
- Search registration, graph indexing, project-document sync, and bounded code-record publication each have their own scope.
- The Karakeep project check and the collection's `codeRecords` grant answer different questions.
- A missing project policy does not invalidate an adopted collection grant.

- Use one private configuration based on `assets/workspace.example.json`.
- Resolve every placeholder during guided setup.
- Keep credentials in the Karakeep owner's credential loader, never in this configuration.
- The installed Greppy package owns discovery, index orchestration and the assessment queue.
- This skill is its optional integration guide; component skills work independently without Greppy.
- Karakeep owns every remote record write, policy, lock, conflict and recovery receipt.
- Reference repositories supply source evidence.
- Use `grepai-repo-setup` for individual repository onboarding and diagnosis.
- An existing deployment may use the legacy `code-reuse-workspace` path in `skillRoot`, service units, or the completion hook.
- Preserve those references when operating the deployed workspace.
- Migrate the path as a separate rollout.

## Workflow

### setup

- Install a reviewed immutable `greppy-workspace` package through the platform owner first; verify `greppy --version`.
- Python 3.11+ with PyYAML and Node 24.18+ are required.
- No service may depend on a development checkout.
- The component skills remain independently installable.

1. Follow `references/local-inference.md` and `references/setup.md`: inspect Windows/WSL, GPU/driver access, actual free resources and existing servers before selecting same-distribution or Windows-native Ollama. Adopt existing package/service owners; prove actual inference rather than inferring it from an installed driver. Start with a measured BGE-M3 pilot (1024 dimensions), ten predeclared retrieval cases, and server-side `OLLAMA_NO_CLOUD=1`. Keep the previous collection during a model migration.
2. Inventory actual Git roots with `greppy discover --config /absolute/private/workspace.json`. Review exclusions, duplicate paths, linked worktrees and nested repositories. Keep the operations root and fixtures outside the productive corpus.
3. Resolve and integrate the dependencies in `references/integration.md` for the selected client. Back up targeted runtime configuration and update its declarative source. Use `grepai mcp-serve --workspace <name>`. The watcher needs no completion hook; the optional assessor uses one supported producer. Preserve unrelated hooks. Route separately authorized companion setup through its owner.
4. If record maintenance is requested, resolve a compatible `karakeep-knowledge` installation and adopt the exact roots, private list, and bounded `codeRecords` grant through that owner. Use its normal policy validation and `inspect → plan → apply` protocol. Enable `recordsCommand` only for this scope.
5. Preview `greppy setup --config /absolute/private/workspace.json`; after scope adoption, add `--apply`. Configure the supervised services and timers from `assets/` with resolved executable paths. No install/service changes are performed by the Python preview.
6. Qualify three representative repositories plus isolated fixture repositories using `references/qualification.md`. Verify search, source lines, ignore behavior, updates/deletions and unchanged reruns. Qualify companion evidence and background record execution only for the adopted capabilities. Then expand the selected registry scope, wait for the complete initial watchloop and repeat doctor. Measure restart and an unchanged second run. Keep missing native Windows reboot evidence explicit.

### doctor

| View                            | Command                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Combined readiness              | `greppy doctor --config /absolute/private/stack.json --project /absolute/project --json` |
| Loopback status and guided plan | `greppy dashboard --config /absolute/private/stack.json --project /absolute/project`     |
| Existing shared workspace       | `greppy workspace-doctor --config /absolute/private/workspace.json`                      |

- Its component pointers are separate from shared workspace configuration.
- It verifies installation/configuration/health and current owner grants; client usability and index freshness need current qualified evidence.
- It never installs, repairs, indexes or invokes models.
- Memory remains project opt-in through `hindsight-memory` or `karakeep-knowledge`.
- Local index changes invalidate matching readiness receipts; shared Qdrant freshness remains unverified until its generation adapter is qualified.

- Run `greppy workspace-doctor --config /absolute/private/workspace.json`.
- Report shared search, analysis tool availability, Karakeep account reads, and record maintenance separately.
- The summary covers search and configured record maintenance.
- Doctor checks search infrastructure through metadata and service evidence.
- It leaves query usability and full index freshness unverified.
- A failed maintenance service can supersede a successful receipt.
- Separate account connectivity from declared write authority and project-document readiness.
- Graph freshness is unchecked.
- Offer the CodeGraph owner's doctor for the selected root, honoring its approval gate before any probe that could open or migrate a graph.
- If sandbox isolation blocks local probes, report the access limitation and use the normal permission route for equivalent read-only checks.

### maintain

- Preview `greppy maintain --config /absolute/private/workspace.json`.
- With the existing adopted scope, add `--apply` to discover repositories, reconcile membership/ignores, purge retired vector namespaces and run bounded record maintenance.
- `--discovery-only` skips record processing.
- The orchestrator serializes its own runs, and the owner serializes Karakeep writes across all collections on the account.
- A busy owner remains pending.
- Never steal its lock.

- Agent completions enqueue repository identity and time only.
- Periodic maintenance hashes known sources, rechecks records in bounded batches, and assesses at most one eligible completion through the configured local Codex runner.
- It does not invoke an LLM per saved file.
- Read `references/records-and-operations.md` before enabling the runner, including provider disclosure and uncertain-write recovery.
- Use the supported existing Codex login/subscription when that is the adopted constraint; verify `codex login status` without extracting tokens.
- Do not substitute an OpenAI Platform key or proxy.

## Coding workflow after adoption

- Use the repository's existing guidance to search GrepAI for candidates and consult relevant approved knowledge through Karakeep when available.
- Apply the workspace's qualified query format.
- Verify promising matches in current source, using a ready per-root graph for relationships and a bounded ast-grep query for syntax when useful.
- Route missing or stale graph setup to its owner.
- Report the exact repository, file, symbol, lines, dependencies, license and required adaptations.
- Test the actual adaptation and record its observed results.
- Save eligible results only through the adopted knowledge owner.
- The owning setup workflows persist concise, nonduplicated guidance; routine coding uses that guidance directly.
- A model assessment carries neither human approval nor executed-test evidence.

## Safety rules

- The packaged runtime requires Linux/POSIX, Python 3.11+ with PyYAML and Node 24.18+; the shared orchestration adapter uses Git, systemd user services, qualified grepai 1.1.x, local Ollama and Qdrant.
- macOS, Windows-native, launchd and pgvector are not qualified adapters.
- Do not silently apply this systemd recipe there.
- WSL services run while the distribution is alive.
- Windows-native Ollama may be a local server for the Linux client; the orchestration adapter itself stays Linux/POSIX.
- Its loopback endpoint restriction does not automatically support Windows NAT host addresses.

## Output format

- Report changed paths, backup locations, versions/provenance, commands, actual observed evidence, pending work and rollback.
- Separate deterministic tests, real local operation, real provider execution and undocumented assumptions.
- Do not claim every repository is indexed or continuously watched by CodeGraph merely because MCP registration succeeded.

## Scripts

- Bundled scripts: `inference.py` (read-only inventory; preview or explicit `--apply` local model benchmark), `workspace.py` (preview/read-only commands; explicit `--apply` changes generated state and owned services), `records.mjs` (authorized owner-backed remote maintenance and optional bounded Codex execution).
- The scripts are compatibility launchers, with no independent orchestration implementation.
- Runtime tests and the candidate assessment schema are canonical in the Greppy repository.
- See `skill-evals/greppy-workspace/README.md` for ownership and launcher checks.

## References

- Read `references/local-inference.md` for hardware, server placement, models and measurement; `references/setup.md` for adoption and ignore semantics, `references/integration.md` for skills/MCP, `references/records-and-operations.md` for triggers/data flow/recovery, and `references/qualification.md` for evidence gates.
- Resolve templates under `assets/` against the actual host.

## Completion criteria

- The selected workflow has concrete evidence: setup is adopted and qualified before rollout; doctor distinguishes observations from gaps; maintain records its bounded outcomes and pending items.
- Reference source and foreign configuration remain preserved.
- A fresh agent can use the documented configuration and commands.

## Failure modes

- Missing credentials or an unadopted scope blocks dependent writes only.
- Lock contention remains pending.
- Source/managed-body conflicts require reassessment; uncertain creates require owner recovery.
- An unsupported platform or storage migration needs an explicit adapter decision.
- Report incomplete indexing and provider failures without declaring them passes.
