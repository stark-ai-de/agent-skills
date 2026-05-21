---
name: debugging-diagnosis
description: Diagnose and fix bugs through reproduction, minimization, hypotheses, instrumentation, targeted fixes, and regression coverage. Use when the user reports failing behavior, a broken test, runtime error, flaky workflow, or asks for debugging before implementation.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  internal: true
  version: "0.1.0"
---

# Debugging Diagnosis

## Goal

Find the smallest proven cause of a bug, fix it, and leave regression coverage or clear validation evidence.

## When to use

- The user reports a bug, failing test, runtime error, broken workflow, or flaky behavior.
- A prior fix was speculative and needs a reproducible diagnosis.
- The task needs root cause analysis before a code change.

## When not to use

- The user asks for a pure design plan with no failing behavior.
- The task is a known mechanical edit with an obvious validation command.
- The user asks for a broad repo audit rather than a specific failure.

## Inputs to inspect

- Exact error text, logs, screenshots, failing test output, or reproduction steps.
- Recent diffs and `git status --short`.
- Relevant package scripts, test commands, CI workflow, issue context, and domain docs if present.
- Existing tests around the failing behavior.

## Workflow

1. Establish the failure in the current environment or state what cannot be reproduced.
2. Minimize the reproduction to the smallest command, input, route, component, or test case.
3. Form one or more falsifiable hypotheses and inspect only the files needed to test them.
4. Add temporary instrumentation only when it answers a specific question; remove it before completion.
5. Fix the smallest cause that explains the reproduction.
6. Add or update regression coverage at the observable behavior boundary.
7. Re-run the reproduction and the smallest relevant validation command.

## Safety rules

- Do not make broad rewrites before proving the failure path.
- Do not hide a failure by weakening assertions, swallowing errors, or deleting coverage.
- Do not leave debug logs, probes, or temporary scripts behind.
- Do not claim a bug is fixed without a passing reproduction or an explicit validation limitation.

## References

No bundled references. If the repo has `docs/agents/validation.md` or domain docs, inspect them when selecting validation commands or domain-specific expected behavior.

## Scripts

No bundled scripts.

## Output format

Return:

1. Reproduction command or reason reproduction was unavailable
2. Root cause
3. Files changed
4. Regression coverage added
5. Validation commands and results
6. Remaining risks

## Completion criteria

- The failure is reproduced or the reproduction gap is explicit.
- The root cause is tied to observed evidence.
- The fix is narrow and validated.
- Regression coverage exists unless the repo has no suitable test surface, in which case the reason is stated.

## Failure modes

- If the failure cannot be reproduced, preserve evidence and ask for the missing input rather than guessing.
- If multiple causes are plausible, test them one at a time.
- If validation is too expensive, run the smallest reliable subset and name the unrun command.
