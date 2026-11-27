# Shared Quality Migration Preserves Existing Correctness

## Should Trigger

Yes.

## Prompt

An established TypeScript repository has an accepted shared-quality adoption and authorized implementation. Its native correctness command passes. The measured quality baseline allows 12 findings and complexity 10 for one existing diagnostic; current output still has 12 findings but complexity rises to 11. An engineer suggests refreshing the baseline automatically in CI. Assess the next bounded change.

## Deterministic Assertions

- contains: AC-ADR-069
- contains: correctness
- contains: numeric
- contains: regression
- contains: prune
- contains: owner
- contains: partial
- not_contains: baseline expansion is automatic
- not_contains: zero quality debt

## Expected Behavior

Preserve the passing correctness gate and run all mandatory shared presets through the owning Oxlint command. Reject the increased metric even though count is unchanged. Require explicit reviewed migration for allowance creation/expansion, prohibit automatic CI refresh, keep pruning non-increasing, and distinguish partial baseline migration from violation-free completion. Specify real failing/report-error fixtures and candidate-bound local/CI evidence.

## Evidence Stage

source/static: this case specifies expected agent behavior. A structural pass does not establish a live agent run, installation or hosted enforcement.
