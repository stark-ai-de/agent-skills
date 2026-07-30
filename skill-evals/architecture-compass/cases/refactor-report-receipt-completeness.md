# Refactor Report and Validation Receipt Completeness

## Should Trigger

Yes.

## Prompt

Close out a moderate-risk governed refactor. One focused local receipt is fresh,
one browser receipt is stale after a harness change, hosted verification was
outside authority, and the frozen aggregate gate passed once. Return an
actionable refactor report, a receipt ledger, and precise evidence limits.

## Deterministic Assertions

- contains: Risk:
- contains: Cadence:
- contains: Proof:
- contains: Subject:
- contains: Revision:
- contains: Command/Scenario/Harness:
- contains: Toolchain:
- contains: Stage:
- contains: Environment:
- contains: Status:
- contains: Result:
- contains: Observation / result:
- contains: Covered contracts:
- contains: Invalidators:
- contains: Owner:
- contains: Repository-native receipt location:
- contains: Skip reason:
- contains: Final Aggregate Gate:
- contains: Severity definitions:
- contains: Recommended Action:
- contains: Docs/ADR Impact:
- contains: Deviation Resolution:
- contains: Done-When:
- contains: stale
- contains: hosted: not run
- not_contains: hosted: verified
- not_contains: deployed/Preview

## Expected Behavior

- Give every proof obligation a receipt identity covering risk, cadence, proof,
  subject, revision or exact candidate fingerprint, command/scenario/harness,
  toolchain, exactly one canonical stage, separate environment, explicit
  status, observation or result and freshness boundary, covered contracts,
  invalidators, owner, repository-native location, and skip reason where
  applicable.
- Record the final aggregate gate separately and say it ran once against the
  frozen integrated candidate.
- Mark the browser receipt stale because the harness changed; do not reuse it as
  current proof. Mark hosted verification `not run` because it was outside the
  authorized scope, not because local evidence substituted for it.
- Define severity levels and give each report item a recommended action,
  documentation or ADR impact, deviation resolution, and testable Done-When.
- Keep source/static, local, CI, publication/install, deployed/production, and
  external/third-party proof separate; record Preview as an environment rather
  than a seventh stage, and do not claim an unrun evidence stage succeeded.
