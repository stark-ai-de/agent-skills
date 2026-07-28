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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0032
Guide verified: 2026-07-28
Gist: Decision records should not become documentation bloat.

Variants: **Short** · [Long, canonical](0003-keep-adrs-short.long.md) · [Guide](0003-keep-adrs-short.guide.md)

## Decision

We will keep ADRs under 250 words and use a compact template.

## Context

- Short ADRs are more likely to be read.
- Repo decisions should be scannable by humans and agents.

## Consequences

- Good: Decision history stays easy to scan.
- Tradeoff: Complex decisions need links to separate docs.
- Risk: Over-compression can omit nuance.
