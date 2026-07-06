---
name: cursor-memory-curator
description: Audit, review, clean up, and prune Cursor durable context. Use when the user asks about Cursor rules, .cursor/rules, .cursorrules, User Rules, Team Rules, Cursor memory-bank artifacts, stale or noisy persistent context, rule conflicts, sensitive rule contents, or why Cursor keeps forgetting or using old guidance. Do not use for Codex memory cleanup, ordinary repo docs cleanup, generic prompt engineering, or direct implementation work without Cursor persistent context.
license: Apache-2.0
compatibility: Designed for Cursor Agent and Cursor Agent Skills. Works in other agents when inspecting Cursor rule files and user-provided Cursor context exports.
metadata:
  author: stark-ai-de
  category: cursor-operations
  version: "0.1.0"
---

# Cursor Memory Curator

## Goal

Audit Cursor durable context as user-owned agent state: expose stale, unsafe, duplicated, ignored, conflicting, or misplaced rules; propose better destinations; and apply cleanup only after a report, backup, and explicit approval.

Keep the subject scoped to Cursor Project Rules, legacy `.cursorrules`, `AGENTS.md`, User Rules, Team Rules, and user-maintained Cursor memory-bank artifacts. Do not treat this as a Codex memory curator.

## When to use

- The user asks to review, audit, clean up, prune, rewrite, or remove Cursor rules or persistent Cursor context.
- The user mentions `.cursor/rules`, `.cursorrules`, Cursor User Rules, Cursor Team Rules, stale rules, rule conflicts, or Cursor context pollution.
- The user asks whether a durable Cursor instruction belongs in a project rule, `AGENTS.md`, repo docs, User Rules, Team Rules, a skill, config, or deletion.
- The user reports that Cursor keeps forgetting, keeps using stale guidance, or is applying old project instructions.

## When not to use

- Do not use for Codex memory cleanup; use a Codex memory skill instead.
- Do not use for ordinary repo documentation cleanup unless Cursor durable context is part of the task.
- Do not use for generic prompt engineering that does not inspect Cursor persistent context.
- Do not modify files when the user only asked for review.
- Do not edit User Rules or Team Rules directly unless Cursor exposes a documented file-backed artifact or the user provides an explicit exported file path and approves edits.

## Inputs to inspect

- Current repo root, or the user-provided repo path.
- `.cursor/rules/**/*.mdc` and plain `.md` files under `.cursor/rules`.
- Legacy `.cursorrules`.
- Root and nested `AGENTS.md` files when relevant to Cursor behavior.
- User-provided User Rules or Team Rules exports.
- User-provided Cursor memory-bank paths such as `memory-bank/`, `docs/memory/`, or `.cursor/memory-bank/`.
- `references/context-surface-anatomy.md` when deciding which Cursor surface owns a claim.
- `references/classification-rubric.md` when a destination is not obvious.
- `references/conflict-resolution.md` when rules conflict.
- `references/safe-editing-procedure.md` before modifying context files.
- `assets/review-report-template.md` when report shape is unclear.
- `assets/cleanup-plan-template.md` when a structured cleanup plan is useful or requested.

## Workflow

1. Identify the target repo path from the user request or current working directory.
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
13. Produce the review report before editing. Add a structured cleanup plan when the user wants ID-by-ID approval, the schema is unknown, sensitive cleanup is proposed, or the edit set is large.
14. If cleanup is approved, load `references/safe-editing-procedure.md`, run `node scripts/backup-cursor-context.mjs --repo .`, apply only approved minimal edits by entry ID, re-read changed sections, and show a trimmed diff summary.

## Safety rules

- Never silently delete, rewrite, truncate, or move Cursor context files.
- Ask exactly this before content-changing cleanup:

  ```text
  Do you want me to apply the safe cleanup now? I will back up the Cursor context files first.
  ```

- Do not edit unless the user clearly approves that cleanup.
- Back up Cursor context files before approved edits and report the backup path.
- Do not print full secrets, tokens, credentials, customer data, private identifiers, or sensitive personal data.
- If secret-like data is found, redact values in output, identify file and line when possible, recommend removal, and recommend rotation for real credentials.
- If a memory-bank schema is unclear, do not edit the original artifact. Write a sibling `.proposed.md` cleanup plan instead.
- Do not edit User Rules or Team Rules from chat-only summaries; give manual action recommendations instead.
- Do not apply repo-specific assumptions globally. Prefer `AGENTS.md`, Cursor Project Rules, or repo docs for repo rules.
- Do not run broad destructive commands.

