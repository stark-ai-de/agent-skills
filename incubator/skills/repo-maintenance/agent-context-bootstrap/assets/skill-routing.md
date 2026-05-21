# Skill Routing

Document which skills agents should use in this repository.

## Repository Defaults

- Use `$repo-health-audit` for broad repository readiness.
- Use `$pr-review` for review-only requests.
- Use `$issue-triage` for issue inbox cleanup.
- Use `$docs-audit` for documentation readiness checks.
- Use `$codex-spec-interviewer` for fuzzy feature, refactor, migration, or architecture requests that need a spec before implementation.
- Use `$handoff` before pausing or switching threads.

## Local Overrides

Add repository-specific preferences here.

## Rules

- Do not use a skill just because it exists; use it when its trigger matches the task.
- Hard dependencies such as issue tracker mutation rules live in `docs/agents/issue-tracker.md`.
- Domain docs and ADRs are soft dependencies unless the task changes architecture or domain behavior.
