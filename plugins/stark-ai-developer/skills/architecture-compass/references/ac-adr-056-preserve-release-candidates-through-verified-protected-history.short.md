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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Keep an exact validated release candidate live while it remains in verified protected-branch history.

Variants: **Short** · [Long, canonical](ac-adr-056-preserve-release-candidates-through-verified-protected-history.long.md) · [Guide](ac-adr-056-preserve-release-candidates-through-verified-protected-history.guide.md)

## Decision summary

A validated release candidate may remain publishable after its protected branch
advances only while it is equal to or an ancestor of the exact observed
protected-branch revision. Validation, approval, subjects, and publication stay
bound to the candidate; later commits belong to the next release cycle.

## Context

Current-tip equality can strand an approved release after unrelated work merges,
while unrestricted stale publication detaches release authority from protected
history.

## Invariants

- Candidate, validation, approval, and subjects identify one exact revision.
- The candidate remains in the observed protected-branch history.
- Later commits never enter the candidate's release subjects.
- Diverged, removed, ambiguous, or unprotected state blocks.

## Consequences

Release approval can survive safe branch advancement without absorbing later
commits. Repositories need authoritative branch-protection and exact compare
observations at every mutation boundary.
