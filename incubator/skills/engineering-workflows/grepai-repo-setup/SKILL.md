---
name: grepai-repo-setup
description: Set up or diagnose GrepAI for one Git repository in an existing shared workspace. Use when the user asks to onboard a repository, check project registration and search, or diagnose provider, index, or MCP versus CLI access errors.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.1"
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
5. Run the bounded search check below. If vectors are pending, leave indexing with the existing owner and report setup as pending verification.

### Doctor

1. Resolve the workspace and exact project. Report tool availability, membership and available index evidence separately. Use workspace index status if useful. Symbol availability and watcher liveness do not prove vector coverage or freshness.
2. In Codex, prefer `grepai_search` with `workspace` and `projects` set to the resolved workspace and single project ID. Omit the local `root` override. Use one non-sensitive query about a known indexed source area, the workspace's qualified query format if specified, compact results and a limit of 1–3. Check a returned path and line against current source.
3. If the CLI route needs diagnosis, use its installed help and a bounded `grepai search --workspace <workspace> --project <project-id> --json --compact -n 1 <query>` in that context. Compare MCP, sandbox CLI and host CLI separately. Use the normal host permission route for an equivalent read-only probe when authorized. If host evidence is unavailable, leave host access unverified.
4. Classify the observed failure. Local mode with an empty provider calls for an explicit workspace search. A sandbox loopback refusal describes that execution context. A reachable provider can still reject the configured model or expose incompatible index metadata. Report the specific evidence and refer any repairs to the owner. No hits from one query leave search readiness unverified.

## Safety rules

Doctor does not write repository guidance, configuration or indexes, register projects, start services, or run repairs. Setup preserves existing config and uses the current owner for any index work. Leave package installation, host configuration, index rebuilds, model migrations and wider indexing scope to their separately authorized workflows. Keep secrets and private source out of shared receipts.

## References

Use installed GrepAI help and exposed MCP tool schemas for current arguments. Consult the adopted workspace owner's local operations guidance for managed discovery, exclusions, and query formatting.

## Scripts

No bundled scripts. Use the existing Git and GrepAI tools.

## Output format

Report the finding, supporting evidence, working access route, unchecked items, and next step. Include any setup changes or pending registration. If useful, suggest `codegraph-ast-grep` as a separate follow-up for symbol, caller and structural evidence. Do not invoke it automatically.

## Completion criteria

Setup confirms the exact project registration, usable repository guidance and a verified project-scoped search, or reports the remaining prerequisite. Doctor provides the diagnosis and evidence without repairs. A verified search is a sample of current usability, not proof of full index freshness.

## Failure modes

Keep missing or excluded membership separate from inaccessible workspace metadata. Keep stale source matches, zero hits, wrong search mode, model mismatch and unreachable services separate. Never use one transport's failure as a verdict about another transport.
