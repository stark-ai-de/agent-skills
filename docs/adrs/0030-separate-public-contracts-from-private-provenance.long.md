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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep public contracts usable while private provenance stays local.

Variants: [Short](0030-separate-public-contracts-from-private-provenance.short.md) · **Long, canonical** · [Guide](0030-separate-public-contracts-from-private-provenance.guide.md)

## Decision

Public artifacts retain the exact official sources, schemas, setup and probe
instructions, provider and dependency details, and license information required
to use or verify a public function; non-public maintainer repositories and
paths, private mappings, named comparison or inspiration targets, detailed
challenge notes, and identifying raw artifacts stay local; release audits cover
every tracked public artifact.

## Why

- Consumers need reproducible setup and verification evidence.
- Maintainer provenance adds disclosure without improving the public function.
- Official source and attribution details must not be removed as provenance.

## Options

- Chosen: separate public functional evidence from private provenance.
- Rejected: make every spec private, because that removes useful public contracts.
- Rejected: publish named provenance, because it creates avoidable disclosure.

## Consequences

- Good: public documentation stays actionable without source-project context.
- Good: public benchmarks use neutral roles; mappings and raw artifacts stay
  local.
- Tradeoff: ignored local notes are not repository-backed.
- Risk: release audits must catch boundary drift across the full tracked surface.

## Follow-up

- Audit every tracked public artifact before each release.
