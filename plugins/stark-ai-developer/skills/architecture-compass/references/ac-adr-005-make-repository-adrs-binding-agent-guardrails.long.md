# AC-ADR-005: Make Repository ADRs Binding Agent Guardrails

ID: AC-ADR-005
Title: Make Repository ADRs Binding Agent Guardrails
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: adr-governance, agent-instructions, conflict-resolution
Applies when: A repository uses or is adopting ADR governance for architecture-affecting implementation, refactoring, or review.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Make accepted repository ADRs discoverable and binding for architecture-affecting agent work.

Variants: [Short](ac-adr-005-make-repository-adrs-binding-agent-guardrails.short.md) · **Long, canonical** · [Guide](ac-adr-005-make-repository-adrs-binding-agent-guardrails.guide.md)

## Context

ADRs reduce review and refactor cycles only when an agent can find the applicable decisions, distinguish active authority from history, and connect a decision to implementation. An ADR archive without an index or agent instruction is easy to ignore. Conversely, treating drafts, examples, and current drift as equally binding makes the repository's intent ambiguous.

## Decision

The target repository establishes one canonical ADR location and a maintained index or catalog. Its root or nearest-scoped agent instructions require agents to discover, read, and apply relevant ADRs before any change that affects source ownership, runtime boundaries, public contracts, requests and data flow, dependencies, security, migrations, delivery, operations, accessibility, performance, or validation policy.

ADR authority follows status and succession:

- An applicable `Accepted` ADR is binding architecture intent.
- A `Proposed` ADR is a pending choice and cannot be cited as approval for implementation unless the repository explicitly defines another status contract.
- A `Superseded` ADR is historical context; its named accepted successor governs.
- A `Rejected` ADR records an option not chosen and is not an implementation rule.

Each ADR owns one durable decision and identifies its status, date, owner, applicability, consequences, and succession. Implementation detail that can age may live in a linked non-normative guide, but all binding rules and exceptions remain in the canonical decision.

Before architecture-affecting work, an agent builds a bounded rule map from applicable accepted ADRs and ADR-linked repository examples. It treats unlinked current code as supporting evidence only when consistent with the accepted decisions. It reports semantic conflicts before mutation. If the requested outcome intentionally changes an accepted decision, the repository accepts a successor or uses its documented amendment process before conflicting implementation proceeds.

Plans, reviews, pull-request summaries, and final implementation reports identify the ADRs that materially influenced the work and state any unresolved governance gap. Documentation is updated when a decision or public architecture contract changes, not merely because code moved under an existing rule.

## Invariants

- ADR discovery paths and the active index are documented in agent instructions.
- Accepted ADRs are read before the affected architecture is changed, not reconstructed after implementation.
- Status and supersession are explicit and navigable in both directions when the repository contract supports triplets.
- Current code never silently supersedes an accepted decision.
- A generic framework recommendation never silently overrides a specific accepted repository ADR.
- Templates, checklists, and examples cannot create obligations absent from a canonical accepted decision.
- Small changes that only apply an existing decision do not require a new ADR.

## Conflict resolution

Operational instructions and permissions determine what the agent may do; accepted ADRs determine the architecture it should produce. When they conflict semantically, stop the affected implementation and identify the requested outcome, governing ADR, impact, and required decision owner. Among architecture sources, an applicable accepted successor governs over its predecessor, a specific scoped ADR governs over broad guidance, and official framework constraints may require a new successor rather than silent noncompliance.

## Failure handling

If ADR status, successor, applicability, or canonical location is indeterminate, remain non-mutating for the affected architectural decision and ask the maintainer or propose a bounded ADR repair. If code and an accepted ADR disagree, report drift and preserve behavior unless a separately approved refactor or decision change authorizes correction. Never fabricate an ADR or mark it accepted on the maintainer's behalf.

## Acceptance criteria

- Agent instructions point to the canonical ADR location and active index.
- A representative architecture task discovers the applicable accepted ADRs before editing.
- Proposed, rejected, and superseded decisions are not treated as active authority.
- A conflict test blocks implementation and names the required resolution.
- Completed architecture-affecting work reports the ADR IDs applied.
- A changed durable decision is represented by an accepted successor or documented amendment, not undocumented code drift.

## Consequences

Maintainers must keep status, links, and agent instructions current. In exchange, implementation shape becomes predictable, reviews can cite stable decisions, and agents stop re-researching choices the repository has already made.
