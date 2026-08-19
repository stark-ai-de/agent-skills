# AC-ADR-046: Rank Architecture Evidence Without Expanding Operational Authority

ID: AC-ADR-046
Title: Rank Architecture Evidence Without Expanding Operational Authority
Status: Accepted
Date: 2026-07-29
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: authority, evidence-ranking, conflict-resolution, governance
Applies when: Architecture Compass combines user intent, target-repository decisions, documentation, implementation evidence, provider decisions, or framework guidance.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Rank architecture evidence independently from the permissions that limit execution.

Variants: [Short](ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.short.md) · **Long, canonical** · [Guide](ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.guide.md)

## Context

Architecture work becomes unsafe when permission, user intent, repository decisions, current code, provider recommendations, and framework defaults are treated as one precedence list. Permission to write does not make a conflicting design correct. Conversely, an architecture source cannot grant a write, deployment, publication, or destructive action. Current implementation can also be drift rather than intended policy.

Architecture Compass therefore needs one stable authority model that survives workflow changes without hiding conflicts or turning examples into binding rules.

## Decision

Architecture Compass resolves two independent axes:

1. Operational authority determines what may execute. System and host constraints, current user authorization, repository instructions, permissions, approved paths, read-only boundaries, protected state, and separate external-action gates can only narrow execution.
2. Architecture authority determines the intended result. Within the affected scope, rank evidence in this order:
   1. applicable accepted target-repository ADRs and their accepted successors;
   2. specific canonical target-repository architecture, stack, and agent documentation that is consistent with those ADRs;
   3. target examples explicitly approved or linked by the governing ADR or canonical documentation;
   4. consistent current implementation in the touched area;
   5. applicable adoptable Architecture Compass provider decisions that have not yet been accepted locally; and
   6. current general framework defaults or assumptions.

Specific scoped authority governs over broad guidance at the same level. Current code, templates, checklists, examples, provider decisions, and framework defaults never silently supersede an applicable accepted target ADR. An explicit request to change an accepted decision authorizes evaluating the change and using the repository's adaptation, amendment, or succession process; it does not erase the current decision before that process completes.

Setup still evaluates every selected or complete-coverage provider candidate. Contrary target evidence produces an explicit `adapt`, `defer`, or `reject` disposition rather than silent omission. Outside Setup, an unadopted provider decision remains guidance, not target-repository authority.

When architecture sources conflict, do not merge them into an invented compromise. Stop the affected implementation, record both sources, the blocked outcome, scope and impact, the recommended resolution, and the decision owner. Disjoint work may continue only when it does not depend on the unresolved choice.

## Invariants

- Architecture authority never grants operational permission.
- Operational permission never silently overrides architecture authority.
- Accepted target ADRs remain binding until the repository completes its documented change mechanism.
- Current code is evidence of state, not proof of intended policy when it conflicts with accepted architecture.
- Provider decisions remain adoption candidates until the target accepts or adapts them.
- Framework requirements that invalidate an accepted design trigger a visible target decision change rather than undocumented noncompliance.

## Conflict resolution

If two applicable accepted target ADRs conflict, or a current framework requirement makes one impossible, stop the affected implementation and identify the required decision owner or successor. If target evidence only conflicts with an unadopted provider decision, preserve target authority and record the provider disposition. If user intent conflicts with operational restrictions, preserve the restriction and report the blocked action separately from the architecture recommendation.

## Failure handling

If source status, applicability, specificity, or approval cannot be established, keep the affected rule unresolved and non-mutating. Do not promote code consistency, a provider example, or a framework default merely because higher-authority evidence is missing. Report which evidence would resolve the ranking.

## Acceptance criteria

- Reports distinguish operational authority from architecture authority whenever both affect the outcome.
- A bounded rule map identifies provenance, applicability, strength, and governing target decision.
- Current code cannot override a contradictory accepted ADR without a documented target decision change.
- Setup records every in-scope provider candidate without treating sparse evidence as permission to omit it.
- Every material conflict names its sources, impact, blocked scope, recommendation, and decision owner.
- Unresolved conflicts stop only the dependent work and never become silent compromises.

## Consequences

Agents must classify evidence instead of following the nearest example. Conflict reports and adoption dispositions add small bookkeeping overhead, but the repository's intended architecture stays distinguishable from task permission, current drift, provider guidance, and volatile framework defaults.
