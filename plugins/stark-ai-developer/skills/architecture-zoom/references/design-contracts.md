# Design contracts

## Readable abstraction, not more layers

A module is a responsibility with an interface and an implementation; it can be a function, package, or larger area. The interface includes everything a caller needs to use it correctly: inputs, results, invariants, ordering, errors, configuration, and relevant resource constraints. Few methods alone do not establish a simple interface.

Hide internal complexity while keeping correct use and maintenance local. Ask whether a change to one responsibility can be made and verified without distributing its knowledge across many callers. Avoid pass-through abstractions and speculative extension systems. A security, ownership, or failure boundary may justify separation even with one implementation. Do not collapse genuinely different responsibilities merely to reduce file count.

The planning contract can remain small while the implementation has private parts. Support verification through observable behavior. Deterministic logic and explicit dependencies help, but real integration and composition still need their own evidence. Do not delete valuable tests merely because a new interface-level test exists; first establish equivalent risk coverage.

## Compact module card

For a relevant module, capture:

- ID, parent, responsibility, and explicit exclusions.
- Inputs, outputs, invariants, error behavior, and side effects.
- Required properties of dependencies and cross-cutting constraints.
- Proposed or accepted decisions, assumptions, and unresolved risks.
- Evidence references, revision, environment, scope, result, and limitations.
- Acceptance scenarios not yet run, child links, and the trigger for deeper detail.

Use only material fields. Simple modules may share a table. Each contract has one authoritative definition; overviews link to it rather than becoming another normative version.

Children must account for their parent's obligations, including interactions and error cases. Independently acceptable children do not prove a correct composition. Shared dependencies appear once with explicit edges. Cyclic operational dependencies need explanation; circular evidence never validates a claim.

## Product closure

Keep two linked views: responsibility decomposition and delivery sequencing. A feature can cross several modules and a module can serve several features. A task tree is neither view by itself.

For each release, identify the user, starting condition, complete journey, observable outcome, boundaries, failure/recovery behavior, and acceptance scenario. Its dependencies must be already available or delivered inside it. A later release must not be required to make the current promise true.

A smaller supported audience, source, environment, or interaction can reduce scope. Necessary authorization, integrity, and recovery properties for that scope cannot be deferred while claiming usability. A mock of a required external integration is not real integration evidence. POCs have a question, effort limit, stop condition, and consumption decision; they are not MVPs.

Keep one active product increment as the default focus, with bounded tasks or parallel independent work inside it. Link enabling work to its consuming increment. When an attractive optional feature competes with an incomplete required journey, close the journey first unless a material risk changes the decision. When done, stop; record optional improvements without implementing them.

## Assurance and change impact

Keep decision status, evidence status, and execution status independent. Use requirement, assumption, proposal, accepted decision, or observed fact for material statements. Evidence establishes only the tested/source-backed claim under recorded conditions. Tests, human review, model review, and formal proof are not interchangeable.

Maintain links such as goal -> capability/journey -> release -> slice -> acceptance -> evidence, with module and ADR references alongside them. No arithmetic confidence score is needed.

On a changed requirement, assumption, interface, or relevant repository state, inspect affected consumers and ancestors. Recheck the impacted decisions, summaries, tests, and approvals; preserve unaffected current results. An unrelated commit does not invalidate everything automatically, but unassessed drift cannot be called harmless. Unknown impact blocks dependent completion claims. A changed approval scope requires a new decision only for the affected change.

## Bounded architecture review

Required corrections identify a violated agreed criterion. Necessary refactoring names the blocker and smallest safe change; beneficial prefactoring names a concrete upcoming consumer. Optional improvement remains optional. The original product goal cannot be traded for architectural elegance without a material user decision.

These rules are original guidance inspired by established modularity and vertical-delivery concepts, not a vendored copy of another skill. Architecture Compass owns shared module-contract review in the accepted coordinated integration. This local reference keeps Architecture Zoom self-contained; resolve the actually installed Compass guidance when its review is selected.
