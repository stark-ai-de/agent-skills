---
name: codex-memory-curator
description: Audit, review, clean up, and prune Codex memories. Use when the user asks about ~/.codex/memories, stale or noisy memories, memory pollution, cross-repo rule leakage, sensitive memory contents, memory config tuning, cleanup plans, or whether entries belong in memory, AGENTS.md, repo docs, skills, config, or deletion. Do not use for ordinary repo docs cleanup.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: codex-operations
  version: "0.1.1"
---

# Codex Memory Curator

## Goal

Audit Codex memories as user-owned durable state: expose stale, unsafe, duplicated, or misplaced entries; propose better destinations; add a structured cleanup plan when approval needs precision; and apply cleanup only after a report, backup, and explicit user approval.

## Core principle

Memory is context, not truth. The latest user request, current repo files, `AGENTS.md`, package files, ADRs, and live evidence override stored memories.

## When to use

- The user asks to review, audit, clean up, prune, rewrite, or remove Codex memories.
- The user mentions `~/.codex/memories`, stale memories, memory pollution, or memories making Codex worse.
- The user wants to decide whether an entry belongs in memory, `AGENTS.md`, repo docs, a skill, config, or deletion.
- The user wants to disable, tune, or audit Codex memory behavior.

## When not to use

- Do not use for ordinary repo documentation cleanup unless Codex memories are part of the task.
- Do not use for generic prompt engineering that does not inspect memory files or memory config.
- Do not modify memories when the user only asked for review.
- Do not inspect unrelated personal files outside Codex memory/config paths and the current repo files needed to verify conflicts.

## Inputs to inspect

- Codex home: `${CODEX_HOME:-$HOME/.codex}` or the user-provided Codex home path.
- Memory files under `<codex-home>/memories`.
- Memory config at `<codex-home>/config.toml` when present.
- The current user request and current repo instructions/docs only when needed to verify conflicts.
- `references/classification-rubric.md` when a classification is not obvious.
- `references/conflict-resolution.md` when memory may conflict with current prompt, `AGENTS.md`, repo docs, package scripts, ADRs, source, or config.
- `references/config-modes.md` when recommending memory config changes.
- `references/memory-store-anatomy.md` when the memory directory contains multiple generated-state file types.
- `references/safe-editing-procedure.md` before modifying memory files.
- `assets/review-report-template.md` when report shape is unclear.
- `assets/cleanup-plan-template.md` when a structured cleanup plan artifact is useful or requested.

## Safety rules

- Never silently delete, rewrite, truncate, or move memory files.
- Ask exactly this before content-changing cleanup:

  ```text
  Do you want me to apply the safe cleanup now? I will back up the memory directory first.
  ```

- Do not edit unless the user clearly approves that cleanup.
- Back up the memory directory before approved edits and report the backup path.
- Do not print full secrets, tokens, credentials, customer data, private identifiers, or sensitive personal data.
- If secret-like data is found, redact values in output, identify file and line when possible, recommend removal, and recommend rotation for real credentials.
- If the memory schema is unclear, do not edit the original file. Write a sibling `.proposed.md` cleanup plan instead.
- Treat memory files as generated state unless local instructions prove otherwise. Do not rewrite append-only evidence to fix a stale curated claim.
- Do not apply repo-specific assumptions globally. Prefer `AGENTS.md` or repo docs for repo rules.
- Do not run broad destructive commands.

## Workflow

1. Discover Codex home:

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
13. Produce the review report before editing. Add a structured cleanup plan only when the user wants ID-by-ID approval, the schema is unknown, sensitive cleanup is proposed, or the edit set is large enough that a table is hard to approve safely.
14. If cleanup is approved, load `references/safe-editing-procedure.md`, run `node scripts/backup-memories.mjs`, apply only approved minimal edits by memory ID, re-read changed sections, and show a trimmed diff summary.

## Classification checks

For each atomic claim, ask:

- Is this stable for months?
- Is this a personal preference or a repo rule?
- Could this mislead Codex in another repository?
- Is it phrased too strongly with `always`, `never`, or `must`?
- Is it duplicated, stale, one-off, or conflicting?
- Does it contain sensitive data?
- Does a higher-precedence source contradict it?
- Would this be more precise as `AGENTS.md`, repo docs, a skill, config, or deletion?
- Is it short enough to stay in memory?

