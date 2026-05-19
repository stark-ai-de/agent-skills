---
name: codex-memory-curator
description: Review, grill, clean up memories, rewrite, and prune Codex memories. Use when the user asks to review memories, audit ~/.codex/memories, remove stale memories, reduce memory pollution, decide if memories made Codex worse, move memory to AGENTS.md, disable or tune memories, or choose AGENTS.md, config, docs, skills, or deletion.
license: MIT
metadata:
  author: stark-ai-de
  category: codex-operations
  version: "0.1.0"
---

# Codex Memory Curator

## Goal

Audit Codex memories so durable facts remain useful, stale or harmful entries are exposed, and cleanup happens only after a review report, backup, and explicit user approval.

## Core principle

Treat memory as user-owned durable state, not as truth. Current user instructions, repo files, `AGENTS.md`, package files, and live evidence override memory.

## When to use

- The user asks to review memories, clean up memories, audit `~/.codex/memories`, prune memories, or investigate memory pollution.
- The user says memories made Codex worse, stale memories are misleading work, or repo-specific assumptions leaked across repos.
- The user wants to decide whether an entry belongs in memory, `AGENTS.md`, repo docs, a skill, config, or deletion.
- The user wants to disable or tune memories after seeing degraded Codex output.

## When not to use

- Do not use for ordinary repo documentation cleanup unless Codex memories are part of the task.
- Do not use for generic prompt engineering that does not inspect memory files or memory config.
- Do not modify user-owned memories when the user only asked for review.
- Do not read unrelated personal files outside Codex memory/config paths and the current repo sources needed to verify conflicts.

## Inputs to inspect

- Codex home: `${CODEX_HOME:-$HOME/.codex}`.
- Memory files under `${CODEX_HOME:-$HOME/.codex}/memories`.
- Memory config at `${CODEX_HOME:-$HOME/.codex}/config.toml`.
- The current user prompt, current repo `AGENTS.md`, repo docs, package files, and source files only when needed to verify conflicts.
- Optional bundled references:
  - `references/classification-rubric.md` for detailed decision rules and softening examples.
  - `references/safe-editing-procedure.md` before modifying memory files.
  - `references/example-review-report.md` when report shape is unclear.
  - `references/config-modes.md` when recommending memory config changes.

## Safety rules

- Never silently delete, rewrite, truncate, or move memory files.
- Ask for approval before any edit and back up the memory directory before applying approved edits.
- Do not store secrets, tokens, credentials, customer data, private identifiers, or sensitive personal data in memory.
- If secret-like data is found, do not print the full value. Identify file and line if possible, recommend removal, and recommend rotation if a real credential may have been stored.
- Do not treat memories as authoritative over current repo instructions or the user's latest request.
- Do not invent a memory schema. If the file format is unclear, write proposed replacements to a separate `.proposed.md` file instead of editing the original.
- Do not apply repo-specific assumptions globally. Prefer `AGENTS.md` or repo docs for repo rules.
- Do not run broad destructive commands.

## Classification rubric

Assign exactly one primary classification to each atomic entry:

- `KEEP`: Stable personal preference or durable cross-repo fact that remains accurate and short.
- `KEEP BUT REWRITE`: Useful idea that is stale, too broad, too strong, ambiguous, too long, or missing scope.
- `MOVE TO AGENTS.md`: Repo-specific command, coding convention, path, test rule, ownership boundary, or generated-file restriction.
- `MOVE TO REPO DOCS`: Detailed architecture or operational context that should be visible to humans and agents.
- `MOVE TO SKILL`: Reusable workflow that should load on demand instead of being injected as memory.
- `MOVE TO CONFIG`: Behavior that is really a Codex config setting.
- `DELETE`: Harmful, stale, duplicated, too narrow, sensitive, one-off, or conflicting memory.
- `ASK USER`: Important-looking entry that cannot be safely classified from available evidence.

Optional secondary tags:

- `stale`
- `duplicated`
- `too-broad`
- `too-specific`
- `repo-specific`
- `workflow`
- `config`
- `sensitive`
- `conflicting`
- `useful`

## Review process

1. Discover Codex home:

   ```bash
   echo "${CODEX_HOME:-$HOME/.codex}"
   ```

2. Inventory memory files without printing their contents:

   ```bash
   bash scripts/inventory-memories.sh
   ```

   Equivalent direct command:

   ```bash
   find "${CODEX_HOME:-$HOME/.codex}/memories" -maxdepth 2 -type f -print 2>/dev/null
   ```

3. If no memory directory exists, report:

   ```text
   No local memories directory was found. Check whether memories are enabled or whether CODEX_HOME points to a non-default location.
   ```

4. Inspect memory config:

   ```bash
   sed -n '1,220p' "${CODEX_HOME:-$HOME/.codex}/config.toml" 2>/dev/null
   ```

