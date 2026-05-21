---
name: codex-context-guard
description: Prevent Codex context-window exhaustion during long-running refactors, repo audits, migrations, debugging sessions, or tasks with large logs, many file reads, or repeated tool output. Use when Codex context is getting high, /compact may be needed, or the user asks for context-efficient workflows.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: codex-operations
  version: "0.1.0"
---

# Codex Context Guard

## Goal

Keep a long Codex session useful by reducing unnecessary context growth, preserving decisions in a compact handoff, and choosing bounded next steps before the thread becomes hard to continue.

## Trigger conditions

- The task has many files, logs, diffs, generated outputs, or repeated tool calls.
- The user asks whether to compact, summarize, or continue in a new thread.
- The agent is about to inspect broad files without a specific need.

## When to use

- Use when context budget, log volume, or file-reading scope is becoming a risk.
- Use before compacting a long session or moving work to another thread.

## When not to use

- Do not use for short, self-contained tasks that have no context pressure.
- Do not use as a substitute for actually validating completed work.

## Inputs to inspect

- Current objective, recent user instructions, changed files, validation output, and unresolved blockers.
- Use `git status --short` and `git diff --stat` before reading large diffs.

## Rules

- Prefer targeted `rg`, `sed`, `git diff --stat`, and small file ranges over whole-file dumps.
- Keep one bounded objective active at a time.
- Store durable state in a handoff artifact when the work will outlive the current context.
- Summarize large outputs instead of pasting them back to the user.
- Tell the user when a compaction or handoff would preserve momentum.

## Workflow

1. Identify the current objective, latest decision, and next blocking question.
2. Replace broad exploration with a targeted search plan.
3. Track changed files, validation commands, and open risks in a compact note.
4. Use references only when they solve the immediate context problem.
5. When context is high, prepare a handoff and recommend `/compact` or a new thread.

## Commands

Useful low-context commands:

```bash
git diff --stat
git status --short
rg -n "pattern" path
sed -n '1,120p' path/to/file
```

## Safety rules

- Do not hide failed validation behind a summary.
- Do not discard unresolved blockers when compacting.
- Do not paste secrets or full large logs into handoff text.

## References

Read only when needed:

- `references/context-budgeting.md` for large task tactics.
- `references/handoff-template.md` when writing a handoff file.

## Scripts

No bundled scripts.

## Output format

Return:

1. Current objective
2. Context risks
3. What to keep in active context
4. What to move to a handoff
5. Recommended next bounded action

## Completion criteria

- The active objective and next action are clear.
- Large context sources have been summarized or moved to a handoff.
- Validation failures and blockers remain visible.

## Failure modes

- If context is already overloaded, stop broad reads and produce a compact state summary.
- If important evidence is missing, name the missing command or file instead of guessing.

## Recovery behavior

If the thread is already overloaded, stop broad exploration, write a compact state summary, name the most recent verified command result, and recommend continuing from the handoff.
