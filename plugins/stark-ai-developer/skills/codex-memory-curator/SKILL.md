---
name: codex-memory-curator
description: Audit, review, clean up, and prune Codex memories. Use when the user asks about ~/.codex/memories, stale or noisy memories, memory pollution, cross-repo rule leakage, sensitive memory contents, memory config tuning, cleanup plans, or whether entries belong in memory, AGENTS.md, repo docs, skills, config, or deletion. Do not use for ordinary repo docs cleanup.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: codex-operations
  version: "0.2.1"
---

# Codex Memory Curator

## Goal

Audit Codex memory as user-owned durable state; classify stale, unsafe, duplicated, or misplaced claims and route review, planning, persistence, and cleanup. Even when invoked from Cursor, inspect only Codex memory/config, not Cursor state.

## Core principle

Memory is context, not truth. The latest user request, current repo files, `AGENTS.md`, package files, ADRs, and live evidence override stored memories.

## When to use

- Use for review, placement, configuration, planning, or cleanup of Codex memory and its durable configuration.
- Use when memory is stale, conflicting, sensitive, noisy, cross-repository, or causing degraded behavior.

## When not to use

- Do not use for ordinary docs, generic prompt work, or Cursor state unless Codex memory/config is explicitly involved.
- Keep review requests read-only and inspect no personal files beyond Codex memory/config plus the minimum repository evidence needed for conflicts.

## Workflow selection

Always expose these workflows in this order. `plan-run-cleanup-file` is always first and Recommended:

| Workflow                              | Delivery                             | Result                                                                                   |
| ------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `plan-run-cleanup-file` (Recommended) | One redacted file record             | Full review, user-approved cleanup plan, backup, execution, and verification.            |
| `review-chat`                         | Chat only                            | Full read-only review and recommendations.                                               |
| `review-file`                         | One redacted file record             | Full read-only review and recommendations.                                               |
| `cleanup-chat`                        | Chat plus backup                     | Full review followed by direct high-confidence atomic cleanup and verification.          |
| `cleanup-file`                        | One redacted file record plus backup | Persist the review, then directly apply high-confidence atomic cleanup and verification. |
| `plan-cleanup-chat`                   | Chat only                            | Full review and user-approved cleanup plan; no cleanup.                                  |
| `plan-cleanup-file`                   | One redacted file record             | Full review and user-approved cleanup plan; no cleanup.                                  |
| `plan-run-cleanup-chat`               | Chat plus backup                     | Full review, user-approved cleanup plan, backup, execution, and verification.            |

Route from intent instead of adding an `auto` workflow:

- Direct review defaults to `review-chat`; explicit persistence selects `review-file`.
- Explicit cleanup without a delivery preference selects `plan-run-cleanup-file`.
- A clear direct request may select another matching route when delivery and execution intent are explicit.
- Agent-initiated activation may select only a relevant read-only route. Use `review-file` only when the existing task already requests persistence; never infer cleanup.
- A bare invocation, conflicting cues, or ambiguity about review versus cleanup, chat versus file, execution, Codex home, or mutation authority exposes the table and asks the user to choose.
- A mutating route may be selected only when the user already requested cleanup of the identified Codex memory scope.

Before substantive inspection, show the complete table plus `Selected`, `Reason`, Codex home/repo target, write scope, expected artifacts, protected state, Plan-mode capability, and remaining separate approvals. If selection is unambiguous, announce it and proceed. If it is ambiguous, stop before inventory and ask.

Workflow selection does not authorize whole-file deletion, destructive recovery, config changes, paid or external actions, deployment, publication, or scope expansion.

## Inputs to inspect

- Resolve the user-provided Codex home or `${CODEX_HOME:-$HOME/.codex}`, then inspect its `memories` and visible `config.toml` surfaces.
- Inspect current repository evidence only as needed to verify a disputed claim.
- Load the classification, conflict, config-mode, store-anatomy, and safe-editing references below only when their decision is active. Load the report or plan asset whenever producing that artifact.

## Safety rules

- Do not inspect when the route is unresolved, and do not mutate unless the selected route and user request authorize cleanup of the exact target scope.
- Never silently delete, rewrite, truncate, or move memory files.
- Back up every exact file before an approved edit and report the backup path.
- Do not print full secrets, tokens, credentials, customer data, private identifiers, or sensitive personal data.
- If secret-like data is found, redact values in output, identify file and line when possible, recommend removal, and recommend rotation for real credentials.
- If the memory schema is unclear, do not edit it directly. Defer it in the current record or chat result.
- Treat memory files as generated state unless local instructions prove otherwise. Do not rewrite append-only evidence to fix a stale curated claim.
- Do not apply repo-specific assumptions globally. Prefer `AGENTS.md` or repo docs for repo rules.
- Do not run broad destructive commands.

