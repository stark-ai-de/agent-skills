---
name: agent-context-bootstrap
description: Bootstrap repo-local agent context for Codex and other coding agents. Use when setting up AGENTS.md, docs/agents, issue tracker rules, triage labels, domain docs, ADR locations, validation commands, or skill usage instructions for a repository.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# Agent Context Bootstrap

## Goal

Create or improve repo-local agent context so future agents can work from the repository's real commands, docs, issue tracker rules, domain language, ADRs, validation commands, and skill routing without overwriting existing instructions.

## When to use

- A repository lacks `AGENTS.md` or agent-facing docs.
- The user wants Codex, Claude Code, Cursor, or another agent to follow local workflow rules.
- A repo needs issue tracker notes, triage labels, domain docs, ADR locations, or validation commands documented.
- A downstream repo needs predictable first-run agent setup before using workflow skills.

## When not to use

- The user only wants a one-time handoff; use `handoff`.
- The user wants a repo health report without changing context files; use `repo-health-audit`.
- The repository already has clear agent instructions and the user did not ask for edits.
- The user wants to publish a skill catalog; use `skill-repo-curator`.

## Inputs to inspect

- Existing `AGENTS.md`, `CLAUDE.md`, `.codex/`, `.cursor/`, `CONTEXT.md`, `CONTEXT-MAP.md`, and docs files.
- `README.md`, package files, validation scripts, CI workflows, issue templates, labels, and `.github/`.
- `docs/adr/`, architecture docs, domain docs, and existing `docs/agents/`.
- Maintainer-provided issue tracker, triage labels, validation commands, runtime conventions, and domain-specific workflow notes.
- `git status --short` before editing.

## Workflow

1. Inspect current agent instructions and docs before proposing edits.
2. Infer what is safe from repo files: package manager, validation scripts, ADR location, CI commands, issue templates, and existing domain docs.
3. Ask for maintainer input only when the repo cannot answer a hard setup decision: issue tracker, live label names, domain glossary location, validation command, or agent runtime convention.
4. Create or update `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain-docs.md`, `docs/agents/validation.md`, and `docs/agents/skill-routing.md`.
5. Add or update an `## Agent skills` block in the primary agent instruction file, usually `AGENTS.md`.
6. Preserve existing user instructions and never overwrite unrelated sections.
7. Validate links, formatting, and available repo checks.

## Setup docs

Use these conventions when writing downstream setup docs:

- Hard dependencies, such as issue tracker mutation rules, must point to `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`.
- Validation commands belong in `docs/agents/validation.md`.
- Skill routing and local skill preferences belong in `docs/agents/skill-routing.md`.
- Soft dependencies, such as domain language and ADRs, should point to `docs/agents/domain-docs.md` without blocking normal work when the docs are missing.

## Ask vs infer

- Infer package manager, validation scripts, ADR location, issue templates, CI commands, and existing docs from files.
- Ask for the canonical issue tracker when none is obvious.
- Ask before inventing labels, project board states, assignment rules, or live mutation policy.
- Ask for domain glossary ownership if multiple docs could be the source of truth.
- Ask before replacing existing agent instructions; otherwise append or update bounded sections only.

## Safety rules

- Do not overwrite existing instructions blindly.
- Do not include credentials, internal hostnames, private repo paths, or customer details.
- Do not assert commands work unless verified.
- Do not create tool-specific files such as `CLAUDE.md` or `.cursor/rules` unless the repo already uses them or the user asks for that runtime.
- Do not mutate live issue trackers, labels, projects, or repository settings.

## Assets

Use only when creating new files:

- `assets/agents-block.md` for an `AGENTS.md` skill block.
- `assets/issue-tracker.md` for tracker notes.
- `assets/triage-labels.md` for label conventions.
- `assets/domain-docs.md` for domain documentation mapping.
- `assets/domain-language.md` for glossary structure.
- `assets/validation.md` for validation commands.
- `assets/skill-routing.md` for skill selection guidance.

## References

Read only when needed:

- `assets/agents-block.md`
- `assets/domain-docs.md`
- `assets/domain-language.md`
- `assets/issue-tracker.md`
- `assets/skill-routing.md`
- `assets/triage-labels.md`
- `assets/validation.md`

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
- If the repo has no domain glossary, create a placeholder or document the selected source of truth without inventing domain vocabulary.

## Completion criteria

- Future agents can find repo rules, validation commands, issue tracker guidance, and domain docs.
- Existing instructions remain intact unless intentionally changed.
- Sensitive details are excluded.
- Hard workflow dependencies point to `docs/agents/` setup docs.
