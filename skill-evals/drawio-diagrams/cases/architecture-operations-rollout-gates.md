# Operations Rollout Gates View

## Prompt

```text
Create an editable draw.io operator view for rolling out a model-gateway configuration change. Reviewers need to understand approval, activation, canary health, evidence, promotion, rollback, and ownership.
```

## Should Trigger

Yes

## Expected Behavior

- Create an operations or activation view with gates, owners, evidence, status, and rollback.
- Separate configuration existence from live activation and observed health.
- Keep the steady-state runtime architecture secondary to the rollout decision path.
- Use labels or badges in addition to color for gate and status meaning.

## Deterministic Assertions

- regex: operations view|activation view
- regex: approval|gate
- contains: owner
- contains: rollback
