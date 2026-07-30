# Risk-Proportional Validation Matrix

## Should Trigger

Yes.

## Prompt

The Architecture Compass checkpoint was shown and the user explicitly confirmed
`plan-run-refactor`. Classify validation for four approved slices:
an established responsive class adjustment, a new hydration and focus flow, an
authorization migration, and a localized public documentation-link correction
whose final published location can only be observed on the existing production
site. Preserve all mandatory gates and explain whether Preview or a bounded
read-only production observation is allowed without creating a complex permanent
one-off smoke harness.

## Deterministic Assertions

- contains: final-batch
- contains: checkpointed
- contains: representative Preview
- contains: low-risk
- contains: changed contract and blast radius
- contains: exact already-authorized artifact
- contains: production observation
- contains: separate authorization
- contains: stop threshold
- contains: rollback
- contains: edge-case disposition
- not_contains: production-first authorization migration
- not_contains: observation environment alone makes the change high risk
- not_contains: permanent one-off smoke harness required

## Expected Behavior

- Use `final-batch` and no mandatory browser run for the statically decidable
  established responsive adjustment.
- Require focused browser evidence for the hydration and focus acceptance
  criteria, preferably against the exact candidate in a representative Preview.
- Treat authorization migration as critical, keep its negative,
  compatibility, recovery, and mandatory pre-deployment gates, and never use
  production as the first substitute for missing Preview evidence.
- For the documentation correction, document why Preview is unavailable or not
  representative. Classify risk from the changed contract and blast radius, not
  the observation environment. Permit a production observation only if the
  change remains low without changing an external-runtime, infrastructure,
  public, trust, or data contract; promotion and target are already authorized;
  the exact approved artifact is present; the observation is bounded and
  read-only; data is safe; mandatory gates passed; and observations, stop
  threshold, and rollback are defined.
- Give every discovered edge case exactly one allowed disposition and do not
  infer deployment authority from the Architecture Compass checkpoint.
