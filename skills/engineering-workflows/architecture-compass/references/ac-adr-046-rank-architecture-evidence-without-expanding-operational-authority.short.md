# AC-ADR-046: Rank Architecture Evidence Without Expanding Operational Authority

ID: AC-ADR-046
Title: Rank Architecture Evidence Without Expanding Operational Authority
Status: Accepted
Date: 2026-07-29
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: authority, evidence-ranking, conflict-resolution, governance
Applies when: Architecture Compass combines user intent, target-repository decisions, documentation, implementation evidence, provider decisions, or framework guidance.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Rank architecture evidence independently from the permissions that limit execution.

Variants: **Short** · [Long, canonical](ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.long.md) · [Guide](ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.guide.md)

## Decision summary

Operational authority determines which actions may execute; it never changes which architecture is correct. Architecture Compass ranks architecture evidence as: applicable accepted or superseding target ADRs; specific canonical target architecture and stack documentation; ADR-linked approved examples; consistent current implementation; adoptable provider decisions; then general framework defaults.

Current code cannot silently supersede an accepted decision. A request to change accepted architecture authorizes evaluation and the repository's adaptation or succession process, not an undocumented override. When applicable sources conflict, Architecture Compass stops only the affected work and records the sources, impact, recommendation, and decision owner instead of inventing a compromise.

## Read next

Read the [Long variant](ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.long.md) whenever evidence sources disagree. Use the [Guide](ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.guide.md) for a compact evidence worksheet and conflict record.
