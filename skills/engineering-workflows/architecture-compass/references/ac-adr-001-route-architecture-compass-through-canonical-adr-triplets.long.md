# AC-ADR-001: Route Architecture Compass Through Canonical ADR Triplets

ID: AC-ADR-001
Title: Route Architecture Compass Through Canonical ADR Triplets
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: adr-library, routing, progressive-disclosure
Applies when: Architecture Compass is activated, maintained, or extended with a durable rule.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Route each task through a bounded set of ADR triplets and keep Long as the only normative variant.

Variants: [Short](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.short.md) · **Long, canonical** · [Guide](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.guide.md)

## Context

Architecture Compass previously distributed binding rules across its main instructions, references, reports, checklists, and examples. Agents could encounter duplicated or incompatible instructions, while humans had no concise inventory and maintainers had no single authority for a rule. Loading every detailed reference also defeats progressive disclosure.

## Decision

Architecture Compass represents every durable skill-runtime rule and bundled target-repository guardrail as exactly one flat Short, Long, and Guide ADR triplet.

- Long is the sole normative decision. It owns the context, obligations, invariants, conflicts, failure behavior, and acceptance criteria.
- Short is a faithful abstraction for discovery and review. It does not add exceptions or requirements.
- Guide is non-normative operational help. It may contain current commands, APIs, examples, alternatives, primary sources, and a verification date.
- `SKILL.md` is a compact dispatcher. It loads the catalog, selects applicable ADRs from task and repository evidence, reads Short first, and loads a Long decision or Guide only when the task needs that depth.
- `references/adr-catalog.md` is the human- and agent-readable inventory grouped by scope and category, with tag and applicability information plus direct links to every variant.
- Reports, checklists, templates, and examples are derived artifacts. They may collect or demonstrate decisions, but they cannot introduce, relax, or override a normative rule.
- A durable policy change updates or supersedes the canonical Long first, then synchronizes its Short, Guide, catalog entry, routing text, derived assets, validation, and release metadata in one coherent change.

## Invariants

- Each decision has exactly three files with one shared stem and the `.short.md`, `.long.md`, and `.guide.md` suffixes.
- Shared metadata is identical across the triplet except `Variant`; ID and accepted stem are stable.
- Sibling navigation is direct and identifies Long as canonical.
- Short-first routing never means Short replaces Long for implementation or conflict resolution.
- An agent loads only the applicable subset; the skill never instructs it to read every reference by default.
- Volatile mechanics stay in Guide. A Guide verification date is not evidence that its external dependencies remain current after that date.
- A fourth manually maintained prose policy layer is not created.

## Conflict resolution

When Short or Guide differs semantically from Long, Long governs and the triplet is invalid until synchronized. When a derived artifact differs from Long, ignore the derived wording and repair or remove it. When this library conflicts with a governing accepted ADR of the skill repository, stop the affected maintenance or execution, report both sources, and update or supersede the appropriate decision rather than silently choosing a compromise.

## Failure handling

Treat a missing sibling, mismatched shared metadata, orphaned catalog row, duplicate ID, invalid navigation link, or normative statement that exists only outside Long as a blocking library defect. Do not claim the affected rule is safely routed. Limit unaffected work to ADRs whose triplets and authority remain intact.

## Acceptance criteria

- Every cataloged decision has exactly one valid triplet and one unique ID and stem.
- A reader can inventory the library from Short variants without loading all Long variants.
- A concrete task resolves to a bounded applicable set and can reach canonical Long and optional Guide directly.
- Automated validation detects structural drift, orphans, duplicate identities, metadata drift, and unsuffixed ADR links.
- Derived reports, templates, examples, and checklists contain no standalone normative policy.

## Consequences

This structure adds synchronization work and more files per decision. In return, it separates authority, scanning, and current implementation help; makes routing deterministic; and lets validators detect policy drift before agents rely on it.
