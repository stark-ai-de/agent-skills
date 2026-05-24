# Safe Editing Procedure

Use this before modifying any Codex memory file.

## Approval Gate

Before any destructive or content-changing action, ask exactly:

```text
Do you want me to apply the safe cleanup now? I will back up the memory directory first.
```

Do not proceed unless the user clearly approves the cleanup.

## Backup

Run the bundled script:

```bash
node scripts/backup-memories.mjs
```

Record the backup path in the final answer.

Before editing, record the approved memory IDs from the review report or cleanup plan. Do not edit an entry that lacks explicit approval.

## Editing Rules

- Apply only changes the user approved.
- Apply changes by memory ID from the review report or cleanup plan, not by broad pattern.
- Prefer the smallest edit that removes risk.
- Preserve the original file format, headings, and ordering where practical.
- Never delete the only copy of a memory file.
- Do not print secrets or full sensitive values in diffs or summaries.
- If a line contains a real secret, remove or redact it after backup and tell the user to rotate it.
- Re-read each changed section after editing to verify the approved action was applied.

## Unknown Schema

If the memory file format is unclear, report:

```text
The memory file format is unclear. I will not edit it directly. I will write proposed replacements to a separate `.proposed.md` file instead.
```

Then write a sibling proposal file such as:

```text
MEMORY.md.proposed.md
```

The proposal should contain replacement entries or deletion notes, not an attempted rewrite of the unknown format.

## Diff

After approved edits, show only a trimmed diff or summarize the changed paths and actions.
If the diff includes sensitive values, summarize the location and action instead of printing the value.

Include the approved memory IDs in the summary:

```text
Applied: M-2 MOVE TO AGENTS.md, M-6 DELETE
Skipped: M-4 ASK USER
```

## Recovery

- If backup creation fails, do not edit.
- If an edit fails midway, restore the changed file or directory from the backup path.
- If restore fails, stop immediately and report the backup path and the command output.
- If the user changes scope mid-cleanup, stop and re-confirm the remaining edit set.
