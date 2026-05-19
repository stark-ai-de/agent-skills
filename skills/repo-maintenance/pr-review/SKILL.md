---
name: pr-review
description: Review pull requests for correctness, maintainability, tests, security, docs impact, release risk, and agent-induced failure modes. Use when the user asks for a PR review, diff review, merge readiness check, or maintainer feedback.
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# PR Review

## Goal

Produce a maintainer-grade review that prioritizes correctness, regressions, missing tests, security concerns, docs drift, and release risk over style-only feedback.

## When to use

- The user asks for a PR review, diff review, or merge readiness check.
- A branch or worktree needs review before merge.
- Agent-authored changes need an independent risk pass.

## When not to use

- The user asks to implement fixes immediately; review only if requested.
- The change is only documentation; consider `docs-audit`.
- The request is a whole-repo health review; use `repo-health-audit`.

## Inputs to inspect

- PR description, changed files, commits, and diff stats.
- Relevant source files, tests, docs, CI output, and release notes.
- Existing architecture or workflow docs that govern touched areas.

## Review rubric

Check behavior changes, API contracts, data migrations, error handling, tests, docs, security-sensitive paths, dependencies, and deployment risk. Read `references/review-rubric.md` for detailed prompts and `references/risk-table-template.md` for report format.

## Workflow

1. Inspect diff stats and changed file names first.
2. Identify user-visible behavior and contract changes.
3. Read only the surrounding code needed to verify risk.
4. Check tests and docs touched by the change.
5. Run or report relevant validation if available.
6. Lead with findings ordered by severity and include file/line evidence.
7. Include a verdict only after findings.

## Safety rules

- Do not approve, merge, push, or dismiss review comments unless explicitly authorized.
- Do not expose secrets from diffs, logs, or CI output.
- Separate confirmed findings from assumptions and coverage limits.

## References

Read only when needed:

- `references/review-rubric.md`
- `references/risk-table-template.md`

## Scripts

No bundled scripts.

## Output format

Return:

1. Verdict
2. Blocking issues
3. Non-blocking suggestions
4. Test coverage
5. Release risk
6. Suggested review comments

## Failure modes

- If line numbers are unavailable, reference file paths and nearby symbols.
- If validation cannot run, say what was skipped and why.
- If the diff is too large, review the riskiest areas first and state coverage limits.

## Completion criteria

- Findings are concrete, reproducible, and tied to changed behavior.
- Severity order is clear.
- Test and release risks are explicit.
