# Shared Quality in a Mixed Repository

## Should Trigger

Yes.

## Prompt

A Python package includes maintained JavaScript release helpers and a generated vendored JavaScript bundle. The user requests an architecture governance plan for shared quality without implementation. Python checks must remain. Explain the scope and migration decisions.

## Deterministic Assertions

- contains: AC-ADR-069
- contains: JavaScript
- contains: Python
- contains: generated
- contains: vendor
- contains: owner
- not_contains: all JavaScript is exempt
- not_contains: replace Python tooling

## Expected Behavior

Select a planning route, inventory actual maintained JavaScript helpers, apply the mandatory shared policy to that boundary, retain Python verification and classify generated/vendor bytes by ownership. Record paths, exception evidence, baseline migration where needed and clean-install/CI proof; do not install or rewrite source during the plan.

## Evidence Stage

source/static: this case specifies expected agent behavior. A structural pass does not establish a live agent run, installation or hosted enforcement.
