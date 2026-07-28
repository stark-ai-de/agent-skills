# AC-ADR-003: Coordinate Agents and Execute Only Approved Bounded Slices

ID: AC-ADR-003
Title: Coordinate Agents and Execute Only Approved Bounded Slices
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: agent-lifecycle
Tags: collaboration, delegation, execution-boundary
Applies when: Architecture Compass delegates work, resumes an approved checkpoint, or executes a multi-file or phased change.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep one accountable lead, disjoint delegated ownership, and an exact approved execution boundary.

Variants: [Short](ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.short.md) · **Long, canonical** · [Guide](ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.guide.md)

## Context

Parallel agents can reduce latency, but they also create stale findings, overlapping edits, implicit scope expansion, and unsupported completion claims. An approved plan can become unsafe when the branch, index, instructions, governing ADRs, target paths, or validation contract changes before execution. Phases also become accidental blanket authorization when their individual boundaries are not explicit.

## Decision

Every Architecture Compass run has one lead agent accountable for request interpretation, scope, permission and approval gates, ownership allocation, cross-result reconciliation, validation coverage, and final claims.

Delegation follows these rules:

- Delegate only concrete, independently checkable subtasks that materially improve speed or quality.
- Every delegated task inherits the active repository instructions, user authorization, read/write boundary, public-safety rules, architecture decisions, evidence-stage limits, and validation contract.
- Give each writing agent an exact, disjoint path allowlist. Shared-file ownership remains with one agent unless coordination explicitly serializes the edits.
- A delegated agent does not stage, commit, push, publish, mutate external state, widen scope, or authorize a later phase unless the user granted that action to the overall run and the lead assigned it explicitly.
- Delegated findings and patches are provisional. The lead verifies them against current repository state, final content, applicable ADRs, and validation output before relying on them.
- Missing, interrupted, stale, or unreconciled delegated work is missing evidence, not implicit success.

An implementation slice is executable only when the user requested implementation and its checkpoint identifies the intended behavior, exact allowed paths, material assumptions, required permission transition, validation commands, stop conditions, and rollback or recovery boundary where relevant.

When collaboration routing is material, the public lifecycle contract reports these exact fields and values:

- `Planning capability`: `Active | Available but inactive | Unavailable | Explicitly declined | Indeterminate | Not applicable`, with evidence;
- `Read-only enforcement`: `enforced | available but inactive | unavailable | explicitly declined | indeterminate | not applicable`, with evidence;
- `Architecture decision status`: `not required | pending | approved | blocked`;
- `Execution status`: `not requested | ready for direct execution | pending Plan-mode exit | pending write permission | blocked | completed`.

`completed` means only that the approved slice and declared validation completed. It does not imply CI, publication, installation, deployment, production, or third-party success.

Immediately before the first write, the responsible agent re-reads repository identity and root, branch and `HEAD`, index-safe full status, active instructions, governing ADRs, every target path, and the validation contract. Material drift invalidates the execution checkpoint until reconciled. The agent applies only the approved slice and stops before touching another path.

For phased work, each phase records its own inputs, allowlist, acceptance evidence, stop conditions, and rollback. Completing or validating one phase does not authorize the next phase, a wider mutation, or publication.

## Invariants

- Accountability is not delegated: one lead reconciles all reports and owns the final statement.
- Read-only work remains read-only in every child task.
- Concurrent write ownership is disjoint and explicit.
- Existing staged, unstaged, untracked, ignored, and external state is preserved unless its exact mutation was authorized.
- A new user instruction that replaces scope invalidates the prior checkpoint for affected work.
- A path discovered during implementation is not automatically in scope.
- Validation is proportional to the slice and is never described as proof of an untested phase or environment.

## Conflict resolution

When two agents claim the same file, decision, or evidence surface, pause overlapping mutation and assign one owner or serialize the work. When a delegated recommendation conflicts with current code or an applicable ADR, current reconciled evidence and the authority rules govern; the report itself has no independent authority. When the user changes scope, discard incompatible provisional plans and re-establish the affected checkpoint.

## Failure handling

Stop the affected write when ownership overlaps, the allowlist is incomplete, required approval or permission is absent, repository state drifts materially, or a target path is removed or repurposed. Preserve completed disjoint work when safe, report the exact blocker, and do not use destructive Git operations to force the baseline back into shape. If a delegated task fails, continue only where its evidence is not required for correctness or acceptance.

## Acceptance criteria

- Each delegated task names its deliverable, read/write status, owned paths, exclusions, and validation responsibility.
- No two active writers own the same path.
- The lead reconciles every used report against the final artifacts and identifies missing or stale evidence.
- A pre-write recheck either matches the checkpoint or blocks execution with the material drift named.
- Changed files remain within the approved allowlist.
- Each phase has independent acceptance and does not imply approval of later phases.

## Consequences

Coordination has explicit bookkeeping and may serialize shared-file work. It makes parallel execution reviewable, protects active worktrees, and prevents provisional subagent output or an old plan from becoming false proof.
