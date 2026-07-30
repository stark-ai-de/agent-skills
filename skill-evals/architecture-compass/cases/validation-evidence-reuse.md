# Validation Evidence Reuse and Ownership

## Should Trigger

Yes.

## Prompt

The Architecture Compass checkpoint was shown and the user explicitly confirmed
`plan-run-refactor`. A lead and two sub-agents share a repository
validation ledger. The owning-boundary test receipt matches candidate `abc123`,
its command, fixtures, lockfile, toolchain, local environment, and accepted
contract. A second receipt uses the same code but an older lockfile, while the
final aggregate gate has not run for the integrated candidate. Assign checks
without rerunning valid evidence or treating stale evidence as current.

## Deterministic Assertions

- contains: abc123
- contains: reused
- contains: stale
- contains: lockfile
- contains: command or scenario
- contains: invalidator
- contains: one check owner
- contains: integrated candidate
- contains: final aggregate gate
- not_contains: both sub-agents rerun the baseline
- not_contains: old receipt is current

## Expected Behavior

- Reconcile the matching receipt against subject, artifact, command or scenario, harness,
  configuration, fixtures, lockfile, toolchain, stage, environment, contract,
  limitations, and newer contradictory evidence before marking it `reused`.
- Mark the older-lockfile receipt `stale` and rerun only its affected proof
  obligation if that obligation is still required.
- Assign each logical check to exactly one owner; sub-agents return receipts and
  invalidators rather than independently repeating the baseline or aggregate.
- Run the required final aggregate gate once after the integrated candidate
  freezes. If it fails, diagnose with the smallest owning check before one new
  aggregate run.
