# ADR-0032: Adopt Short, Long, and Guide ADR triplets

ID: ADR-0032
Title: Adopt Short, Long, and Guide ADR triplets
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: adr, triplet, progressive-disclosure
Applies when: Creating, linking, validating, or superseding a repository ADR.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0003, ADR-0013
Superseded by: None
Guide verified: 2026-07-28
Gist: Every ADR exposes a short overview, one canonical decision, and implementation guidance.

Variants: **Short** · [Long, canonical](0032-adopt-short-long-guide-adr-triplets.long.md) · [Guide](0032-adopt-short-long-guide-adr-triplets.guide.md)

## Decision

We will continue to persist implementation specs under `docs/specs/` and ADRs under `docs/adrs/`, with user-approved folder creation when a target repository lacks those folders. We will store each ADR as linked `.short.md`, `.long.md`, and `.guide.md` variants, make Long canonical, link Short first with Long and Guide companions, and remove numeric ADR word limits.

## Context

- Humans need a scannable view while agents need complete constraints and implementation guidance.
- One canonical Long variant prevents three competing decisions.

## Consequences

- Good: Readers can choose the required depth without losing authority.
- Tradeoff: Each decision creates three synchronized files.
- Risk: Drift requires deterministic validation.
