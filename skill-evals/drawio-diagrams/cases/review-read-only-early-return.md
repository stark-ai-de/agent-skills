# Review Read-Only Early Return

## Prompt

Review the supplied draw.io architecture for semantic drift and structural problems. Report findings only; do not change or export it.

## Should Trigger

Yes

## Fixtures

- skills/engineering-workflows/drawio-diagrams/references/examples/example-clean.drawio

## Expected Behavior

- Expose all four workflows, select `review`, and inspect only the supplied source and already available evidence.
- Run read-only validators against the existing source when useful, but do not create backups, author or patch XML, render, rasterize, export, open hosted services, or fix findings.
- Return after reporting findings, evidence limits, and the recommended follow-up workflow.

## Deterministic Assertions

- contains: review
- contains: read-only
- contains: findings
- regex: evidence (?:limits|limitations)
- not_contains: backup created
- not_contains: XML updated
- not_contains: export completed
