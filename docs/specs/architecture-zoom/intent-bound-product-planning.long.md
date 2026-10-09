# ADR draft: Coordinate product planning through intent-bound skill contracts

ID: Unallocated provider draft
Title: Coordinate product planning through intent-bound skill contracts
Status: Proposed
Date: 2026-10-09
Owner: stark-ai-de maintainers
Scope: target-repository
Category: engineering-workflow
Tags: product-planning, skill-routing, vertical-slices, autonomy, evidence
Applies when: A repository opts into coordinated incremental product or feature planning.
Adoptable: true
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: Not qualified by host behavior tests
Gist: The main agent selects the next missing planning capability, reuses current artifacts, and stops at an authorized, verifiable product-planning outcome.
Variant: Long

Variants: [Short](intent-bound-product-planning.short.md) · **Long** · [Guide](intent-bound-product-planning.guide.md)

> Proposed future provider decision, intentionally outside the active library. No provider ID is reserved, no target decision is accepted, and no runtime permission changes here. Long is authoritative only within this draft set.

## Context

Readable hierarchical design does not ensure usable delivery. Well-cut modules can still produce an unfinished product, while a convincing MVP demo can omit real integration and required failure handling. Separate planning skills can repeatedly interview the user, duplicate documents, and optimize their own step rather than close a product promise.

A durable ADR also does not load itself. Discovery, selection, installation, loading and execution are different capabilities. New sessions need a supported entrypoint and current artifacts; persisted approvals and evidence can become stale.

## Decision

Adopt one state-dependent coordination contract. The active main agent owns the task's current context, routes through only the missing capabilities, and integrates specialist results. This is a planning policy, not a background execution service or a fourth mandatory skill.

### Ownership and scope

Architecture Zoom owns goals, audiences, journeys, non-goals, readable architecture and release closure. Architecture Compass owns module quality, architecture contracts, decisions and drift. Codex Spec Interviewer owns the selected implementation slice's specification. The responsible user retains material product decisions, trade-offs and unapproved side-effect authorization.

Overviews link canonical contracts rather than creating competing policies. Retain Compass's public workflows and each route's authority; audit does not write or install, and new implementation is not relabeled as refactoring. The interviewer remains planning-only. An explicitly authorized outer implementation workflow may continue after handoff, but this decision supplies no such authority by itself.

### Adoption and startup

An authorized setup resolves a repository-native ADR identity, owner, status, path and provider mapping. Reuse equivalent local rules; surface conflicts rather than overwrite accepted history. This decision is a conditional planning adoption, not a universal addition to the evidence-empty foundation.

Bind only a compact reference to the local ADR and current product/work index in an actually supported and authorized host instruction surface. Inspect scope, precedence, overrides and startup behavior. Do not write every host's files or global configuration speculatively. Provider acceptance neither accepts the local ADR nor authorizes its operational effects.

Record selected skill identities, canonical sources, observed revisions, installation scopes and update ownership. Reuse approved existing installations. Distinguish policy adopted, adapter configured, skill available, instructions loaded and routing behavior qualified. A file, catalog entry or successful installation does not prove the other states.

### Routing

Inspect intent, authority, relevant current artifacts, conflicts and missing prerequisites before choosing a step.

| State                                                                                                     | Next step                                                                                |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Product goal or complete increment is unclear                                                             | Architecture Zoom                                                                        |
| Product view exists; required module contracts, design decisions or architecture conflicts are unresolved | Architecture Compass in the appropriate existing route                                   |
| Product/release contribution and architecture boundaries suffice; selected slice is unspecified           | Codex Spec Interviewer                                                                   |
| Relevant current implementation spec exists                                                               | Skip planning; continue only within separately granted implementation authority          |
| Read-only architecture review                                                                             | Compass audit; no installation or persistence                                            |
| Trivial bounded correction                                                                                | No mandatory specialist chain                                                            |
| Session resume                                                                                            | Reconcile revisions, scope and approval validity, then enter at the first missing result |

An explicit narrow skill or brainstorming request must not expand into full orchestration. Drafts can be exchanged while a decision is proposed. Unaccepted load-bearing decisions block dependent implementation, not every independent planning action. A feasibility gap may produce a bounded POC question, not an unapproved experiment.

### Handoff and shared state

Use an existing issue, work item or specification where possible. Reference goal, release and slice; authoritative artifacts and relevant revisions; scope, non-goals and acceptance; assumptions and open questions; evidence and limitations; and genuine authorization for each effect class. A phase field is coordination data, not permission.

