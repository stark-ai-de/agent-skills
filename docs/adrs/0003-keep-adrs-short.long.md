# ADR-0003: Keep ADRs short

ID: ADR-0003
Title: Keep ADRs short
Status: Superseded
Date: 2026-05-19
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: adr, documentation, superseded
Applies when: Reviewing the repository's former compact ADR policy.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0032
Guide verified: 2026-07-28
Gist: Decision records should not become documentation bloat.

Variants: [Short](0003-keep-adrs-short.short.md) · **Long, canonical** · [Guide](0003-keep-adrs-short.guide.md)

## Decision

We will keep ADRs under 250 words and use a compact template.

## Why

- Short ADRs are more likely to be read.
- Repo decisions should be scannable by humans and agents.
- Long explanations belong in docs, not decision records.

## Options

- Chosen: Compact ADR template with strict limits.
- Rejected: Long-form ADRs, because they create maintenance drag.
- Rejected: No ADRs, because decisions would become implicit.

## Consequences

- Good: Decision history stays easy to scan.
- Tradeoff: Complex decisions need links to separate docs.
- Risk: Over-compression can omit nuance.

## Follow-up

- Add ADR validation script.
