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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Keep an exact validated release candidate live while it remains in verified protected-branch history.

Variants: [Short](ac-adr-056-preserve-release-candidates-through-verified-protected-history.short.md) · [Long, canonical](ac-adr-056-preserve-release-candidates-through-verified-protected-history.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls protected
candidate containment and recovery.

## Containment checklist

1. Bind the workflow run, validation, subjects, and approval to one full
   candidate SHA.
2. Resolve the protected branch to one full observed SHA.
3. Compare candidate as base with the observed branch SHA as head.
4. Accept `identical` only for equal SHAs and `ahead` only when the observed
   branch is a descendant; reject every mismatch or other state.
5. Publish only the candidate's subjects. Treat later commits as next-cycle
   input.
6. Recover an older candidate by rerunning or approving its original workflow
   run, never by presenting a new current-branch dispatch as that retry.

## Verification

- Fixture identical, advanced-descendant, diverged, removed, mismatched, and
  unprotected states.
- Verify readiness, publication, and approval share the exact rule.
- Verify a later branch commit never changes the candidate SHA or hosted
  subjects.

## Decision lineage

- `adapts`: [ADR-0051](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0051-preserve-release-candidates-through-verified-main-history.long.md).

## Current sources

- [GitHub compare two commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits).
- [GitHub protected branches](https://docs.github.com/en/rest/branches/branch-protection).

## Revisit

Create a reciprocal successor when candidate containment, protected-branch
authority, or original-run recovery changes materially.
