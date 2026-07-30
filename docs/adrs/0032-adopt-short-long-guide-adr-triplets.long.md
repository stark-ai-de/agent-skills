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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0003, ADR-0013
Superseded by: None
Guide verified: 2026-07-28
Gist: Every ADR exposes a short overview, one canonical decision, and implementation guidance.

Variants: [Short](0032-adopt-short-long-guide-adr-triplets.short.md) · **Long, canonical** · [Guide](0032-adopt-short-long-guide-adr-triplets.guide.md)

## Decision

We will continue to persist implementation specs under `docs/specs/` and ADRs under `docs/adrs/`, with user-approved folder creation when a target repository lacks those folders. We will store each ADR as linked `.short.md`, `.long.md`, and `.guide.md` variants, make Long canonical, link Short first with Long and Guide companions, and remove numeric ADR word limits.

## Why

- Humans need a scannable view while agents need complete constraints and implementation guidance.
- One canonical Long variant prevents three competing decisions.
- Flat triplets and explicit links support progressive disclosure without category-folder ambiguity.

## Options

- Chosen: Flat, metadata-driven triplets with direct sibling links.
- Rejected: One compact file, because it cannot carry sufficient operational detail.
- Rejected: Category folders, because they add navigation and ID ambiguity.

## Consequences

- Good: Readers can choose the required depth without losing authority.
- Tradeoff: Each decision creates three synchronized files.
- Risk: Drift requires deterministic validation.

## Follow-up

- Supersede [ADR-0003](0003-keep-adrs-short.short.md) ([Long, canonical](0003-keep-adrs-short.long.md) · [Guide](0003-keep-adrs-short.guide.md)) and migrate every repository ADR atomically.
