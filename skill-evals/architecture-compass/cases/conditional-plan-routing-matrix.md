# Conditional Plan Routing Matrix

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to refactor checkout processing. The change would move
code from two deployable apps into a new shared package, change the read/write
request boundary, and alter a public package contract. Existing ADRs require thin
entrypoints but do not decide ownership of the proposed package. Inspect the
repository, but do not change any files until I approve the architecture.
Native Plan mode and enforceable read-only controls are both supported but
inactive. No architecture checkpoint has been approved yet.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: Read-only enforcement: available but inactive
- contains: Architecture decision status: pending
- contains: Execution status: blocked
- contains: host-controlled
- contains: read-only decision phase
- contains: package ownership

## Expected Behavior

- Activate for a broad, behavior-changing, multi-boundary refactor.
- Classify unresolved package ownership, request boundaries, and public contract
  changes as durable decisions that require the decision phase.
- Classify the route from the prompt, request the separate host-controlled Plan
  and Read Only transitions, and stop before repository decision work until both
  are confirmed.
- After confirmation, inspect only enough evidence to plan the work; perform no
  repository, untracked, ignored, index, or external-state writes.
- Ask the maintainer to decide the unresolved ownership and contract questions
  only after both required host states are confirmed.
- Return `Architecture decision status: pending` and `Execution status: blocked`
  until approval. A later approved Plan-mode turn returns pending Plan-mode exit,
  exact target paths, exact validation commands, and the bounded continuation.
- Do not generalize the Plan route to narrow behavior-preserving refactors,
  audits, reviews, or already approved docs synchronization.
