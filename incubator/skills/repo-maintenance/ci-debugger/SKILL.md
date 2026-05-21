---
name: ci-debugger
description: Diagnose failed CI jobs and build pipelines using small-log, evidence-first debugging. Use when the user shares a failed GitHub Actions, GitLab CI, Vercel, or package-manager build and wants root cause, minimal fix, and regression test guidance.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# CI Debugger

## Goal

Find the first meaningful CI failure, explain the root cause with evidence, propose the smallest fix, and recommend the validation command that should prevent recurrence.

## When to use

- A CI, build, deploy, or package-manager job failed.
- The user provides logs, a run URL, or asks to inspect CI live.
- Long logs need targeted extraction instead of full dumping.

## When not to use

- The user asks for broad repo health rather than one failed pipeline.
- The failure requires production incident response beyond CI diagnosis.
- The user wants dependency risk review without a failing job; use `dependency-update-review`.

## Inputs

- CI provider, workflow/job name, run URL, failed step, and logs.
- Package manager output, build artifacts, test reports, and recent diffs.
- Repo scripts, workflow YAML, and environment requirements.

## Inputs to inspect

- Inspect the failed step, first meaningful error, relevant workflow config, package scripts, and changed files.
- Use targeted log excerpts instead of dumping full logs.

## Process

1. Identify the failed job and failed step.
2. Extract the first meaningful error, not the last cascade.
3. Search logs with targeted patterns and inspect nearby context.
4. Map the failure to code, config, dependency, environment, or infra.
5. Propose a minimal fix and a regression validation command.
6. Avoid broad rewrites unless the failure proves a systemic issue.

## Workflow

Follow the process above and verify the minimal fix locally when possible. Report skipped live CI checks explicitly.

## Decision points

- If logs are incomplete, ask for the failed step or run URL.
- If credentials or external services are required, separate local validation from live validation.
- If multiple jobs fail, group by shared root cause before fixing each.

## Safety rules

- Do not paste full secrets from logs.
- Do not rerun expensive or write-capable workflows without approval.
- Do not assume downstream failures are separate bugs until the first failure is resolved.

## References

Read `references/ci-log-reading.md` when logs are noisy or very large.

## Scripts

No bundled scripts.

## Output format

Return:

1. Failing job and step
2. First meaningful error
3. Root cause
4. Minimal fix
5. Validation command
6. Remaining risks

## Failure modes

- If logs are missing, request the failed step output or run URL.
- If authentication is needed for live logs, provide local reproduction steps.
- If multiple roots are plausible, rank them by evidence.

## Completion criteria

- Root cause is tied to log evidence.
- Proposed fix is scoped to the failure.
- Validation path is explicit.
