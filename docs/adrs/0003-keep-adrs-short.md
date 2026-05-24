# ADR-0003: Keep ADRs short

Status: Accepted  
Date: 2026-05-19  
Owner: stark-ai-de  
Gist: Decision records should not become documentation bloat.

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
