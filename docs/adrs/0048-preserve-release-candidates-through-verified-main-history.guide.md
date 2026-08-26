# ADR-0048: Preserve release candidates through verified main history

ID: ADR-0048
Title: Preserve release candidates through verified main history
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, github-actions, approvals, evidence
Applies when: A validated catalog release waits for approval or retry after main advances.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Keep an exact validated release candidate live while it remains in protected main history.

Variants: [Short](0048-preserve-release-candidates-through-verified-main-history.short.md) · [Long, canonical](0048-preserve-release-candidates-through-verified-main-history.long.md) · **Guide**

This guide is non-normative. [Long](0048-preserve-release-candidates-through-verified-main-history.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Keep the workflow run, successful hosted `Validate` run, downloaded subjects,
   and generated release-PR provenance bound to one full candidate SHA.
2. Resolve protected `main` to one full SHA and compare candidate as base with
   that observed SHA as head.
3. Accept only `identical` for equal SHAs or `ahead` when the observed SHA is a
   descendant. Verify the compare base and head fields exactly.
4. If `main` advanced, approve or rerun the original candidate run. A new
   `publish` dispatch targets current `main` and is not an older-candidate retry.
5. Treat later commits as input to the next Release Please cycle.

## Verification

- Fixture identical, advanced-descendant, diverged, removed, mismatched, and
  unprotected states across readiness, publish, and approval.
- Prove the waiting run keeps its exact SHA after `main` advances.
- Prove a new manual dispatch cannot impersonate the older candidate.
- Confirm all mutation remains behind the protected environment.

## Current references

- [GitHub compare two commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits).
- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## Revisit

Create a reciprocal successor if candidate containment or protected approval
binding changes. Update all three variants and both sides of the supersession
metadata together.
