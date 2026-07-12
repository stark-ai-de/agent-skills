# ADR-0025: Keep Animated README Logo portable with provider routing

Status: Accepted
Date: 2026-07-12
Owner: stark-ai-de
Gist: Keep one portable logo workflow and gate optional Recraft generation behind live discovery and approval.

## Decision

We will keep `animated-readme-logo` portable, route eligible new or redesigned marks through an optional live `recraft_v4_1` preflight, and retain validated local SVG authoring as the universal path.

## Why

- Review, validation, motion, and README delivery contracts do not differ by agent host.
- Provider availability and cost are live facts, not documentation constants.
- Local SVG authoring works without accounts, credits, or optional integrations.

## Options

- Chosen: portable core, capability-detected routing, and approval gate.
- Rejected: agent variants, because their outputs and safety boundaries match.
- Rejected: universal Recraft routing, because review and faithful transformations need no new mark.

## Consequences

- Good: every environment can produce the same validated SVG and motion specification.
- Tradeoff: eligible creation adds a provider preflight.
- Risk: capability drift can block provider use; local authoring remains available.

## Follow-up

- Split by host only if a future tool or output contract materially diverges.
