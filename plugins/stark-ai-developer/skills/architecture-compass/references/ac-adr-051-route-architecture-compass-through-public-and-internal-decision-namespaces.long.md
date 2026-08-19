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
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-001
Superseded by: none
Guide verified: 2026-08-05
Gist: Keep implementation-only Architecture Compass rules in a separately validated internal triplet namespace while preserving one public policy catalog.

Variants: [Short](ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces.short.md) · **Long, canonical** · [Guide](ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces.guide.md)

## Context

AC-ADR-001 requires each durable Architecture Compass rule to use one canonical Short/Long/Guide triplet and routes the public library through `references/adr-catalog.md`. The skill now needs mechanics such as capability probing, persistence-surface resolution, and adapter fallback details that are necessary to implement the public contract but are not themselves useful target-repository architecture decisions. Placing those mechanics in the public catalog increases routing and context cost; placing them in unstructured prose creates a second, unvalidated authority surface.

The distinction is architectural rather than cosmetic. A public `skill-runtime` decision defines a reusable outcome contract and can be selected by Architecture Compass setup or runtime routing. An internal runtime rule explains how this particular provider realizes that contract. It must remain portable enough to test, but it must not silently become a target-repository guardrail or a public promise.

## Decision

Architecture Compass permits a separately validated internal ADR namespace beneath the skill's references, conventionally `references/internal/`. Each internal decision uses a Short/Long/Guide triplet with the same shared-metadata and sibling-navigation discipline as an exposed triplet, but it uses an `AC-INTERNAL-*` identity that cannot collide with public `AC-ADR-*` identities.

Internal triplets follow these rules:

- Long is the sole normative internal variant; Short is discovery-only and Guide is non-normative implementation help.
- Once accepted, an internal ID, filename stem, Short Decision summary, and Long Decision are immutable and decision-locked. A change in decision uses a new `AC-INTERNAL-*` triplet with reciprocal `Supersedes` and `Superseded by` metadata while retaining the superseded triplet as history.
- `SKILL.md` may route to an internal Short, Long, or Guide only after an exposed decision has established that the implementation path is applicable. Internal material is conditionally loaded and is never read wholesale by default.
- Internal records are absent from `references/adr-catalog.md`, public provider inventories, target-repository adoption matrices, and public AC-ADR lineage unless a promotion record explicitly links them as provenance.
- Internal records may define adapter selection, persistence-surface inspection, renderer mechanics, validation fixtures, or other provider implementation details. They may not add a public workflow, alter evidence stages, weaken an approval boundary, or create a target-repository obligation that is not present in an exposed accepted decision.
- If an internal Long conflicts with an exposed accepted Long, the exposed decision governs and the affected route is blocked until the internal record is repaired or the exposed decision is deliberately superseded. A Guide or derived report never resolves that conflict.
- A rule becomes exposed only through a deliberate successor or sibling AC-ADR. Promotion copies the decision into a new public triplet, assigns a public ID and catalog placement, records lineage, and runs the owning validator; it does not make the internal record itself public by changing one metadata field.
- Proposed or incomplete internal triplets remain outside the shipped public runtime and cannot be used as authority for a write.

The public catalog continues to contain only exposed AC-ADR triplets. The internal namespace is a second routing boundary, not a fourth manually maintained prose policy layer: reports, templates, examples, and evals may demonstrate either namespace, but they cannot introduce policy that is absent from the applicable Long.

## Invariants

- Every internal decision has exactly one Short, Long, and Guide file with one shared stem and metadata identity, except for the `Variant` value.
- Accepted internal identities and decisions remain locked; successor relationships are reciprocal and preserve superseded history.
- Internal IDs use a distinct namespace and never reuse an exposed AC-ADR ID.
- Public accepted Long decisions outrank internal decisions, and target-repository authority outranks provider implementation notes.
- Internal files are not adoptable target-repository guardrails and do not change the public catalog's finite inventory.
- Internal routing is bounded, conditional, and evidence-based; loading an internal file never grants mutation, external, publication, or deployment authority.
- A missing sibling, metadata drift, duplicate internal ID, orphaned route, or invalid navigation link blocks reliance on that internal rule but does not invalidate unrelated exposed decisions.

## Alternatives

- Chosen: a separately validated `references/internal/` triplet namespace with distinct IDs and explicit promotion. This preserves progressive disclosure and policy ownership without forcing implementation mechanics into the public catalog.
- Rejected: keep all mechanics in `SKILL.md`. This makes the dispatcher a second normative policy surface and increases activation context.
- Rejected: place internal mechanics in the public catalog as ordinary AC-ADRs. This makes provider details appear adoptable and expands every routing inventory.
- Rejected: maintain an unstructured private notes folder. This avoids catalog work but loses triplet integrity, bounded routing, and drift detection.

## Consequences

- Benefit: reusable behavior can stay portable and testable while implementation-only details remain close to their owner.
- Tradeoff: namespace, lineage, and validator rules must be maintained alongside the existing public library.
- Risk: an internal rule could become an accidental hidden policy. Separate IDs, catalog exclusion, conflict rules, and promotion review mitigate that risk.

## Acceptance

- The public catalog still exposes only its accepted/superseded AC-ADR inventory, while internal records are discoverable only through the owning skill's bounded routing.
- A validator detects missing or duplicate internal siblings, metadata drift, invalid links, and public-catalog leakage without requiring internal records to be target-adoptable.
- A synthetic conflict proves that an exposed accepted Long wins over an internal Long and blocks the affected route until repair.
- A promotion fixture proves that an internal decision becomes public only through a new exposed triplet, catalog row, lineage entry, and focused validation.
- Removing a report or template cannot remove the only normative text for either namespace.
