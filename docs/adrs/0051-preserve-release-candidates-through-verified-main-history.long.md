# ADR-0051: Preserve release candidates through verified main history

ID: ADR-0051
Title: Preserve release candidates through verified main history
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, github-actions, approvals, evidence
Applies when: A validated catalog release waits for approval or retry after main advances.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Keep an exact validated release candidate live while it remains in protected main history.

Variants: [Short](0051-preserve-release-candidates-through-verified-main-history.short.md) · **Long, canonical** · [Guide](0051-preserve-release-candidates-through-verified-main-history.guide.md)

## Decision

The repository will bind publication to the exact generated-release revision and its successful hosted `Validate` subjects without requiring that revision to remain the current branch tip. Readiness, protected publication, and operator approval accept the candidate only while GitHub proves that it is equal to or an ancestor of the currently observed protected `main`. The compare response must bind the exact candidate and observed branch SHAs. A diverged, removed, unknown, or unprotected candidate blocks before mutation. Feature commits merged after the candidate belong to the next release cycle and do not change the approved release subjects.

## Why

- Environment approval may outlive the branch-tip state that existed when the
  generated release PR merged.
- Invalidating an otherwise exact candidate can deadlock the pending Release
  Please lifecycle label and its successor cycle.
- Git ancestry preserves the immutable release boundary while allowing later
  reviewed features to continue on `main`.

## Options

- Chosen: Verify exact candidate ancestry independently at readiness,
  publication, and manual approval.
- Rejected: Require equality with the current branch tip, because a later
  feature merge can strand the waiting release and generator lifecycle.
- Rejected: Permit an arbitrary prior revision, because it may have diverged or
  been removed from protected history.

## Consequences

- Good: A previously protected and validated release remains recoverable while
  later feature work proceeds.
- Good: Approval never absorbs commits outside the exact hosted candidate.
- Tradeoff: Readiness, publication, and approval require authoritative branch
  protection and compare observations.
- Risk: Operators may accidentally start a new dispatch at current `main`
  instead of rerunning the original candidate; the runbook must distinguish
  those paths.

## Follow-up

- Keep readiness, publish, and approval helpers on one exact containment rule.
- Fixture identical, advanced-descendant, diverged, removed, mismatched, and
  unprotected candidate states.
- Document later feature commits as next-cycle content and recover an older
  candidate only by rerunning or approving its original publication run.
