# AC-ADR-056: Preserve Release Candidates Through Verified Protected History

ID: AC-ADR-056
Title: Preserve Release Candidates Through Verified Protected History
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: release, recovery, approval, protected-branch, evidence
Applies when: A validated release waits for approval or retry after its protected branch advances.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Keep an exact validated release candidate live while it remains in verified protected-branch history.

Variants: [Short](ac-adr-056-preserve-release-candidates-through-verified-protected-history.short.md) · **Long, canonical** · [Guide](ac-adr-056-preserve-release-candidates-through-verified-protected-history.guide.md)

## Context

A protected publication may wait for human approval after its exact revision and
artifacts pass hosted validation. Requiring that revision to remain the current
branch tip lets a later feature merge invalidate the waiting release and strand
the generator lifecycle. Allowing an arbitrary stale revision would detach
publication from protected history.

## Decision

A target repository may keep an exact validated release candidate publishable after its protected branch advances only while the provider proves that the candidate is equal to or an ancestor of the exact currently observed protected-branch revision. The workflow run, hosted validation, approval, artifact subjects, and publication remain bound to the candidate revision. Later commits belong to the next release cycle and do not enter those subjects. Diverged, removed, ambiguous, or unprotected state blocks before mutation.

## Invariants

- Candidate containment uses exact candidate and observed branch SHAs.
- Approval authorizes the candidate revision and does not absorb later commits.
- Readiness, publication, and operator approval apply one containment rule.
- Diverged, removed, mismatched, unknown, or unprotected state blocks.
- Publication and later proof remain separate evidence boundaries.

## Failure handling

Block when branch protection is absent, either SHA is invalid, the compare base
or head differs from the requested identities, or the provider reports a
relation other than exact identity or descendant history. Recover an older
candidate by rerunning or approving its original workflow run; a new dispatch
targets the then-current candidate.

## Consequences

- Benefit: Protected approval can outlive unrelated branch advancement without
  publishing unvalidated later commits.
- Benefit: The release generator can complete its lifecycle without a
  current-tip deadlock.
- Tradeoff: Repositories need authoritative branch-protection and compare
  observations at readiness, approval, and publication.
- Risk: Operators may dispatch current `main` instead of retrying the original
  candidate; runbooks must distinguish those paths.

## Adoption notes

Adopt this decision only when hosted validation and release subjects are bound
to full immutable SHAs and the provider exposes exact protected-branch and
compare observations. Otherwise retain current-tip equality.