## References

Read only when needed:

- `references/context-surface-anatomy.md` for Cursor Project Rules, legacy rules, `AGENTS.md`, User Rules, Team Rules, and memory-bank artifacts.
- `references/classification-rubric.md` for detailed classification rules and rewrite examples.
- `references/conflict-resolution.md` for precedence rules when Cursor context conflicts with repo evidence.
- `references/example-review-report.md` for report shape examples.
- `references/safe-editing-procedure.md` before modifying context files.
- `assets/review-report-template.md` when a concise report template is useful.
- `assets/cleanup-plan-template.md` when a structured cleanup plan is needed.

## Scripts

Use only when needed. All scripts are non-interactive, use Node.js stdlib only, and accept `--help`.

```bash
node scripts/inventory-cursor-context.mjs [--repo PATH] [--memory-bank PATH] [--json]
node scripts/scan-cursor-context-risks.mjs [--repo PATH] [--memory-bank PATH] [--json] [--max-findings N]
node scripts/backup-cursor-context.mjs [--repo PATH] [--memory-bank PATH]
```

- `inventory-cursor-context.mjs` is read-only and lists Cursor context files with type, size, modified time, and `.mdc` frontmatter metadata.
- `scan-cursor-context-risks.mjs` is read-only, redacts matching lines by default, labels risk categories, limits returned findings, and exits `1` when findings exist.
- `backup-cursor-context.mjs` creates a timestamped backup copy under the target repo; it does not edit or delete context files.

## Output format

Before edits, lead with this report shape:

```md
# Cursor Memory Review

## Top Decisions

1.
2.
3.

## Summary

- Cursor context files inspected:
- Entries extracted:
- Keep:
- Rewrite:
- Move to Cursor Project Rule:
- Move to AGENTS.md:
- Move to repo docs:
- Move to Cursor User Rules:
- Move to Cursor Team Rules:
- Move to skill:
- Move to config:
- Delete:
- Ask user:

## Highest-Risk Context

| ID  | Source | Risk | Recommendation |
| --- | ------ | ---- | -------------- |

## Proposed Cleanup Table

| ID  | Current claim | Classification | Risk tags | Confidence | Reason | Proposed action |
| --- | ------------- | -------------- | --------- | ---------- | ------ | --------------- |

## Conflict Notes

| ID  | Higher source | Conflict | Recommendation |
| --- | ------------- | -------- | -------------- |

## Manual Cursor Settings Actions

- User Rules:
- Team Rules:

## Optional Cleanup Plan Artifact

- Plan path:
- Plan format: `assets/cleanup-plan-template.md`

## Recommended Next Action
```

After approved edits, also include backup path, files changed, trimmed diff summary, skipped manual settings actions, and residual risks.

## Completion criteria

- Relevant Cursor context files were inventoried, or missing paths were reported.
- `.mdc` frontmatter was considered for Project Rules.
- User Rules and Team Rules were treated as settings evidence or user-provided exports, not silently edited.
- Entries were extracted as atomic claims.
- Each entry has exactly one primary classification.
- Each entry has risk tags, confidence, and a proposed action.
- Conflicts cite the higher-precedence source that makes the rule stale or misplaced.
- A structured cleanup plan is provided when the user wants ID-by-ID approval, the schema is unknown, sensitive cleanup is proposed, or the edit set is large.
- No context edit happened before explicit approval.
- Any approved edit has a backup path and verification diff summary.

## Failure modes

- No Cursor files: report that no `.cursor/rules`, `.cursorrules`, or relevant `AGENTS.md` files were found, then ask whether the user has exported User Rules, Team Rules, or memory-bank artifacts.
- User or Team Rules unavailable: provide manual recommendations instead of pretending to edit settings.
- Plain `.md` under `.cursor/rules`: flag it as an ignored or metadata-less Project Rule candidate and recommend `.mdc` conversion or `AGENTS.md` relocation.
- Memory-bank schema unknown: write proposed replacements to a sibling `.proposed.md` file instead of editing the original.
- Sensitive data found: redact the value, identify file and line when possible, recommend removal, require backup before edits, and recommend rotation for real credentials.
- Conflicting rules: cite the conflict, prefer current prompt and repo evidence, then classify as rewrite, move, delete, or ask-user.
- Backup failure: do not edit context files.
