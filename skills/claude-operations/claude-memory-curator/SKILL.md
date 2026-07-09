---
name: claude-memory-curator
description: Audit, review, clean up, and prune Claude Code durable context. Use when the user asks about CLAUDE.md, CLAUDE.local.md, .claude/rules, user Claude rules, Claude Code auto memory, /memory, stale instructions, memory pollution, sensitive context, settings such as autoMemoryEnabled or claudeMdExcludes, or where a Claude instruction should live. Do not use for Codex memory, Cursor rules, Claude app memory, Anthropic API Memory Stores, or generic docs cleanup.
license: Apache-2.0
compatibility: Designed for Claude Code and Claude Code skills. Works in other agents when inspecting Claude Code instruction files, settings, rules, and auto-memory markdown stores.
metadata:
  author: stark-ai-de
  category: claude-operations
  version: "0.1.0"
---

# Claude Memory Curator

## Goal

Audit Claude Code durable context as user-owned agent state: expose stale, unsafe, duplicated, over-broad, conflicting, misplaced, or unenforceable entries; propose better destinations; and apply cleanup only after a report, backup, and explicit approval.

Keep the subject scoped to Claude Code surfaces: `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/`, user-level Claude rules, settings, hooks, managed policy evidence, and auto memory files. Do not treat this as a Codex, Cursor, Claude app, or Anthropic API Memory Stores curator.

## When to use

- The user asks to review, audit, clean up, prune, rewrite, or remove Claude Code memory or persistent Claude instructions.
- The user mentions `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules`, `~/.claude/rules`, `/memory`, auto memory, `~/.claude/projects/<project>/memory/`, `autoMemoryEnabled`, `autoMemoryDirectory`, or `claudeMdExcludes`.
- The user wants to decide whether a Claude context entry belongs in `CLAUDE.md`, `CLAUDE.local.md`, a Claude rule, auto memory, settings, hooks, `AGENTS.md`, repo docs, a skill, managed policy, or deletion.
- The user reports stale Claude instructions, memory pollution, conflicting Claude rules, sensitive memory contents, or Claude repeatedly using old guidance.

## When not to use

- Do not use for Codex memory cleanup; use a Codex memory skill instead.
- Do not use for Cursor rules or Cursor context cleanup; use a Cursor memory skill instead.
- Do not use for Claude web/app account memory or Anthropic API Memory Stores.
- Do not use for ordinary repo documentation cleanup unless Claude durable context is part of the task.
- Do not use for generic prompt engineering that does not inspect Claude persistent context.
- Do not modify files when the user only asked for review.
- Do not edit managed policy files such as `/etc/claude-code/CLAUDE.md` or `managed-settings.json` by default.

## Inputs to inspect

- Current repo root, or the user-provided repo path.
- Project `CLAUDE.md`, `./.claude/CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/**/*.md`, `.claude/settings.json`, and `.claude/settings.local.json`.
- User-level `~/.claude/CLAUDE.md`, `~/.claude/rules/**/*.md`, and `~/.claude/settings.json`.
- Derived or configured auto memory directory, especially `MEMORY.md` and topic files.
- Managed policy locations only as read-only evidence unless the user explicitly asks for managed-policy editing.
- `references/context-surface-anatomy.md` when deciding which Claude surface owns a claim.
- `references/classification-rubric.md` when a destination is not obvious.
- `references/conflict-resolution.md` when Claude context conflicts with current repo evidence.
- `references/settings-and-hooks.md` when an entry should become enforced configuration or a hook.
- `references/safe-editing-procedure.md` before modifying context files.
- `assets/review-report-template.md` when report shape is unclear.
- `assets/cleanup-plan-template.md` when a structured cleanup plan is useful or requested.

## Workflow

1. Identify the target repo path from the user request or current working directory.
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
14. Produce the review report before editing. Add a structured cleanup plan when the user wants ID-by-ID approval, the schema is unknown, sensitive cleanup is proposed, or the edit set is large.
15. If cleanup is approved, load `references/safe-editing-procedure.md`, run `node scripts/backup-claude-memory.mjs --repo .`, apply only approved minimal edits by entry ID, re-read changed sections, and show a trimmed diff summary.

## Safety rules

- Never silently delete, rewrite, truncate, or move Claude context files.
- Ask exactly this before content-changing cleanup:

  ```text
  Do you want me to apply the safe cleanup now? I will back up the Claude memory and instruction files first.
  ```