5. If config is missing, report:

   ```text
   No config.toml was found. Memory behavior may be controlled by app settings or defaults.
   ```

6. Classify the active memory mode as one of:
   - Disabled
   - Enabled but not injected
   - Enabled and injected
   - External-context generation disabled
   - Unknown

7. Read memory files in small chunks. Use `sed -n`, avoid huge dumps, and summarize large files incrementally.

8. Extract one atomic claim per row. Split compound entries before classification.

9. For every atomic entry, ask internally:
   - Is this stable for months?
   - Is this a personal preference or a repo rule?
   - Could this mislead Codex in another repository?
   - Is it phrased too strongly?
   - Does it contain `always`, `never`, or `must` when the rule is contextual?
   - Is it duplicated?
   - Does it conflict with `AGENTS.md`, repo docs, package files, or the current user prompt?
   - Does it contain secrets, customer data, private identifiers, or sensitive personal data?
   - Would this be more precise as a skill, config setting, or repo document?
   - Is it short enough to be a memory?

10. Produce the review report before any edit.

## Workflow

1. Discover Codex home and inventory memory files.
2. Inspect memory-related config and classify the current memory mode.
3. Extract memory entries into atomic claims.
4. Classify each claim with one primary classification and optional tags.
5. Identify highest-risk entries: stale, duplicated, overbroad, sensitive, repo-specific, conflicting, or config-shaped.
6. Produce a review report with proposed actions before editing.
7. Ask the required approval question before cleanup:

   ```text
   Do you want me to apply the safe cleanup now? I will back up the memory directory first.
   ```

8. If approved, back up the memory directory.
9. Apply only approved minimal edits, preserving the original file format.
10. Re-read changed sections and show a trimmed diff.
11. Summarize changed files, backup path, and remaining risks.

## Backup and edit rules

- Run `bash scripts/backup-memories.sh` before approved modifications.
- The backup path should be under `${CODEX_HOME:-$HOME/.codex}` as `memories.backup.YYYYMMDD-HHMMSS`.
- Never delete the only copy of a memory file.
- Preserve the original file format and ordering where practical.
- If schema is unclear, do not edit the original. Write proposed replacements to `.proposed.md`.
- After edits, show a trimmed diff:

  ```bash
  diff -ru "$BACKUP_DIR" "$MEM_DIR" | sed -n '1,240p'
  ```

## Config recommendations

- Audit Mode: use when testing whether memory injection worsens Codex output.
- Safer Normal Mode: use for daily work while reducing noisy memory generation.
- Exact Repo Work Mode: use for migrations, refactors, debugging, and architecture work where stale assumptions are harmful.
- Off Mode: use when memory behavior is actively harming output and the user wants a full reset.

Load `references/config-modes.md` when the user wants exact TOML snippets.

## References

Read only when needed:

- `references/classification-rubric.md`
- `references/config-modes.md`
- `references/example-review-report.md`
- `references/safe-editing-procedure.md`
- `assets/review-report-template.md`

## Scripts

Use only when needed:

```bash
bash scripts/backup-memories.sh
bash scripts/inventory-memories.sh
bash scripts/scan-memory-risks.sh
```

## Output format

Before edits, output this report shape:

```md
# Codex Memory Review

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

| ID  | Current memory | Classification | Reason | Proposed action |
| --- | -------------- | -------------- | ------ | --------------- |

## Config Recommendation

<recommended config mode>

## Recommended Next Action

<one concrete next step>
```

After approved edits, also include:

- Backup path
- Files changed
- Trimmed diff summary
- Residual risks

## Completion criteria

- Relevant memory files and config were inventoried or a missing-path message was reported.
- Entries were extracted as atomic claims.
- Each entry has exactly one primary classification.
- The report distinguishes memory, `AGENTS.md`, repo docs, skills, config, deletion, and ask-user cases.
- No memory edit happened before approval.
- Any approved edit has a backup path and verification diff.

## Failure modes

- No memories directory:

  ```text
  No local memories directory was found. Check whether memories are enabled or whether CODEX_HOME points to a non-default location.
  ```

- Config missing:

  ```text
  No config.toml was found. Memory behavior may be controlled by app settings or defaults.
  ```

- Memory schema unknown:

  ```text
  The memory file format is unclear. I will not edit it directly. I will write proposed replacements to a separate `.proposed.md` file instead.
  ```

- Sensitive data found: redact the value, identify file and line if possible, recommend removal, require backup before edits, and recommend rotation for real credentials.
- Conflicting rules: cite the conflict, prefer current prompt and repo instructions, then classify as rewrite, move, or delete.

## Recovery behavior

- If backup fails, do not edit memory files.
- If an edit fails midway, restore from the backup path before continuing.
- If ownership or schema is unclear, stop at a `.proposed.md` artifact and ask for the user's decision.

## Final output instruction

Stay skeptical and concise. Lead with the cleanup report, not a long explanation. When action is needed, give one concrete next step.
