---
name: agent-context-bootstrap
description: Bootstrap repo-local agent context for Codex and other coding agents. Use when setting up AGENTS.md, docs/agents, issue tracker rules, triage labels, domain docs, ADR locations, validation commands, or skill usage instructions for a repository.
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# Agent Context Bootstrap

## Goal

Create or improve repo-local agent context so future agents can work from the repository's real commands, docs, issue tracker rules, and skill guidance without overwriting existing instructions.

## When to use

- A repository lacks `AGENTS.md` or agent-facing docs.
- The user wants Codex, Claude Code, Cursor, or another agent to follow local workflow rules.
- A repo needs issue tracker notes, triage labels, domain docs, ADR locations, or validation commands documented.

## When not to use

- The user only wants a one-time handoff; use `handoff`.
- The user wants a repo health report without changing context files; use `repo-health-audit`.
- The repository already has clear agent instructions and the user did not ask for edits.

## Inputs

- Existing `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `.cursor`, `.codex`, and docs files.
- `README.md`, package files, CI workflows, issue templates, and docs/ADR folders.
- Maintainer-provided issue tracker, labels, and domain-specific workflow notes.

## Inputs to inspect

- Inspect the files listed in `Inputs`, plus current `git status` and validation scripts before editing.
- Check existing instructions for ownership and contradictions before adding new text.

## Process

1. Inspect existing agent instructions before proposing edits.
2. Identify validation commands, package manager, docs locations, and issue tracker.
3. Create or update `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/domain-docs.md` when useful.
4. Add or update an `## Agent skills` block in `AGENTS.md`.
5. Preserve existing local instructions unless they are clearly obsolete and the user approves replacement.
6. Validate formatting and links where repo tooling supports it.

## Workflow

Follow the process above, then report exactly which context files changed and which decisions still need maintainer input.

## Decision points

- If the issue tracker is unknown, ask before inventing tracker-specific rules.
- If multiple agent instruction files exist, keep each tool's conventions and avoid duplication.
- If a repo has private operational details, keep public docs generic and put local specifics in ignored files.

## Safety rules

- Do not overwrite existing instructions blindly.
- Do not include credentials, internal hostnames, private repo paths, or customer details.
- Do not assert commands work unless verified.

## Assets

Use only when creating new files:

- `assets/agents-block.md` for an `AGENTS.md` skill block.
- `assets/issue-tracker.md` for tracker notes.
- `assets/domain-docs.md` for domain documentation mapping.

## References

Read only when needed:

- `assets/agents-block.md`
- `assets/domain-docs.md`
- `assets/issue-tracker.md`

## Scripts

No bundled scripts.

## Output format

Return:

1. Files inspected
2. Context added or proposed
3. Existing instructions preserved
4. Validation result
5. Follow-up decisions needed

## Failure modes

- If the issue tracker is unknown, stop before writing tracker-specific instructions.
- If existing instructions conflict, surface the conflict instead of overwriting.
- If validation cannot run, explain what tool or command is missing.

## Completion criteria

- Future agents can find repo rules, validation commands, issue tracker guidance, and domain docs.
- Existing instructions remain intact unless intentionally changed.
- Sensitive details are excluded.
