# Shadcn Lint Staged Enforcement

## Should Trigger

Yes.

## Prompt

An existing app adopts all shadcn lint rules. Legacy code has findings and its root lint command uses --deny-warnings. A teammate proposes changing every new rule to warn and calling the migration nonblocking and complete.

## Deterministic Assertions

- contains: --deny-warnings
- contains: baseline
- contains: owner
- contains: promotion
- contains: report-only
- contains: partial

## Expected Behavior

Identify the actual nonzero warning policy. Preserve unrelated gates and use an explicitly scoped report lane if approved. Measure any warning budget and record scope, cleanup criteria, owner and revisit trigger. Keep qualified new code strict, promote each rule after proof, and report the legacy stage as partial adoption.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded
agent run or an executed plugin/runtime qualification. Structural validation
checks its inventory and assertions; target adoption requires separate evidence.
