---
name: cursor-memory-curator
description: Audit, review, clean up, and prune Cursor durable context. Use when the user asks about Cursor rules, .cursor/rules, .cursorrules, User Rules, Team Rules, Cursor memory-bank artifacts, stale or noisy persistent context, rule conflicts, sensitive rule contents, or why Cursor keeps forgetting or using old guidance. Do not use for Codex memory cleanup, ordinary repo docs cleanup, generic prompt engineering, or direct implementation work without Cursor persistent context.
license: Apache-2.0
compatibility: Designed for Cursor Agent and Cursor Agent Skills. Works in other agents when inspecting Cursor rule files and user-provided Cursor context exports.
metadata:
  author: stark-ai-de
  category: cursor-operations
  version: "0.2.1"
---

# Cursor Memory Curator

## Goal

Audit Cursor durable context as user-owned agent state: expose stale, unsafe, duplicated, ignored, conflicting, or misplaced rules; propose better destinations; and route review, planning, persistence, and cleanup through one explicit contract.

Keep the subject scoped to Cursor Project Rules, legacy `.cursorrules`, `AGENTS.md`, User Rules, Team Rules, and user-maintained Cursor memory-bank artifacts. Do not treat this as a Codex memory curator.

## When to use

- Use for review, placement, planning, or cleanup of the Cursor durable surfaces named in the description.
- Use when those surfaces are stale, conflicting, sensitive, ignored, over-broad, or causing Cursor to forget or reuse old guidance.

## When not to use

- Do not use for Codex memory, ordinary docs, or generic prompt work without Cursor durable context.
- Keep review requests read-only. Keep User/Team Rules manual unless a documented file-backed artifact or explicitly approved export path is in scope.

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
- A bare invocation, conflicting cues, or ambiguity about review versus cleanup, chat versus file, execution, target paths, or mutation authority exposes the table and asks the user to choose.
- A mutating route may be selected only when the user already requested cleanup of the identified Cursor context scope.

Before substantive inspection, show the complete table plus `Selected`, `Reason`, target paths, write scope, expected artifacts, protected state, Plan-mode capability, and remaining separate approvals. If selection is unambiguous, announce it and proceed. If it is ambiguous, stop before inventory and ask.

Workflow selection does not authorize whole-file deletion, destructive recovery, User/Team settings edits, paid or external actions, deployment, publication, or scope expansion.

## Inputs to inspect

- Resolve the repo and only applicable `.cursor/rules`, `.cursorrules`, `AGENTS.md`, provided User/Team Rule exports, and provided memory-bank paths.
- Inspect current repository evidence only as needed to verify a disputed claim.
- Load the placement, classification, conflict, and safe-editing references below only when their decision is active. Load the report or plan asset whenever producing that artifact.

## Workflow

Every route performs the same full-depth review before planning or cleanup:

1. Resolve the selected route, target repo and context paths, persistence path when applicable, and protected state.
2. Inventory Cursor context without dumping contents:

   ```bash
   node scripts/inventory-cursor-context.mjs --repo .
   ```

   Add `--memory-bank PATH` for explicit memory-bank artifacts. Use `--json` when structured evidence is useful.

3. Run the redacted risk scanner when looking for sensitive, stale, broad, ignored, legacy, local, or conflict-prone rules:

   ```bash
   node scripts/scan-cursor-context-risks.mjs --repo . --json
   ```

   Exit code `1` means findings were found, not that the scan failed. Summarize counts and highest-signal redacted findings instead of pasting the full payload.

