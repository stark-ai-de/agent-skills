---
name: claude-memory-curator
description: Audit and safely curate Claude Code instructions, rules, auto memory, and memory settings. Use when reviewing stale or misplaced Claude Code context, not Claude app memory or API memory stores.
license: Apache-2.0
compatibility: Designed for Claude Code and Claude Code skills. Works in other agents when inspecting Claude Code instruction files, settings, rules, and auto-memory markdown stores.
metadata:
  author: stark-ai-de
  category: claude-operations
  version: "0.2.2"
---

# Claude Memory Curator

## Goal

Audit Claude Code durable context as user-owned agent state: expose stale, unsafe, duplicated, over-broad, conflicting, misplaced, or unenforceable entries; propose better destinations; and route review, planning, persistence, and cleanup through one explicit contract.

Keep the subject scoped to Claude Code surfaces: `CLAUDE.md`, `CLAUDE.local.md`, conditionally loaded `AGENTS.md`, `.claude/rules/`, user-level Claude rules, settings, hooks, managed policy evidence, and auto memory files. Do not treat this as a Codex, Cursor, Claude app, or Anthropic API Memory Stores curator.

## When to use

- Use for review, placement, planning, or cleanup of the Claude Code durable surfaces named in the description.
- Use when those surfaces are stale, conflicting, sensitive, over-broad, ignored, or causing Claude to reuse old guidance.

## When not to use

- Do not use for Codex, Cursor, Claude web/app, Anthropic API Memory Stores, generic prompt engineering, or repo-doc cleanup without Claude durable context.
- Keep review requests read-only. Treat managed policy, including `/etc/claude-code/CLAUDE.md` and `managed-settings.json`, as read-only unless exact edit authority is explicit.

## Workflow selection

Expose all eight workflows in this stable order, compactly when intent is clear. Recommend the route matching the requested outcome and delivery; for a bare invocation recommend `review-chat` while asking the user to choose:

| Workflow                | Delivery and result                                                          |
| ----------------------- | ---------------------------------------------------------------------------- |
| `plan-run-cleanup-file` | One record: review, approved plan, backup, cleanup, verification.            |
| `review-chat`           | Chat: read-only review and recommendations.                                  |
| `review-file`           | One record: read-only review and recommendations.                            |
| `cleanup-chat`          | Chat and backup: review, high-confidence atomic cleanup, verification.       |
| `cleanup-file`          | One record and backup: review, high-confidence atomic cleanup, verification. |
| `plan-cleanup-chat`     | Chat: review and approved plan; no cleanup.                                  |
| `plan-cleanup-file`     | One record: review and approved plan; no cleanup.                            |
| `plan-run-cleanup-chat` | Chat and backup: review, approved plan, cleanup, verification.               |

Route from intent instead of adding an `auto` workflow:

- Direct review defaults to `review-chat`; explicit persistence selects `review-file`.
- Explicit cleanup without a delivery preference selects `plan-run-cleanup-file`.
- A clear direct request may select another matching route when delivery and execution intent are explicit.
- Agent-initiated activation may select only a relevant read-only route. Use `review-file` only when the existing task already requests persistence; never infer cleanup.
- A bare invocation, conflicting cues, or ambiguity about review versus cleanup, chat versus file, execution, target paths, or mutation authority exposes the table and asks the user to choose.
- A mutating route may be selected only when the user already requested cleanup of the identified Claude context scope.

Before substantive inspection, disclose the complete finite options once and state `Selected`, `Reason`, target paths, write scope, expected artifacts, protected state, Plan-mode capability, and unresolved approvals. Reuse facts and exact authority already established in the task; combine known fields into a short announcement. If selection is unambiguous, announce it and proceed. If it is ambiguous, stop before inventory and ask only the unresolved choice. Do not repeat the selector or ask for an unchanged selection again.

Workflow selection does not authorize whole-file deletion, destructive recovery, managed-policy edits, paid or external actions, deployment, publication, or scope expansion.

## Inputs to inspect

- When `AGENTS.md` is relevant, read `references/context-surface-anatomy.md`. Inventory presence separately from effective loading: confirm Claude version, provider/feature availability, settings, hook/plugin restrictions, and session loading evidence. Keep a working `@AGENTS.md` import for older or restricted hosts.
- Resolve the repo, Claude home, configured auto-memory directory, and only the applicable project/user instruction, rule, setting, hook, managed-policy, and memory surfaces.
- Inspect current repository evidence only as needed to verify a disputed claim.
- Load the placement, classification, conflict, enforcement, and safe-editing references below only when their decision is active. Load the report or plan asset whenever producing that artifact.

## Workflow

Every route applies the same review quality to the explicitly requested scope before planning or cleanup. A request about one file or claim does not authorize inspecting the entire store: use targeted reads instead of whole-root inventory/scanner commands, and consult other evidence only to resolve an in-scope conflict. Delivery never reduces review quality:

