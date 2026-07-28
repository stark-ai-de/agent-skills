# Agent Instructions

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this template conflicts or drifts.

## ADRs are binding

Before non-trivial implementation, refactor, or review:

1. Discover the repository ADR index and task-specific ADR paths.
2. Select relevant ADRs by applicability; read Short first.
3. Read canonical Long variants before work depends on their constraints.
4. Load Guide only for current mechanics and examples.
5. Mention the ADRs that influenced plans, reviews, and final claims.

## Authority axes

- Host/repository instructions, permissions, and safety constraints determine what the agent may do.
- Accepted or superseding ADR Long variants determine intended architecture.
- Current code and tests prove current state, not intended policy.
- A user request defines scope and may request a successor; it does not silently replace an accepted ADR.

If these sources conflict semantically, obey the safety boundary, report the conflict, and stop the blocked implementation until the sources are synchronized or a successor is accepted.

## Required workflow

1. Identify the affected boundary.
2. Read applicable ADRs and referenced approved examples.
3. State constraints, permission boundary, and validation.
4. Implement only the approved reversible slice.
5. Verify behavior and ADR conformance.
6. Update documentation only when architecture intentionally changes.

## Drift rule

Do not introduce a competing layout, runtime boundary, request flow, dependency owner, data contract, validation path, or delivery policy when an accepted ADR already governs it.
