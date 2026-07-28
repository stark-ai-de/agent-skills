# Stale Subagent Reconciliation

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to reconcile an architecture audit. One subagent
reviewed accepted ADRs and code at HEAD `aaa111`; a second reviewed the current
HEAD `bbb222`. The source-ownership ADR changed between those snapshots. The
final report must be grounded in the current repository and must not silently
merge both reports.

## Deterministic Assertions

- contains: aaa111
- contains: bbb222
- contains: stale
- contains: reconciled
- contains: current repository evidence
- not_contains: all subagent findings are current

## Expected Behavior

- Treat every subagent report as provisional until the lead reconciles it with
  current paths, canonical Long ADRs, HEAD, and validation evidence.
- Exclude or rerun findings invalidated by the ownership change.
- Attribute retained findings to their applicable snapshot and evidence stage.
- Do not convert missing or stale reports into positive proof.
