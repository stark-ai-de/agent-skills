# ADR-0051: Preserve release candidates through verified main history

ID: ADR-0051
Title: Preserve release candidates through verified main history
Status: Superseded
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, github-actions, approvals, evidence
Applies when: A validated catalog release waits for approval or retry after main advances.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0053
Guide verified: 2026-08-26
Gist: Keep an exact validated release candidate live while it remains in protected main history.

Variants: **Short** · [Long, canonical](0051-preserve-release-candidates-through-verified-main-history.long.md) · [Guide](0051-preserve-release-candidates-through-verified-main-history.guide.md)

## Decision

The repository will bind publication to the exact generated-release revision and its successful hosted `Validate` subjects without requiring that revision to remain the current branch tip. Readiness, protected publication, and operator approval accept the candidate only while GitHub proves that it is equal to or an ancestor of the currently observed protected `main`. The compare response must bind the exact candidate and observed branch SHAs. A diverged, removed, unknown, or unprotected candidate blocks before mutation. Feature commits merged after the candidate belong to the next release cycle and do not change the approved release subjects.

## Context

Requiring a waiting candidate to remain the branch tip can deadlock protected
approval and the Release Please lifecycle after an unrelated feature merge.
Allowing an arbitrary prior revision would detach publication from protected
history.

## Consequences

- Exact ancestry preserves candidate identity without freezing later work.
- Approval remains bound to the candidate and does not absorb later commits.
- Recovery must use the original candidate run rather than a new current-main
  dispatch.
