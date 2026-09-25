# Shadcn Lint Default Profile

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan design-system lint adoption for a Tailwind v4 app with supported TSX. The maintainer wants comprehensive defaults, upstream adoption examples, and practical ESLint and Oxlint setup guidance.

## Deterministic Assertions

- contains: AC-ADR-063
- contains: no-restyle
- contains: no-raw-colors
- contains: no-arbitrary-values
- contains: no-inline-styles
- contains: no-unknown-classes
- contains: require-static-classes
- contains: layout
- contains: adoption.md
- contains: explicit configuration

## Expected Behavior

Propose all six reviewed rules as the qualified default. Adapt upstream layout allowances and component contracts to the target. Explain staged migration separately from the complete target profile. Keep version-specific setup in Guide and use existing provider-to-local mapping; governance setup does not install tooling.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded
agent run or an executed plugin/runtime qualification. Structural validation
checks its inventory and assertions; target adoption requires separate evidence.
