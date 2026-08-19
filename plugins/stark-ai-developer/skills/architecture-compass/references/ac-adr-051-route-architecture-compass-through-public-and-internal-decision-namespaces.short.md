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
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-001
Superseded by: none
Guide verified: 2026-08-05
Gist: Keep implementation-only Architecture Compass rules in a separately validated internal triplet namespace while preserving one public policy catalog.

Variants: **Short** · [Long, canonical](ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces.long.md) · [Guide](ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces.guide.md)

## Decision summary

Architecture Compass may ship implementation-only rules as `AC-INTERNAL-*` Short/Long/Guide triplets under `references/internal/`. Internal triplets are loaded only when the owning runtime path needs them, are validated separately, and are excluded from the public ADR catalog, target-repository adoption, and public provider inventory. Accepted internal IDs, stems, and Short/Long decisions are locked; change them through a reciprocal internal successor while retaining superseded history. Exposed accepted decisions remain authoritative; a generalized rule is promoted to a new exposed AC-ADR instead of being copied into both namespaces.

## Invariants

- Long remains the only normative variant within either namespace.
- Internal rules cannot override an exposed accepted Long decision.
- Accepted internal decision history changes only through reciprocal successors.
- Proposed or incomplete internal material never appears in the public catalog.
- Promotion requires a deliberate exposed ADR and synchronized triplet, catalog, lineage, and validation changes.

## Consequences

- Architecture Compass can keep host adapters and other mechanics close to the skill without turning every implementation detail into a public guardrail.
- Maintainers must validate two namespaces and make promotion or conflict boundaries explicit.
