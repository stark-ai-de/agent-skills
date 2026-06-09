# Agent Instructions

## ADRs are binding

This repository uses Architecture Decision Records as the source of truth for architectural and implementation constraints.

Before implementing, refactoring, reviewing, or generating code, the agent must:

1. Discover relevant ADRs in:
   - `docs/adr/`
   - `docs/architecture/`
   - any task-specific ADR paths mentioned by the user
2. Read the applicable ADRs before changing code.
3. Treat accepted ADRs as binding unless the user explicitly asks to update, replace, or supersede them.
4. Prefer existing repository patterns and examples that are referenced by the ADRs.
5. Avoid introducing a different structure, abstraction, dependency, naming convention, data-flow pattern, or runtime pattern when an applicable ADR already defines one.
6. If a requested change conflicts with an ADR, report the conflict before implementing.
7. In plans, pull request summaries, and final responses, mention the ADRs that influenced the implementation.

## Decision precedence

When instructions conflict, use this order:

1. Explicit user instruction in the current task.
2. Repository `AGENTS.md`.
3. Accepted ADRs in `docs/adr/`.
4. Architecture docs in `docs/architecture/`.
5. Stack rules, conventions, and local examples.
6. General framework or language defaults.

If an explicit user instruction conflicts with an accepted ADR, do not silently ignore the ADR. Explain the conflict and ask whether the ADR should be changed or the implementation should follow the existing decision.

## Required workflow

For every non-trivial code change:

1. Identify the affected area.
2. Search for relevant ADRs.
3. Search for existing examples that implement the ADR.
4. State the applicable constraints.
5. Implement according to those constraints.
6. Verify that the change does not introduce ADR drift.
7. Update documentation only when the change intentionally modifies the architecture.

## ADR drift rule

The agent must not create new patterns that compete with an accepted ADR.

Examples of ADR drift include:

- adding a new folder layout when an ADR defines the source structure,
- adding client-side data fetching when an ADR requires a server/read boundary,
- creating a new runtime bootstrap pattern when an ADR defines one,
- duplicating a shared utility instead of using the ADR-approved reusable component,
- bypassing typed contracts, query options, or shared boundaries required by ADRs.
