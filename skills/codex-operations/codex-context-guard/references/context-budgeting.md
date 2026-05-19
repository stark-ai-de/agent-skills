# Context Budgeting

Use this when a task spans many files, long logs, or repeated validation runs.

## Prefer

- `git diff --stat` before full diffs.
- Targeted `rg` searches before opening files.
- `sed -n` ranges around matching lines.
- One focused validation command before broad suites.
- Short status notes that name evidence paths and commands.

## Avoid

- Re-reading files already summarized.
- Pasting entire logs into chat.
- Loading every reference file because it exists.
- Mixing unrelated refactors in one thread.

## Handoff Minimum

A useful handoff needs objective, current repo state, files changed, decisions made, commands run, failures, blockers, and the next action. It does not need full diffs.