Reuse answered questions and unchanged approvals. A specialist returns a bounded result or a concrete missing prerequisite to the coordinator. It does not launch another top-level workflow. Only the coordinator reconciles shared canonical edits; delegated parallel reviews remain scoped and optional. Reading the smallest relevant context is preferable to loading all skills and all specifications at startup.

### Product and architecture quality

The agreed whole product's functional breadth and core journeys remain visible. Future implementation detail may be deferred, but decision-relevant risks must surface at the level they affect.

Module interfaces state the conditions for correct use, invariants, ownership, errors and effects while hiding internal machinery. Refine where this resolves a real decision. Extra abstractions and broad refactors require a concrete current or selected-next-increment benefit. Classify required corrections, material trade-offs and optional improvements separately.

Keep the structure map and delivery map distinct. Each release must fulfill its own bounded promise using prior capabilities plus work inside the release. Close missing core paths before optional polish. A ticket or enabling refactor need not be an MVP; it must have a clear consuming outcome and completion boundary. A POC needs a question, budget and exit condition. Necessary integrity, recovery and protection are not optional for an advertised scope.

Trace important requirements to journeys, contracts, releases, slices, acceptance and evidence. Component success alone does not prove composition. A required integration exercised only through mocks remains unqualified for real use.

### Authority and provisioning

Selecting a process, selecting skills, installing, loading, writing documents, implementing code and taking external actions are different permissions. Host/repository controls and the user's actual grant remain authoritative. A self-authored approval field or an ADR citation does not create authorization. Active Plan retains its no-write boundary.

Where an accepted runtime policy supports it, the user may explicitly preselect exact skills for scoped future requests. A single concrete checkpoint may approve known unchanged content and specified writes; do not repeat it on every handoff. A material scope, destination, source or permission change requires an affected-scope decision, not blanket reuse.

Optional provisioning requires an explicitly allowed source, selected identity, installation scope, update policy/owner and host capability. Reuse existing authorized global or project installations rather than silently shadowing them. Resolve provenance and actual version; no namesake fallback, unreviewed moving source, arbitrary downloaded instructions or unrelated tool/credential permissions. Read back results and report restart requirements. Unavailable, offline or ambiguous capability blocks only the affected handoff; never claim it succeeded.

Reconcile this behavior through the regular successor/adaptation process for any conflicting accepted skill-runtime rule, especially AC-ADR-039. A target-repository coordination ADR cannot override provider runtime or host permissions.

### Drift, proof and termination

Preserve requirements, assumptions, proposed/accepted decisions, execution state and evidence as distinct facts. Source review, local tests, CI, installation, deployment and external integration prove different stages. No model review or fabricated confidence score substitutes for technical evidence.

On relevant changes, recheck the affected contracts, dependents, summaries, approvals and evidence. Do not preserve stale claims; do not discard unrelated current results just because a commit changed. Unknown impact remains unresolved. Expired permission does not become valid after resumption.

Agree a finite review/effort budget. Findings must identify an unmet criterion; optional improvements do not reopen done work. Stop at satisfied acceptance, a material unresolved decision, budget exhaustion or missing authority. Do not weaken criteria to report success. A planning-only request ends at authorized document delivery.

## Alternatives

A fixed three-step pipeline is simpler but repeats work and over-plans small tasks. A fourth orchestrator skill creates another owner and installation dependency before the pattern is validated. Implicit discovery alone has no repository-specific routing or resumption contract. Unrestricted installation confuses process selection with operational authority. The chosen contract keeps specialization while making transitions explicit.

## Consequences

The user decides material product trade-offs instead of manually driving every skill switch. Costs include maintaining links, source/permission state and qualifying host behavior. Skills remain instructions, not hard enforcement, and no universal correctness guarantee follows. Future harness automation can implement the same state and evidence contracts after the pilot establishes their usefulness.

## Acceptance

Fresh/resumed session tests select the correct entry and reuse prior answers. Negative tests deny unapproved effects and forged approvals. Changed-contract tests invalidate only affected conclusions. Horizontal plans become closed user outcomes; mock-only integrations never count as real usability. Budget tests terminate optional optimization. Reports distinguish adopted, configured, available, loaded, qualified and enforced states. Record actual observations and limitations rather than declaring these tests passed from the written policy.
