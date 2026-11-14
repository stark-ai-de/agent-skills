---
name: grepai-repo-setup
description: Set up or diagnose GrepAI for one Git repository, standalone on a fresh Linux machine or within an existing shared workspace. Use when the user requests local semantic search, repository onboarding, or diagnosis of provider, index and MCP versus CLI access errors.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.2.0"
  internal: true
---

# GrepAI repository setup

## Goal

- Make one Git repository searchable independently or through its adopted shared GrepAI workspace, and verify the access route the user actually uses.
- Standalone operation requires neither Greppy nor another skill.

## When to use

- Use for repository onboarding, a search readiness check, or a reported configuration, index, or connection failure.

## When not to use

- Use ordinary GrepAI search for code discovery.
- Shared infrastructure provisioning and maintenance belong to the workspace owner, such as `greppy-workspace` where adopted.
- Recognize `code-reuse-workspace` as the legacy name used by existing deployments.

## Inputs to inspect

- Exact Git root (`git rev-parse --show-toplevel`) and linked worktree status (compare the resolved Git directory and common Git directory). Inspect the applicable repository guidance and working tree before setup.
- Available GrepAI MCP tools, CLI version (`grepai version`), installed help, and the configured workspace and owner. Inspect repository-local settings selectively and keep credentials out of output.

## Workflow

| Requested outcome                         | Route            | Configuration owner                                            |
| ----------------------------------------- | ---------------- | -------------------------------------------------------------- |
| Search in one new repository              | Standalone setup | Native repository configuration and host package/service owner |
| Add a repository to adopted shared search | Shared setup     | Existing workspace owner                                       |
| Understand a failure or current status    | Doctor           | Existing owner; diagnosis only                                 |

- Select **setup** for explicit onboarding and **doctor** for health checks or failures.
- Announce the selected route.
- For a bare or ambiguous invocation, show both choices in that order and resolve the ambiguity before acting.
- An options request only shows the choices.

- First identify the adopted owner.
- An exact registration in a managed shared workspace takes precedence over missing local provider settings.
- If there is no shared owner and the user wants one repository, use **standalone setup** below.
- Do not provision a shared stack just to make this skill work.

### Standalone setup

1. Follow [fresh Linux setup](references/standalone.md) to install the pinned
   native CLI through the package owner and adopt local Ollama. Use native GOB
   storage; no Qdrant, Greppy or personal dotfiles are required. Existing model,
   collection, services and configuration remain with their current owners.
2. Preview `python3 scripts/standalone.py --repo /absolute/root`. With setup
   authority, add `--apply`. It uses native initialization only for a new config,
   sets the BGE-M3 dimension and additive private/generated-file exclusions, and
   leaves existing configurations untouched. It never starts a watcher or model.
3. Verify the model digest and actual 1024-dimensional output before authorized
   indexing. Review exclusions, nested roots and symlinks; newly created file
   symlinks are an upstream limitation. Start only the adopted root's watcher.
4. Add the documented root-bound native MCP entry through the client owner and
   verify a fresh client session. Qualify retrieval, source lines, changes,
   deletions and exclusions in a disposable fixture before indexing private code.
   A model stub qualifies the plumbing only, not semantic quality.
5. Reuse existing guidance and setup on repeat; do not run init over an existing
   configuration. For standalone doctor, inspect files and versions first. Apply
   the same nonmutating-probe gate below; no workspace registration is expected.

### Resolve workspace and project

1. Use the requested or adopted workspace. Discover workspaces and projects through MCP, or use `grepai workspace list` and `grepai workspace show <workspace>`. Match the resolved registered path to the exact Git root. Read the project ID from that match. If multiple candidates remain, ask which to use. A transport error leaves membership unverified.
2. Check whether the owner excludes the root or linked worktree. Never substitute the main checkout as proof about a linked worktree. A repo-local `.grepai/config.yaml` may hold ignore or scanner settings. In workspace mode, missing local configuration or empty local provider, model and backend fields alone are not defects.