Load `references/classification-rubric.md` for examples and detailed decision rules.

## References

Read only when needed:

- `references/classification-rubric.md` for detailed classification rules and rewrite examples.
- `references/conflict-resolution.md` for precedence rules when memory conflicts with current repo evidence.
- `references/config-modes.md` for memory config mode signals and TOML snippets.
- `references/example-review-report.md` for report shape examples.
- `references/memory-store-anatomy.md` for generated-state boundaries and common memory file buckets.
- `references/safe-editing-procedure.md` before modifying memory files.
- `assets/review-report-template.md` when a concise report template is useful.
- `assets/cleanup-plan-template.md` when a structured cleanup plan is needed.

## Scripts

Use only when needed. All scripts are non-interactive, use Node.js stdlib only, and accept `--help`.

```bash
node scripts/inventory-memories.mjs [--codex-home PATH] [--json]
node scripts/scan-memory-risks.mjs [--codex-home PATH] [--json] [--max-findings N] [--include-generated-evidence]
node scripts/backup-memories.mjs [--codex-home PATH]
```

- `inventory-memories.mjs` is read-only and lists memory files with size/date metadata plus a best-effort file kind.
- `scan-memory-risks.mjs` is read-only, redacts matching lines by default, labels risk categories, limits returned findings, skips generated evidence unless requested, and exits `1` when findings exist.
- `backup-memories.mjs` creates a timestamped backup copy under Codex home; it does not edit or delete memory files.

## Output format

Before edits, lead with this report shape:

```md
# Codex Memory Review

## Top Decisions

1.
2.
3.

## Summary

- Memory files inspected:
- Entries extracted:
- Keep:
- Rewrite:
- Move to AGENTS.md:
- Move to repo docs:
- Move to skill:
- Move to config:
- Delete:
- Ask user:

## Highest-Risk Memories

| ID  | Entry | Risk | Recommendation |
| --- | ----- | ---- | -------------- |

## Proposed Cleanup Table

| ID  | Current memory | Classification | Risk tags | Confidence | Reason | Proposed action |
| --- | -------------- | -------------- | --------- | ---------- | ------ | --------------- |

## Conflict Notes

| ID  | Higher source | Conflict | Recommendation |
| --- | ------------- | -------- | -------------- |

## Optional Cleanup Plan Artifact

- Plan path:
- Plan format: `assets/cleanup-plan-template.md`
- Omit this section for simple review-only work unless the user needs ID-by-ID approval.

## Config Recommendation

## Recommended Next Action
```

After approved edits, also include backup path, files changed, trimmed diff summary, and residual risks.

## Completion criteria

- Relevant memory files and config were inventoried, or a missing-path message was reported.
- Entries were extracted as atomic claims.
- Each entry has exactly one primary classification.
- Each entry has risk tags, confidence, and a proposed action.
- The report distinguishes memory, `AGENTS.md`, repo docs, skills, config, deletion, and ask-user cases.
- Conflicts cite the higher-precedence source that makes the memory stale or misplaced.
- Generated evidence files are treated as evidence unless approved sensitive-data cleanup requires changing them.
- A structured cleanup plan is provided when the user wants ID-by-ID approval, the schema is unknown, sensitive cleanup is proposed, or the edit set is large.
- No memory edit happened before explicit approval.
- Any approved edit has a backup path and verification diff summary.

## Failure modes

- No memory directory: report that no local memories directory was found and suggest checking whether memories are enabled or `CODEX_HOME` points elsewhere.
- Config missing: report that memory behavior may be controlled by app settings or defaults.
- Memory schema unknown: write proposed replacements to a sibling `.proposed.md` file instead of editing the original.
- Sensitive data found: redact the value, identify file and line when possible, recommend removal, require backup before edits, and recommend rotation for real credentials.
- Conflicting rules: cite the conflict, prefer current prompt and repo instructions, then classify as rewrite, move, or delete.
- Backup failure: do not edit memory files.

## Final output instruction

Stay skeptical and concise. Lead with top decisions and the cleanup report, not a long explanation. Give one concrete next action when action is needed.
