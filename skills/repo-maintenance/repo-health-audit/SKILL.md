---
name: repo-health-audit
description: Audit repository health and maintenance readiness. Use when the user asks for a repo review, maintainer audit, cleanup plan, onboarding audit, technical debt scan, CI/docs/release hygiene review, or public repo readiness check.
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# Repo Health Audit

## Goal

Produce a structured maintenance report that separates urgent repository risks from polish, identifies gaps in onboarding and automation, and recommends the next practical maintainer actions.

## When to use

- The user asks whether a repository is healthy, maintainable, or ready to publish.
- A repo needs a maintainer audit across docs, tests, CI, releases, and security hygiene.
- The user wants a prioritized cleanup plan without immediate code edits.

## When not to use

- The user asks for a focused PR review; use `pr-review`.
- The task is only documentation clarity; use `docs-audit`.
- The user already asked for implementation instead of audit.

## Inputs to inspect

- README, docs, examples, changelog, license, security policy, and contribution guide.
- Package files, lockfiles, test config, format/lint config, and validation scripts.
- CI workflows, issue templates, release automation, and dependency update config.
- Current `git status`, recent commits, and validation output when available.

## Review rubric

Score docs, build/test, CI, release readiness, dependency hygiene, security baseline, issue/PR operations, and agent context from 0 to 5. Read `references/audit-rubric.md` for scoring detail and `references/report-template.md` for the report shape.

## Workflow

1. Inspect top-level files and repository structure.
2. Identify the main stack and validation commands.
3. Review docs against actual commands and files.
4. Check CI, release, security, and contribution surfaces.
5. Run safe validation commands when the user expects implementation-level evidence.
6. Produce a scored report with urgent issues, quick wins, backlog items, and the next action.

## Safety rules

- Do not change repository files unless the user explicitly asks for implementation.
- Do not print secrets or sensitive config values in the audit.
- Mark live repository settings as unverified unless they were checked directly.

## References

Read only when needed:

- `references/audit-rubric.md`
- `references/report-template.md`

## Scripts

No bundled scripts.

## Output format

Return:

1. Summary
2. Scores table
3. Highest-risk issues
4. Quick wins
5. Suggested issue backlog
6. Recommended next action

## Failure modes

- If validation cannot run, explain the missing tool, dependency, or environment.
- If the repo lacks clear goals, state the inferred goal and mark it as an assumption.
- If live settings are required, say which settings need verification.

## Completion criteria

- The report is grounded in file or command evidence.
- Risks are prioritized by maintainer impact.
- The next action is concrete and small enough to assign.
