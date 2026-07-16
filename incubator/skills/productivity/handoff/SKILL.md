---
name: handoff
description: Write a compact handoff document so a fresh agent, thread, or session can continue. Use when context is long, the user wants to switch threads, work must be paused, or the agent needs to summarize current state without duplicating existing docs or diffs.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: productivity
  version: "0.1.1"
---

# Handoff

## Goal

Create a compact continuation artifact that lets another agent resume the task without re-reading the entire thread or losing important decisions.

## Trigger conditions

- The user asks for a handoff, checkpoint, resume note, or context summary.
- The current thread is long or close to compaction.
- Work must pause before validation, review, merge, or release.

## When to use

- Use when another agent, thread, or future session must continue the same work.
- Use before compacting a long-running implementation or review thread.

## When not to use

- Do not use for a final answer when the task is complete.
- Do not use to replace source files, issues, PR descriptions, or validation logs.

## Inputs to inspect

- Latest user instruction, current objective, changed files, validation commands, failures, and blockers.
- Use `git status --short` and `git diff --stat` when working inside a repository.

## Rules

- Reference files, diffs, PRs, issues, and reports by path or URL instead of duplicating content.
- Include only decisions, evidence, validation status, blockers, and next steps needed to continue.
- Separate confirmed facts from assumptions.
- Keep secrets out of the handoff.

## Workflow

1. Identify the objective and the latest user instruction.
2. Summarize decisions and why they were made.
3. List changed files or active work areas.
4. Record commands run and their outcomes.
5. Name blockers, risks, and missing approvals.
6. End with the next concrete action.

## Commands

Useful commands before writing:

```bash
git status --short
git diff --stat
git log --oneline -5
```

## Safety rules

- Do not include tokens, credentials, or sensitive snippets.
- Do not imply validation passed unless it was run and succeeded.
- Do not bury approvals required for destructive or remote actions.

## Assets

Use `assets/handoff-template.md` when the user wants a file-based handoff.

## References

Read only when needed:

- `assets/handoff-template.md`

## Scripts

No bundled scripts.

## Output format

Return a handoff with:

1. Objective
2. Current state
3. Decisions
4. Files changed
5. Commands and validation
6. Blockers and risks
7. Next action

## Completion criteria

- The next agent can resume without reading the whole conversation.
- Unverified assumptions and failed validation are explicit.
- The next action is concrete.

## Failure modes

- If repo state cannot be checked, mark file and validation status as unverified.
- If context is incomplete, separate confirmed facts from assumptions.

## Recovery behavior

If context is incomplete, mark uncertain items as assumptions and list the exact repo commands or URLs the next agent should inspect first.