## Workflow

Every route performs the same full-depth review before planning or cleanup:

1. Resolve the selected route, Codex home, repo target, persistence path when applicable, and protected state. Discover Codex home as follows:

   Use `${CODEX_HOME}` when set; otherwise use the user's home directory plus `.codex`.

2. Inventory memory files without dumping contents:

   ```bash
   node scripts/inventory-memories.mjs
   ```

3. Run the redacted risk scanner when looking for sensitive, stale, broad, local, repo-specific, or config-like entries:

   ```bash
   node scripts/scan-memory-risks.mjs --json
   ```

   Exit code `1` means findings were found, not that the scan failed. The scanner caps returned findings and skips generated evidence by default; raise `--max-findings` or add `--include-generated-evidence` only when needed.
   Use scanner JSON as evidence; report counts and the highest-signal redacted findings instead of pasting the full payload.

4. Inspect `<codex-home>/config.toml` when present; read no more than the first 220 lines.
5. Classify memory mode as disabled, enabled but not injected, enabled and injected, external-context generation disabled, or unknown. Load `references/config-modes.md` for exact mode signals.
6. If multiple memory file types are present, load `references/memory-store-anatomy.md` before deciding what is safe to edit.
7. Read memory files in small chunks; avoid huge dumps and redact sensitive values.
8. Extract one atomic claim per row. Split compound entries before classification.
9. Verify conflicts against only the current repo files needed for the disputed claim. Load `references/conflict-resolution.md` when precedence is unclear.
10. Assign exactly one primary classification per atomic claim: `KEEP`, `KEEP BUT REWRITE`, `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, `MOVE TO SKILL`, `MOVE TO CONFIG`, `DELETE`, or `ASK USER`.

11. Tag high-risk entries as useful context only: `stale`, `duplicated`, `too-broad`, `too-specific`, `repo-specific`, `workflow`, `config`, `sensitive`, `conflicting`, or `useful`.
12. Add confidence (`high`, `medium`, or `low`) and a proposed action to every entry.
13. Produce the complete review before planning or editing. Route delivery must not reduce review depth.

## Route execution

- `review-chat`: return the review in chat and create no durable curation report.
- `review-file`: persist the single curation record and make no memory or config change.
- `cleanup-chat`: derive only high-confidence atomic actions from the completed review, back up every exact file to be changed, apply them, re-read changed sections, and report verification in chat. Create no durable curation report.
- `cleanup-file`: create the curation record before mutation; if persistence fails, stop. Then back up exact files, apply only high-confidence atomic actions, and complete the same record with execution and verification.
- `plan-cleanup-chat` and `plan-cleanup-file`: enter the Plan lifecycle, resolve the cleanup plan with the user, and stop after approval without changing Codex state.
- `plan-run-cleanup-chat` and `plan-run-cleanup-file`: enter the Plan lifecycle, resolve and approve the complete cleanup plan, recheck state, exit Plan mode, back up exact files, execute only the unchanged plan, and verify. Do not ask a generic second cleanup question after plan approval.

Direct cleanup (`cleanup-chat` or `cleanup-file`) is limited to high-confidence atomic edits, moves, or entry deletion in existing, editable, runtime-owned Codex memory. Defer whole-file deletion, new context files, config, `AGENTS.md`, repository docs, skills, generated append-only evidence, uncertain schemas, medium/low-confidence changes, and any scope expansion. A plan-run route may execute broader curation changes only when the approved plan names each destination, write path, backup, rollback, and separate approval boundary.

## Plan lifecycle

The four `plan-*` routes require native Plan mode when the host supports it:

1. Detect support before substantive planning.
2. If supported and active, plan there. If supported but inactive, or support is indeterminate, stop and ask the user to enter or confirm Plan mode.
3. Use an in-chat portable fallback only when native Plan mode is definitely unavailable.
4. Before execution, record plan approval, recheck target files and protected state, stop on material drift, and exit Plan mode before mutation.

Do not invoke `codex-spec-interviewer` inside this curation workflow. If findings require a broader durable rule, repository spec, or unresolved product decision, finish the selected curation route and offer the interviewer as a separate follow-up.

## File delivery contract

File routes persist exactly one redacted curation record. Prefer an existing repository-native report location; otherwise use `<repo>/.agent-reports/codex-memory-curation/<UTC timestamp>-<selection-id>.md`. Create a new path without overwriting and keep all route output in that record.

The record contains `Review`, `Plan`, `Execution Receipt`, `Deferred Work`, `Backup`, and `Verification`. Use `not applicable` with a reason for phases the route does not perform. Create the record before mutation for `cleanup-file` and `plan-run-cleanup-file`; persistence failure blocks cleanup. Chat routes create no report file. Backup directories remain mandatory safety artifacts and do not count as curation reports.

`Explicit --backup-root requires a stable non-sensitive --backup-root-alias; file routes persist the script-reported portable storage locator and <storage-locator>/backup-manifest.json.` Report exact absolute backup and manifest paths only in non-persisted chat, never in repository artifacts.

## Classification checks

For each atomic claim, test stability, scope, portability, strength, duplication, staleness, sensitivity, higher-precedence conflicts, concise phrasing, and whether `AGENTS.md`, repo docs, a skill, config, or deletion is more precise. Load `references/classification-rubric.md` for the detailed rules and examples.

## References

Read only when needed:

- Classification and conflict: `references/classification-rubric.md`, `references/conflict-resolution.md`.
- Config and store boundaries: `references/config-modes.md`, `references/memory-store-anatomy.md`.
- Safe mutation and examples: `references/safe-editing-procedure.md`, `references/example-review-report.md`.
- Output artifacts: `assets/review-report-template.md`, `assets/cleanup-plan-template.md`.

## Scripts

Use only when needed. All scripts are non-interactive, use Node.js stdlib only, and accept `--help`.

```bash
node scripts/inventory-memories.mjs [--codex-home PATH] [--json]
node scripts/scan-memory-risks.mjs [--codex-home PATH] [--json] [--max-findings N] [--include-generated-evidence]
node scripts/backup-memories.mjs [--repo PATH] [--codex-home PATH] [--backup-root PATH --backup-root-alias NAME] [--include PATH ...]
```

- Inventory is read-only. The scanner is read-only, redacts by default, bounds findings, skips generated evidence unless requested, and uses exit `1` for findings rather than execution failure.
- `backup-memories.mjs` creates a no-clobber backup plus `backup-manifest.json`. Unredacted backup payloads and manifests stay outside Git worktrees and outside the resolved Codex memories tree; default and explicit roots equal to or below that source tree, including symlink aliases, fail before discovery can include them or any backup directory is created. The script defaults to deterministic user state and rejects an unsafe `--backup-root` before copying. One or more repeatable `--include PATH` values select exact-only mode; zero includes retain full legacy memory discovery. Selected paths must be readable; every symlink path component and legacy traversal error fails before root creation. It does not edit or delete memory files.

## Output format

Start with the selected workflow, rationale, Codex home/repo target, write scope, expected artifacts, protected state, Plan-mode state, persistence path or `chat only`, and remaining approvals.

Before producing a report, load and follow [`assets/review-report-template.md`](assets/review-report-template.md) as the canonical heading and field contract. File routes copy that complete template into the one curation record; chat routes render only applicable sections in chat and create no report file. Populate every applicable field, use `not applicable` with a reason for skipped phases, and redact sensitive values.

Before edits, complete the review and decision tables. After edits, complete the same record's receipt, including Manifest reconciliation and unmatched paths; New paths (`created-no-preimage`) and rollback; Backup mode and manifest path; Backup integrity result; and the row schema `| Changed path | Backup destination | Bytes | SHA-256 | Verification |`.

## Completion criteria

- One of the eight canonical workflows was selected from clear authority or resolved ambiguity; agent activation never inferred cleanup.
- Applicable memory/config was inventoried or reported missing; generated evidence changed only for explicitly authorized sensitive-data cleanup.
- Every atomic claim has one classification, risk tags, confidence, action, and higher-precedence conflict evidence when applicable.
- Plan/direct-cleanup and destination boundaries remain satisfied.
- Delivery matches the canonical template; every edit has exact backup, manifest reconciliation, re-read, and integrity proof.

## Failure modes

- Missing memory/config: report what is unavailable and whether enablement, app defaults, or a different Codex home may explain it.
- Unknown schema: defer instead of editing or creating sibling state.
- Sensitive or conflicting content: redact; cite location and higher source; recommend removal/rotation or classify for rewrite, move, or deletion.
- Persistence, backup, or approved-state recheck failure: stop before mutation (or before further mutation), report the failure, and return to planning after drift.

## Final output instruction

Stay skeptical and concise. Lead with top decisions and the cleanup report, not a long explanation. Give one concrete next action when action is needed.