1. Resolve the selected route, target repo, Claude home, auto-memory path, persistence path when applicable, and protected state.
2. Inventory Claude context without dumping contents:

   ```bash
   node scripts/inventory-claude-memory.mjs --repo .
   ```

   Add `--claude-home PATH` or `--memory-dir PATH` when the user provides non-default locations. Use `--json` when structured evidence is useful.

3. Run the redacted risk scanner when looking for sensitive, stale, broad, local, repo-specific, ignored, or conflict-prone entries:

   ```bash
   node scripts/scan-claude-memory-risks.mjs --repo . --json
   ```

   Exit code `1` means findings were found, not that the scan failed. Summarize counts and highest-signal redacted findings instead of pasting the full payload.

4. Parse `.claude/rules/**/*.md` frontmatter for `paths` so path-scoped guidance is not treated like always-loaded guidance.
5. Inspect visible settings for `autoMemoryEnabled`, `autoMemoryDirectory`, `claudeMdExcludes`, permission rules, and hooks when they affect placement.
6. Treat managed policy files and managed settings as higher-precedence read-only evidence by default.
7. Treat `MEMORY.md` as the auto-memory entrypoint. Treat topic files as on-demand detail unless the user asks to audit the whole memory directory.
8. Read context files in bounded chunks and redact sensitive values.
9. Extract one atomic claim per row. Split compound entries before classification.
10. Verify disputed claims against only the repo files needed for the dispute. Load `references/conflict-resolution.md` when precedence is unclear.
11. Assign exactly one primary classification per atomic claim: `KEEP`, `KEEP BUT REWRITE`, `MOVE TO CLAUDE.md`, `MOVE TO CLAUDE.local.md`, `MOVE TO CLAUDE RULE`, `MOVE TO AUTO MEMORY TOPIC`, `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, `MOVE TO SKILL`, `MOVE TO SETTINGS`, `MOVE TO HOOK`, `MOVE TO MANAGED POLICY`, `DELETE`, or `ASK USER`.
12. Tag high-risk entries as useful context only: `stale`, `duplicated`, `too-broad`, `too-specific`, `repo-specific`, `workflow`, `config`, `sensitive`, `conflicting`, `unenforced`, `managed-policy`, or `useful`.
13. Add confidence (`high`, `medium`, or `low`) and a proposed action to every entry.
14. Produce the complete review before planning or editing. Route delivery must not reduce review quality or expand the requested scope.

## Route execution

- `review-chat`: return the review in chat and create no durable curation report.
- `review-file`: persist the single curation record and make no context change.
- `cleanup-chat`: derive only high-confidence atomic actions from the completed review, back up every exact file to be changed, apply them, re-read changed sections, and report verification in chat. Create no durable curation report.
- `cleanup-file`: create the curation record before mutation; if persistence fails, stop. Then back up exact files, apply only high-confidence atomic actions, and complete the same record with execution and verification.
- `plan-cleanup-chat` and `plan-cleanup-file`: enter the Plan lifecycle, resolve the cleanup plan with the user, and stop after approval without changing Claude context.
- `plan-run-cleanup-chat` and `plan-run-cleanup-file`: enter the Plan lifecycle, resolve and approve the complete cleanup plan, recheck state, exit Plan mode, back up exact files, execute only the unchanged plan, and verify. Do not ask a generic second cleanup question after plan approval.

Direct cleanup (`cleanup-chat` or `cleanup-file`) is limited to high-confidence atomic edits, moves, or entry deletion in existing, editable, runtime-owned Claude context. Defer whole-file deletion, shared `AGENTS.md`, new context files, settings, hooks, managed policy, `AGENTS.md`, repository docs, skills, UI-only User/Team settings, uncertain schemas, medium/low-confidence changes, and any scope expansion. A plan-run route may execute broader curation changes only when the approved plan names each destination, write path, backup, rollback, and separate approval boundary.

## Plan lifecycle

Respect active/requested native Plan mode and actual write permissions on every route: no report, backup, or cleanup write while Plan is active or permission is unknown. Planning may continue read-only without a manual mode switch. For `plan-*` routes or pending material questions, read [references/plan-lifecycle.md](references/plan-lifecycle.md). Reuse unchanged approval; mode exit alone is not approval, and unanswered questions grant no authority. Recheck state before writes and reconfirm only material changes. Plan-only routes never authorize cleanup.

Do not invoke `claude-spec-interviewer` inside this curation workflow. If findings require a broader durable rule, repository spec, or unresolved product decision, finish the selected curation route and offer the interviewer as a separate follow-up.

## File delivery contract

File routes persist exactly one redacted curation record. Prefer an existing repository-native report location; otherwise use `<repo>/.agent-reports/claude-memory-curation/<UTC timestamp>-<selection-id>.md`. Create a new path without overwriting and keep all route output in that record.

The record contains `Review`, `Plan`, `Execution Receipt`, `Deferred Work`, `Backup`, and `Verification`. Use `not applicable` with a reason for phases the route does not perform. Create the record before mutation for `cleanup-file` and `plan-run-cleanup-file`; persistence failure blocks cleanup. Chat routes create no report file. Backup directories remain mandatory safety artifacts and do not count as curation reports.

`Explicit --backup-root requires a stable non-sensitive --backup-root-alias; file routes persist the script-reported portable storage locator and <storage-locator>/backup-manifest.json.` Report exact absolute backup and manifest paths only in non-persisted chat, never in repository artifacts.

## Safety rules

- Do not inspect when the route is unresolved, and do not mutate unless the selected route and user request authorize cleanup of the exact target scope.
- Never silently delete, rewrite, truncate, or move Claude context files.
- Back up every exact file before an approved edit and report the backup path.
- Do not print full secrets, tokens, credentials, customer data, private identifiers, internal hostnames, or sensitive personal data.
- If secret-like data is found, redact values in output, identify file and line when possible, recommend removal, and recommend rotation for real credentials.
- If an auto-memory topic schema is unclear, do not edit it directly. Defer it in the current record or chat result.
- Treat `CLAUDE.md` and auto memory as context, not enforcement. Recommend settings or hooks for deterministic restrictions.
- Do not apply repo-specific assumptions globally. Prefer project `CLAUDE.md`, `.claude/rules`, `AGENTS.md`, or repo docs for repo rules.
- Do not run broad destructive commands.

## References

Read only when needed:

- Placement and classification: `references/context-surface-anatomy.md`, `references/classification-rubric.md`.
- Conflicts and enforcement: `references/conflict-resolution.md`, `references/settings-and-hooks.md`.
- Safe mutation and examples: `references/safe-editing-procedure.md`, `references/example-review-report.md`.
- Output artifacts: `assets/review-report-template.md`, `assets/cleanup-plan-template.md`.

## Scripts

Use only when needed. All scripts are non-interactive, use Node.js stdlib only, and accept `--help`.

```bash
node scripts/inventory-claude-memory.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH] [--json]
node scripts/scan-claude-memory-risks.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH] [--json] [--max-findings N]
node scripts/backup-claude-memory.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH] [--backup-root PATH --backup-root-alias NAME] [--include PATH ...]
```

- Inventory is read-only. The scanner is read-only, redacts by default, bounds findings, and uses exit `1` for findings rather than execution failure.
- `backup-claude-memory.mjs` creates a no-clobber backup plus `backup-manifest.json` without editing sources. Unredacted backup payloads and manifests stay outside Git worktrees. Preflight rejects unsafe roots and every symlink path component; any traversal error fails before root creation. Use exact `--include` paths for edits; zero includes retains legacy discovery. Before invoking it, read `references/safe-editing-procedure.md` for root safety, preflight, manifest reconciliation, and recovery.

## Output format

Use the workflow announcement above; report only unresolved approval gates.

Before producing a report, load and follow [`assets/review-report-template.md`](assets/review-report-template.md) as the canonical heading and field contract. File routes copy that complete template into the one curation record; chat routes render only applicable sections in chat and create no report file. Populate every applicable field, use `not applicable` with a reason for skipped phases, and redact sensitive values.

Before edits, complete the review and decision tables. After edits, complete the same record's receipt, including Manifest reconciliation and unmatched paths; New paths (`created-no-preimage`) and rollback; Backup mode and manifest path; Backup integrity result; and the row schema `| Changed path | Backup destination | Bytes | SHA-256 | Verification |`.

## Completion criteria

- One of the eight canonical workflows was selected from clear authority or resolved ambiguity; agent activation never inferred cleanup.
- Applicable context, `.claude/rules` metadata, settings, and auto-memory boundaries were inventoried or reported missing.
- Every atomic claim has one classification, risk tags, confidence, action, and higher-precedence conflict evidence when applicable.
- Deterministic restrictions route to settings/hooks; Plan and direct-cleanup boundaries remain satisfied.
- Chat/file delivery matches the canonical template contract, and every authorized edit has an exact-file backup, manifest reconciliation, re-read, and integrity result.

## Failure modes

- Missing surfaces or auto-memory path: report what is unavailable and request `/memory`, `claude --version`, or an explicit `--memory-dir` only when needed.
- Managed policy or unknown schema: keep read-only and recommend/defer the manual action.
- Sensitive or conflicting content: redact; cite location and higher source; recommend removal/rotation or classify for rewrite, move, deletion, or user decision.
- Persistence, backup, or approved-state recheck failure: stop before mutation (or before further mutation), report the failure, and return to planning after drift.
