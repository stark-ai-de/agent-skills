---
name: test-first-implementation
description: Implement behavior with a red-green-refactor loop, observable tests, and small vertical slices. Use when the user asks for TDD, test-first work, regression-first fixes, or a feature that needs clear behavior before implementation.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  internal: true
  version: "0.1.0"
---

# Test-First Implementation

## Goal

Drive implementation from observable behavior: write a failing test, make it pass with the smallest change, then refactor without changing behavior.

## When to use

- The user asks for TDD, red-green-refactor, test-first implementation, or regression-first work.
- A feature can be expressed as observable behavior, API output, UI state, CLI output, or integration behavior.
- A bug fix should start with a failing regression test.

## When not to use

- The repo has no runnable feedback loop and the user only needs a prototype.
- The task is documentation-only or configuration-only.
- The user explicitly asks for implementation without adding tests.

## Inputs to inspect

- User story, acceptance criteria, bug reproduction, or expected behavior.
- Existing tests, test helpers, fixtures, and package scripts.
- `docs/agents/validation.md` when present.
- Nearby production code only after selecting the behavior boundary.

## Workflow

1. Identify the smallest vertical behavior slice.
2. Choose the most stable observable test boundary; avoid testing private implementation details.
3. Write or update a test that fails for the right reason.
4. Run the focused test and capture the red result.
5. Implement the minimum production change.
6. Run the focused test again and capture the green result.
7. Refactor only if it improves clarity without broadening scope.
8. Run the smallest relevant validation suite.

## Safety rules

- Do not test private helpers just to make coverage easy.
- Do not add snapshots for behavior that should be asserted directly.
- Do not change production code before proving the test fails unless the repo cannot run tests.
- Do not broaden the feature while chasing test convenience.

## References

No bundled references. Use downstream `docs/agents/validation.md` for test commands and domain docs for expected behavior when present.

## Scripts

No bundled scripts.

## Output format

Return:

1. Behavior slice selected
2. Test boundary and why it was chosen
3. Red result
4. Implementation summary
5. Green result
6. Follow-up validation
7. Remaining risks

## Completion criteria

- A meaningful test fails before implementation and passes afterward.
- The implementation is scoped to the selected behavior.
- Validation commands and results are reported.
- Any missing test capability is explicitly documented.

## Failure modes

- If no test framework exists, propose the smallest safe test setup or ask before adding one.
- If the red test fails for the wrong reason, fix the test before production code.
- If the behavior is too large, slice it smaller before coding.