4. Parse `.mdc` frontmatter fields that affect Cursor behavior: `description`, `globs`, and `alwaysApply`.
5. Flag plain `.md` files under `.cursor/rules` as ignored by Cursor Project Rules metadata and recommend conversion to `.mdc` or relocation to `AGENTS.md`.
6. Treat User Rules and Team Rules as settings evidence or user-provided exports unless a current documented filesystem path is available.
7. Read context files in bounded chunks and redact sensitive values.
8. Extract one atomic claim per row. Split compound rules before classification.
9. Verify disputed claims against only the repo files needed for the dispute. Load `references/conflict-resolution.md` when precedence is unclear.
10. Assign exactly one primary classification per atomic claim: `KEEP`, `KEEP BUT REWRITE`, `MOVE TO CURSOR PROJECT RULE`, `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, `MOVE TO CURSOR USER RULES`, `MOVE TO CURSOR TEAM RULES`, `MOVE TO SKILL`, `MOVE TO CONFIG`, `DELETE`, or `ASK USER`.
11. Tag high-risk entries as useful context only: `stale`, `duplicated`, `too-broad`, `too-specific`, `repo-specific`, `workflow`, `config`, `sensitive`, `conflicting`, `ignored`, `legacy`, or `useful`.
12. Add confidence (`high`, `medium`, or `low`) and a proposed action to every entry.
13. Produce the complete review before planning or editing. Route delivery must not reduce review depth.

## Route execution

- `review-chat`: return the review in chat and create no durable curation report.
- `review-file`: persist the single curation record and make no context change.
- `cleanup-chat`: derive only high-confidence atomic actions from the completed review, back up every exact file to be changed, apply them, re-read changed sections, and report verification in chat. Create no durable curation report.
- `cleanup-file`: create the curation record before mutation; if persistence fails, stop. Then back up exact files, apply only high-confidence atomic actions, and complete the same record with execution and verification.
- `plan-cleanup-chat` and `plan-cleanup-file`: enter the Plan lifecycle, resolve the cleanup plan with the user, and stop after approval without changing Cursor context.
- `plan-run-cleanup-chat` and `plan-run-cleanup-file`: enter the Plan lifecycle, resolve and approve the complete cleanup plan, recheck state, exit Plan mode, back up exact files, execute only the unchanged plan, and verify. Do not ask a generic second cleanup question after plan approval.

Direct cleanup (`cleanup-chat` or `cleanup-file`) is limited to high-confidence atomic edits, moves, or entry deletion in existing, editable, runtime-owned Cursor context. Defer whole-file deletion, new context files, config, User Rules, Team Rules, `AGENTS.md`, repository docs, skills, uncertain memory-bank schemas, medium/low-confidence changes, and any scope expansion. A plan-run route may execute broader curation changes only when the approved plan names each destination, write path, backup, rollback, and separate approval boundary. User and Team Rules remain manual unless a documented editable export is explicitly in scope.

## Plan lifecycle

The four `plan-*` routes require native Plan mode when the host supports it:

1. Detect support before substantive planning.
2. If supported and active, plan there. If supported but inactive, or support is indeterminate, stop and ask the user to enter or confirm Plan mode.
3. Use an in-chat portable fallback only when native Plan mode is definitely unavailable.
4. Before execution, record plan approval, recheck target files and protected state, stop on material drift, and exit Plan mode before mutation.

Do not invoke `cursor-spec-interviewer` inside this curation workflow. If findings require a broader durable rule, repository spec, or unresolved product decision, finish the selected curation route and offer the interviewer as a separate follow-up.

## File delivery contract

File routes persist exactly one redacted curation record. Prefer an existing repository-native report location; otherwise use `<repo>/.agent-reports/cursor-memory-curation/<UTC timestamp>-<selection-id>.md`. Create a new path without overwriting and keep all route output in that record.

The record contains `Review`, `Plan`, `Execution Receipt`, `Deferred Work`, `Backup`, and `Verification`. Use `not applicable` with a reason for phases the route does not perform. Create the record before mutation for `cleanup-file` and `plan-run-cleanup-file`; persistence failure blocks cleanup. Chat routes create no report file. Backup directories remain mandatory safety artifacts and do not count as curation reports.

`Explicit --backup-root requires a stable non-sensitive --backup-root-alias; file routes persist the script-reported portable storage locator and <storage-locator>/backup-manifest.json.` Report exact absolute backup and manifest paths only in non-persisted chat, never in repository artifacts.

## Safety rules

- Do not inspect when the route is unresolved, and do not mutate unless the selected route and user request authorize cleanup of the exact target scope.
- Never silently delete, rewrite, truncate, or move Cursor context files.
- Back up every exact file before an approved edit and report the backup path.
- Do not print full secrets, tokens, credentials, customer data, private identifiers, or sensitive personal data.
- If secret-like data is found, redact values in output, identify file and line when possible, recommend removal, and recommend rotation for real credentials.
- If a memory-bank schema is unclear, do not edit it directly. Defer it in the current record or chat result.
- Do not edit User Rules or Team Rules from chat-only summaries; give manual action recommendations instead.
- Do not apply repo-specific assumptions globally. Prefer `AGENTS.md`, Cursor Project Rules, or repo docs for repo rules.
- Do not run broad destructive commands.

## References

Read only when needed:

- Placement and classification: `references/context-surface-anatomy.md`, `references/classification-rubric.md`.
- Conflicts and safe mutation: `references/conflict-resolution.md`, `references/safe-editing-procedure.md`.
- Examples and output artifacts: `references/example-review-report.md`, `assets/review-report-template.md`, `assets/cleanup-plan-template.md`.

## Scripts

Use only when needed. All scripts are non-interactive, use Node.js stdlib only, and accept `--help`.

```bash
node scripts/inventory-cursor-context.mjs [--repo PATH] [--memory-bank PATH] [--json]
node scripts/scan-cursor-context-risks.mjs [--repo PATH] [--memory-bank PATH] [--json] [--max-findings N]
node scripts/backup-cursor-context.mjs [--repo PATH] [--memory-bank PATH] [--backup-root PATH --backup-root-alias NAME] [--include PATH ...]
```

- Inventory is read-only. The scanner is read-only, redacts by default, bounds findings, and uses exit `1` for findings rather than execution failure.
- `backup-cursor-context.mjs` creates a no-clobber backup plus `backup-manifest.json`. Unredacted backup payloads and manifests stay outside Git worktrees; the backup scripts default to deterministic user state and reject an unsafe `--backup-root` before copying. One or more repeatable `--include PATH` values select exact-only mode; zero includes retain legacy context discovery. Selected paths and explicit discovery roots must exist and be readable; every symlink path component and legacy traversal error fails before root creation. It does not edit or delete context files.

## Output format

Start with the selected workflow, rationale, target paths, write scope, expected artifacts, protected state, Plan-mode state, persistence path or `chat only`, and remaining approvals.

Before producing a report, load and follow [`assets/review-report-template.md`](assets/review-report-template.md) as the canonical heading and field contract. File routes copy that complete template into the one curation record; chat routes render only applicable sections in chat and create no report file. Populate every applicable field, use `not applicable` with a reason for skipped phases, and redact sensitive values.

Before edits, complete the review and decision tables. After edits, complete the same record's receipt, including Manifest reconciliation and unmatched paths; New paths (`created-no-preimage`) and rollback; Backup mode and manifest path; Backup integrity result; and the row schema `| Changed path | Backup destination | Bytes | SHA-256 | Verification |`.

## Completion criteria

- One of the eight canonical workflows was selected from clear authority or resolved ambiguity; agent activation never inferred cleanup.
- Applicable context and `.mdc` metadata were inventoried or reported missing; User/Team Rules remained evidence or approved exports rather than silent edits.
- Every atomic claim has one classification, risk tags, confidence, action, and higher-precedence conflict evidence when applicable.
- Plan and direct-cleanup boundaries remain satisfied.
- Chat/file delivery matches the canonical template contract, and every authorized edit has an exact-file backup, manifest reconciliation, re-read, and integrity result.

## Failure modes

- Missing surfaces or settings exports: report what is unavailable and provide manual User/Team Rule recommendations when needed.
- Plain `.md` under `.cursor/rules` or unknown memory-bank schema: flag/defer rather than silently editing; recommend `.mdc` conversion or `AGENTS.md` relocation when applicable.
- Sensitive or conflicting content: redact; cite location and higher source; recommend removal/rotation or classify for rewrite, move, deletion, or user decision.
- Persistence, backup, or approved-state recheck failure: stop before mutation (or before further mutation), report the failure, and return to planning after drift.
