---
name: grepai-repo-setup
description: Set up or diagnose GrepAI for one Git repository in an existing shared workspace. Use when the user asks to onboard a repository, check project registration and search, or diagnose provider, index, or MCP versus CLI access errors.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.3"
  internal: true
---

# GrepAI repository setup

## Goal

Make one Git repository searchable through an existing shared GrepAI workspace and verify the access route the user actually uses.

## When to use

Use for repository onboarding, a search readiness check, or a reported configuration, index, or connection failure.

## When not to use

Use ordinary GrepAI search for code discovery. Shared infrastructure provisioning and maintenance belong to the workspace owner, such as `greppy-workspace` where adopted. Recognize `code-reuse-workspace` as the legacy name used by existing deployments.

## Inputs to inspect

- Exact Git root (`git rev-parse --show-toplevel`) and linked worktree status (compare the resolved Git directory and common Git directory). Inspect the applicable repository guidance and working tree before setup.
- Available GrepAI MCP tools, CLI version (`grepai version`), installed help, and the configured workspace and owner. Inspect repository-local settings selectively and keep credentials out of output.

## Workflow

Select **setup** for explicit onboarding and **doctor** for health checks or failures. Announce the selected route. For a bare or ambiguous invocation, show both choices in that order and resolve the ambiguity before acting. An options request only shows the choices.

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

Doctor does not write repository guidance, configuration or indexes, register projects, start services, or run repairs. Setup preserves existing config and uses the current owner for any index work. Leave package installation, host configuration, index rebuilds, model migrations and wider indexing scope to their separately authorized workflows. Keep secrets and private source out of shared receipts.

## References

Use installed GrepAI help and exposed MCP tool schemas for current arguments. Consult the adopted workspace owner's local operations guidance for managed discovery, exclusions, and query formatting.

## Scripts

No bundled scripts. Use the existing Git and GrepAI tools.

## Output format

Report the finding, supporting evidence, working access route, unchecked items, and next step. Include any setup changes or pending registration. Offer `codegraph-ast-grep` when the user needs symbol, caller or structural evidence, and `karakeep-knowledge` when they want to consult or maintain approved knowledge. These are separate follow-ups. GrepAI onboarding grants neither graph setup nor knowledge publication.

## Completion criteria

Setup confirms the exact project registration, usable repository guidance and a verified project-scoped search, or reports the remaining prerequisite. Doctor provides the diagnosis and evidence without repairs. A verified search is a sample of current usability, not proof of full index freshness.

## Failure modes

Keep missing or excluded membership separate from inaccessible workspace metadata. Keep stale source matches, zero hits, wrong search mode, model mismatch and unreachable services separate. Never use one transport's failure as a verdict about another transport.