- Do not edit unless the user clearly approves that cleanup.
- Back up Claude memory and instruction files before approved edits and report the backup path.
- Do not print full secrets, tokens, credentials, customer data, private identifiers, internal hostnames, or sensitive personal data.
- If secret-like data is found, redact values in output, identify file and line when possible, recommend removal, and recommend rotation for real credentials.
- If an auto-memory topic file schema is unclear, do not edit the original file. Write a sibling `.proposed.md` cleanup plan instead.
- Treat `CLAUDE.md` and auto memory as context, not enforcement. Recommend settings or hooks for deterministic restrictions.
- Do not apply repo-specific assumptions globally. Prefer project `CLAUDE.md`, `.claude/rules`, `AGENTS.md`, or repo docs for repo rules.
- Do not run broad destructive commands.

## References

Read only when needed:

- `references/context-surface-anatomy.md` for Claude instruction files, rules, settings, managed policy, and auto memory surfaces.
- `references/classification-rubric.md` for detailed classification rules and rewrite examples.
- `references/conflict-resolution.md` for precedence rules when Claude context conflicts with repo evidence.
- `references/settings-and-hooks.md` when an entry may belong in Claude settings or hooks.
- `references/example-review-report.md` for report shape examples.
- `references/safe-editing-procedure.md` before modifying context files.
- `assets/review-report-template.md` when a concise report template is useful.
- `assets/cleanup-plan-template.md` when a structured cleanup plan is needed.

## Scripts

Use only when needed. All scripts are non-interactive, use Node.js stdlib only, and accept `--help`.

```bash
node scripts/inventory-claude-memory.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH] [--json]
node scripts/scan-claude-memory-risks.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH] [--json] [--max-findings N]
node scripts/backup-claude-memory.mjs [--repo PATH] [--claude-home PATH] [--memory-dir PATH]
```

- `inventory-claude-memory.mjs` is read-only and lists Claude context files with type, size, modified time, and relevant frontmatter or settings signals.
- `scan-claude-memory-risks.mjs` is read-only, redacts matching lines by default, labels risk categories, limits returned findings, and exits `1` when findings exist.
- `backup-claude-memory.mjs` creates a timestamped backup copy under the target repo; it does not edit or delete context files.

## Output format

Before edits, lead with this report shape:

```md
# Claude Memory Review

## Top Decisions

1.
2.
3.

## Summary

- Claude context files inspected:
- Entries extracted:
- Keep:
- Rewrite:
- Move to CLAUDE.md:
- Move to CLAUDE.local.md:
- Move to Claude rule:
- Move to auto memory topic:
- Move to AGENTS.md:
- Move to repo docs:
- Move to skill:
- Move to settings:
- Move to hook:
- Move to managed policy:
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

## Settings And Hook Recommendations

- Settings:
- Hooks:
- Managed policy:

## Optional Cleanup Plan Artifact

- Plan path:
- Plan format: `assets/cleanup-plan-template.md`

## Recommended Next Action
```

After approved edits, also include backup path, files changed, trimmed diff summary, skipped managed-policy actions, and residual risks.

## Completion criteria

- Relevant Claude context files were inventoried, or missing paths were reported.
- `.claude/rules` frontmatter and visible Claude settings were considered when relevant.
- Auto memory was distinguished from `CLAUDE.md` instructions, and `MEMORY.md` was treated as the entrypoint.
- Entries were extracted as atomic claims.
- Each entry has exactly one primary classification.
- Each entry has risk tags, confidence, and a proposed action.
- Conflicts cite the higher-precedence source that makes the entry stale or misplaced.
- Settings and hooks are recommended for deterministic enforcement instead of relying on context text.
- A structured cleanup plan is provided when the user wants ID-by-ID approval, the schema is unknown, sensitive cleanup is proposed, or the edit set is large.
- No context edit happened before explicit approval.
- Any approved edit has a backup path and verification diff summary.

## Failure modes

- No Claude files: report that no `CLAUDE.md`, `.claude/rules`, settings, or auto memory files were found, then suggest `/memory`, `claude --version`, or a user-provided `--memory-dir`.
- Auto memory path unknown: report the configured path if visible, otherwise say the default project-derived path could not be proven and ask for `/memory` output or `--memory-dir`.
- Managed policy found: report it as read-only evidence and recommend a managed-policy change only as a manual action.
- Unknown auto-memory schema: write proposed replacements to a sibling `.proposed.md` file instead of editing the original.
- Sensitive data found: redact the value, identify file and line when possible, recommend removal, require backup before edits, and recommend rotation for real credentials.
- Conflicting rules: cite the conflict, prefer current prompt and repo evidence, then classify as rewrite, move, delete, or ask-user.
- Backup failure: do not edit context files.