### Setup

1. Reuse an existing workspace and its tools. If the shared infrastructure is missing, identify the prerequisite and refer setup to the workspace owner.
2. If the exact root is absent and eligible, use the managed owner's supported discovery or registration path. If discovery is automatic, recheck once and report pending if it has not registered the root. Do not add entries directly to a managed workspace or run broad reconciliation from a repo setup request.
3. For an unmanaged workspace, inspect its policy and the installed `grepai workspace add --help` before registering the authorized exact root with `grepai workspace add <workspace> <absolute-root>`. Respect exclusions and the configured data destination. Re-read membership after success or an uncertain result. Use the actual assigned ID. An existing exact registration is a no-op.
4. Update the applicable repository guidance in place. Document the workspace, how to look up the exact project ID, the MCP search arguments, and the CLI `--workspace` and `--project` flags. Reuse equivalent guidance and preserve unrelated edits. When policy or registration blocks setup, report the prerequisite instead of writing instructions that claim readiness.
5. Check membership and available index metadata. Use the gated search check below only when the exact access route is verified non-mutating. Otherwise report search as pending verification and route indexing to the workspace owner.

### Doctor

1. Resolve the workspace and exact project. Inspect configuration, registered paths, index metadata, and provider and watcher status through known read-only routes. Symbol availability and watcher liveness do not establish vector freshness.
2. Treat each MCP, sandbox CLI and host CLI route separately. Before an active search, verify that the installed version, effective backend and permissions prevent store initialization, schema migrations, index changes and local persistent writes. GrepAI workspace search in qualified 1.1.x and observed 1.2.0 can initialize Qdrant or PostgreSQL. A successful collection GET or a small query limit does not establish safety. If the route is unverified or read-only access rejects initialization, skip the search and report its readiness as unverified. Route initialization and repairs to the workspace owner.
3. For a proven non-mutating route only, use a non-sensitive query with a limit of 1–3. Select the exact workspace and project ID with MCP `workspace`/`projects` or CLI `--workspace`/`--project`. Omit MCP `root` overrides. Compare a returned path and line with the current source. Local-mode provider errors and sandbox loopback refusal are separate from host search readiness.

## Safety rules

- Doctor does not write repository guidance, configuration or indexes, register projects, start services, or run repairs.
- Setup preserves existing config and uses the current owner for installation and indexing within the requested scope.
- A health-check request grants neither installation nor indexing.
- Model migrations and wider indexing need their own scope.
- Keep secrets and private source out of shared receipts.

## References

- Use [fresh Linux setup](references/standalone.md), installed GrepAI help and exposed MCP tool schemas for current arguments.
- Consult the adopted workspace owner's local operations guidance for managed discovery, exclusions, and query formatting.

## Scripts

- `scripts/standalone.py` previews fresh local configuration; `--apply` invokes native initialization and hardens only that new config.
- It uses Python 3.11+ and PyYAML.
- All installation, indexing, MCP and shared-workspace operations use native tools.

## Output format

- Report the finding, supporting evidence, working access route, unchecked items, and next step.
- Include any setup changes or pending registration.
- Offer `codegraph-ast-grep` when the user needs symbol, caller or structural evidence, and `karakeep-knowledge` when they want to consult or maintain approved knowledge.
- These are separate follow-ups.
- GrepAI onboarding grants neither graph setup nor knowledge publication.

## Completion criteria

- Standalone setup confirms the exact-root native configuration, usable repository guidance and verified project-scoped search, or reports the remaining prerequisite.
- Shared setup additionally confirms the exact project registration; standalone setup needs no workspace registration.
- Doctor provides the diagnosis and evidence without repairs.
- A verified search is a sample of current usability, not proof of full index freshness.

## Failure modes

- Keep missing or excluded membership separate from inaccessible workspace metadata.
- Keep stale source matches, zero hits, wrong search mode, model mismatch and unreachable services separate.
- Never use one transport's failure as a verdict about another transport.
