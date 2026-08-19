# AC-ADR-001: Route Architecture Compass Through Canonical ADR Triplets

ID: AC-ADR-001
Title: Route Architecture Compass Through Canonical ADR Triplets
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: adr-library, routing, progressive-disclosure
Applies when: Architecture Compass is activated, maintained, or extended with a durable rule.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: AC-ADR-051
Guide verified: 2026-07-28
Gist: Route each task through a bounded set of ADR triplets and keep Long as the only normative variant.

Variants: [Short](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.short.md) · [Long, canonical](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Routing procedure

1. Read the catalog entries whose `Scope`, `Category`, `Tags`, and `Applies when` match the task.
2. Scan those Short variants to discard false positives without loading their full decisions.
3. Load Long for every decision that constrains the requested implementation, review, setup, or maintenance action.
4. Load Guide only when current mechanics, examples, commands, or external sources help perform the task.
5. Record the selected ADR IDs in the working rule map and final evidence report.

For a narrow Next.js route-structure change, this usually selects the route/component ADR and any directly implicated runtime or request-boundary ADR. It should not load backend lifecycle, AI, data-store, or delivery decisions without task evidence.

## Maintaining a triplet

- Start from one decision and assign one stable AC-ADR ID and stem.
- Write or revise Long first. Keep framework versions, package syntax, and copyable examples in Guide where possible.
- Derive Short from the finished Long and check that its compression does not broaden or weaken the decision.
- Use the same shared metadata in all variants and change only `Variant`.
- Add direct sibling navigation and update the catalog.
- Search reports, templates, examples, checklists, and `SKILL.md` for duplicated policy; replace it with concise routing or a link.
- Select focused checks from the changed ADR contract and owning boundary. Do not run the repository aggregate merely because a triplet changed; use it only when a mandatory gate or distinct proof obligation requires it.

If a previously accepted decision changes materially, create a successor triplet and link supersession in both directions. Do not rewrite the accepted outcome as if it had always said something else.

## Review prompts

- Can a human understand applicability from the catalog and Short alone?
- Does Long contain every binding obligation and exception?
- Is Guide useful when its volatile examples are removed or updated independently?
- Would deleting a report or template lose a rule? If yes, policy still lives outside Long.
- Does the selected task load a bounded set rather than the whole library?

## Decision lineage

- `consolidates`: [ADR-0032](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0032-adopt-short-long-guide-adr-triplets.long.md), [ADR-0033](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0033-package-architecture-compass-as-a-routed-adr-library.long.md).

## Official sources

- [Agent Skills specification: progressive disclosure and optional directories](https://agentskills.io/specification)
- [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices)
- [MADR examples](https://adr.github.io/madr/examples.html)
- [MADR decision about category folders](https://adr.github.io/madr/decisions/0010-support-categories.html)
