# ADR-0013: Persist specs and ADRs as repo artifacts

ID: ADR-0013
Title: Persist specs and ADRs as repo artifacts
Status: Superseded
Date: 2026-05-22
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: specs, adr, persistence, superseded
Applies when: Reviewing the former persistence and ADR filename convention.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0032
Guide verified: 2026-07-28
Gist: Specs and ADRs are saved files, not chat-only output.

Variants: [Short](0013-persist-specs-and-adrs-as-repo-artifacts.short.md) · [Long, canonical](0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · **Guide**

This guide is non-normative. [Long](0013-persist-specs-and-adrs-as-repo-artifacts.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Locate the policy, catalog, metadata, or repository surfaces governed by the canonical record.
- Compare the current state with the Long decision and with any later accepted or superseding ADR before proposing a change.
- Keep one authoritative policy surface; treat templates, reports, and checklists as derived material.

## Verification

- Check the affected policy and generated or derived surfaces for semantic agreement.
- Run the narrow validator for the governed artifact, then the repository aggregate validation when the change is implementation-ready.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Keep README, AGENTS, and contributing docs aligned with this policy.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
