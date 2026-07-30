# Refactor Planning

## Should Trigger

Yes.

## Prompt

Before changing all direct imports from `~/lib/db`, use CodeGraph and ast-grep to scope the refactor and tell me the safest patch plan.

## Expected Behavior

- Inspect selected root, tool capabilities/provenance, ast-grep config, and repo status without opening the graph; obtain affirmative approval for that root or an approved disposable copy before graph-state or semantic diagnostics.
- Check stable updates for selected CodeGraph/ast-grep at most once with telemetry separately consented, asking item-by-item only when an eligible update exists.
- Use available CodeGraph semantic evidence for ownership, callers/dependents, and likely tests.
- Use ast-grep for exact import forms and inventory default/named/aliased/dynamic variants with bounded paths.
- Reconcile semantic and structural differences before fixing the patch scope.
- Produce reviewable batches and project-native validation, not a broad rewrite command.
- If a rewrite is later requested, require rule tests, match preview/count, exact scope, approval, diff review, and validation.
- Keep optional codemod tools out unless the migration becomes multi-step/programmatic and the user approves that escalation.
