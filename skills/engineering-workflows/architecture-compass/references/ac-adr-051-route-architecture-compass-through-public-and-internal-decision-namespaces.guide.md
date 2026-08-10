# AC-ADR-051: Route Architecture Compass Through Public and Internal Decision Namespaces

ID: AC-ADR-051
Title: Route Architecture Compass Through Public and Internal Decision Namespaces
Status: Accepted
Date: 2026-08-05
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: adr-library, internal-policy, progressive-disclosure, validation
Applies when: Architecture Compass needs implementation-only runtime guidance that should not become a public or target-repository decision.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-001
Superseded by: none
Guide verified: 2026-08-05
Gist: Keep implementation-only Architecture Compass rules in a separately validated internal triplet namespace while preserving one public policy catalog.

Variants: [Short](ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces.short.md) · [Long, canonical](ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Routing procedure

1. Resolve the applicable exposed AC-ADR from the public catalog and load its Long before selecting internal mechanics.
2. If that Long names an implementation boundary, inspect only the matching internal `AC-INTERNAL-*` Short and then load its Long or Guide as needed.
3. Record both namespaces in the working rule map, keeping the exposed decision as the authority for the user-visible outcome.
4. If the internal triplet is missing, contradictory, or not validated, use the exposed decision's safe fallback or stop the affected route; do not invent a replacement policy in a report.

## Internal triplet maintenance

- Keep internal files under the skill-owned `references/internal/` directory when the namespace is accepted.
- Use a stable `AC-INTERNAL-<number>-<slug>` identity, one shared stem, and direct Short/Long/Guide links.
- Lock each accepted internal stem plus its Short Decision summary and Long Decision. Change a decision only through a new reciprocally linked internal successor; retain the superseded triplet as history.
- Put implementation commands, host probes, examples, and current source links in Guide. Keep obligations and conflict behavior in Long.
- Do not add internal rows to `references/adr-catalog.md` or copy their IDs into a target repository.
- When a rule generalizes beyond this provider, write a new exposed AC-ADR and link the internal record as provenance rather than moving or dual-authoring the same policy.

## Validation

Use the repository's focused Architecture Compass validator after the accepted namespace and its routing are wired. At minimum, check triplet identity, variant labels, sibling links, internal-ID uniqueness, accepted-decision locks, reciprocal successors, catalog exclusion, and public/internal conflict handling. Do not treat a clean internal fixture as evidence that the public catalog or target adoption matrix is complete.

## Decision lineage

- `adapts`: [ADR-0039](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0039-separate-internal-skill-implementation-policy-from-exposed-contracts.long.md).

## Sources

- [Agent Skills specification](https://agentskills.io/specification), verified 2026-08-05.
- [AC-ADR-001: Route Architecture Compass Through Canonical ADR Triplets](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.long.md), verified 2026-08-05.
- [AC-ADR-028: Keep Candidates Outside the Promoted Public Catalog](ac-adr-028-keep-candidates-outside-the-promoted-public-catalog.long.md), verified 2026-08-05.
- [AC-ADR-044: Record Material Decision Lineage in Non-Normative Guides](ac-adr-044-record-material-decision-lineage-in-non-normative-guides.long.md), verified 2026-08-05.

## Revisit

Create a successor if internal records become target-adoptable, are included in the public catalog, or need to override an exposed accepted decision.
