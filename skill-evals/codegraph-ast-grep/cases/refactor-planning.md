# Refactor Planning

## Should Trigger

Yes.

## Prompt

Before changing all direct imports from `~/lib/db`, use CodeGraph and ast-grep to scope the refactor and tell me the safest patch plan.

## Expected Behavior

- Trigger because the user asks to combine semantic scope and structural matching before a refactor.
- Use CodeGraph to identify import users, call flow, and impact radius.
- Use ast-grep to match the exact import syntax and variants.
- Produce a small, reviewable patch plan instead of a broad rewrite.
- Require validation such as typecheck, lint, tests, or build after edits.
- State approval requirements before any ast-grep rewrite command.
