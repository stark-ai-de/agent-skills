# Conflicting Architecture Source Evidence

## Prompt

```text
Use $drawio-diagrams to update an editable architecture view from the supplied fictional evidence bundle. Its README, accepted ADR, deployment excerpt, and existing-view note disagree about whether Redis is required, and I do not want uncertain claims presented as facts.
```

## Should Trigger

Yes

## Fixtures

- skill-evals/drawio-diagrams/fixtures/architecture-evidence-conflict.md

## Expected Behavior

- Compare the sources and prefer accepted decisions and deployed configuration over stale prose where their authority is clear.
- Mark unresolved Redis status as uncertain instead of silently choosing a claim.
- Ask a question only if the unresolved choice materially changes the requested view.
- Report the conflict, evidence basis, freshness, and any diagram notation used for uncertainty.

## Deterministic Assertions

- regex: conflict|disagree|uncertain
- contains: Redis
- regex: ADR|authoritative|source of truth
