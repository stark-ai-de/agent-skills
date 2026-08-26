# ADR-0030: Separate public contracts from private provenance

ID: ADR-0030
Title: Separate public contracts from private provenance
Status: Accepted
Date: 2026-07-17
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: public-artifacts, provenance, privacy
Applies when: Preparing public artifacts or release evidence from private research.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep public contracts usable while private provenance stays local.

Variants: [Short](0030-separate-public-contracts-from-private-provenance.short.md) · [Long, canonical](0030-separate-public-contracts-from-private-provenance.long.md) · **Guide**

This guide is non-normative. [Long](0030-separate-public-contracts-from-private-provenance.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Identify trust boundaries, sensitive inputs, public outputs, privileges, and containment controls affected by the decision.
- Fail closed when required isolation, approval, provenance separation, or validation evidence is unavailable.
- Keep secret values and private provenance out of public artifacts and reports.

## Verification

- Use bounded negative fixtures to prove rejection of unsafe, remote, active, privileged, or identifying inputs as applicable.
- Audit every public output surface and distinguish static inspection from runtime containment proof.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.
- Before publishing a public spec, remove branch, worktree, concurrent-change,
  and private source-challenge provenance while retaining the public contract,
  applicable ADR links, and official public references.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Audit every tracked public artifact before each release.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
