# ADR-0030: Separate public contracts from private provenance

Status: Accepted
Date: 2026-07-17
Owner: stark-ai-de
Gist: Keep public contracts usable while private provenance stays local.

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
