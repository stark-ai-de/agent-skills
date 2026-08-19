# Rollout Checklist

Use this reference when writing the validation, rollout, and rollback sections of a spec.

## Validation Plan

- List the repo's real lint, typecheck, unit, integration, e2e, and build commands; mark missing ones `unspecified` instead of inventing them.
- Include at least one concrete manual verification scenario per user-visible behavior change.
- For migrations or refactors, include a search or count check that proves the old pattern is gone or bounded.
- Name the review focus areas: regression hotspots, security-sensitive paths, and contract or schema changes.

## Phased Rollout

Phase the work when any of these apply: repo-wide scope, shared contracts, data migrations, auth/billing surfaces, or diffs too large to review safely in one pass.

For each phase, the spec should state:

- the bounded work items in the phase,
- a validation gate that must pass before the next phase starts,
- whether the phase is independently shippable or must land with others.

## Migration and Compatibility

- State whether data migration, backfill, config changes, or feature flags are required.
- State backward-compatibility expectations and any deprecation window.
- Keep a temporary compatibility shim only with an explicit removal condition.

## Rollback

- Define the rollback trigger: which failures or metrics justify reverting.
- Define the rollback procedure: what gets reverted, what can safely stay.
- Call out one-way doors such as destructive migrations or deleted contracts, and require explicit user confirmation for them.

## Monitoring

- Name what to watch during rollout: error rates, latency, auth failures, job backlogs, or the repo's existing dashboards.
- For repos without monitoring, fall back to log checks and manual verification steps and say so in the spec.

## Spec Risk Checklist

| Risk / edge case                 | Recommended mitigation                                                      |
| -------------------------------- | --------------------------------------------------------------------------- |
| Hidden migrations / rollout risk | force rollout and rollback notes for standard and deep modes                |
| Shared-contract breakage         | list affected consumers and gate the phase on contract tests                |
| Auth, billing, or secret paths   | call out explicitly, require manual verification, avoid speculative edits   |
| Too-large diffs                  | phase the work by package or module with validation gates                   |
| Partial cutover confusion        | document the default path and add a guard against reintroducing the old one |
| Silent behavior drift            | pin user-visible behavior in acceptance criteria and manual checks          |
