# AC-ADR-026: Route Architecture Compass Through Explicit Setup and Apply Pipelines

ID: AC-ADR-026
Title: Route Architecture Compass Through Explicit Setup and Apply Pipelines
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, explicit-selection, setup, apply
Applies when: Architecture Compass is activated, classifies setup or apply work, persists provider ADRs, or starts ADR-guided refactoring.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-002
Superseded by: AC-ADR-043
Guide verified: 2026-07-28
Gist: Require a confirmed finite Setup or Apply selection before Architecture Compass begins substantive work.

Variants: [Short](ac-adr-026-route-architecture-compass-through-explicit-setup-and-apply-pipelines.short.md) · **Long, canonical** · [Guide](ac-adr-026-route-architecture-compass-through-explicit-setup-and-apply-pipelines.guide.md)

## Context

Architecture Compass previously exposed `setup` and `refactor`, then inferred multiple internal modes after activation. That made it difficult for a user to see whether an invocation would remain read-only, add ADR governance, replace architecture documentation, or refactor application code. It also left provider-to-repository ADR identity and overlap handling under-specified. A safe workflow needs a finite public contract, explicit confirmation, and one local architecture history that does not erase accepted decisions.

## Decision

Architecture Compass exposes exactly two canonical public actions and waits for explicit user confirmation before beginning substantive work.

### Start-selection checkpoint

On every activation, the skill may inspect only the minimum host capability and non-mutating repository identity/status evidence needed to populate a checkpoint. It then presents:

- action and variant;
- setup profile, including the fallback profile for a writing Apply variant;
- intended write scope;
- `Planning capability` and `Read-only enforcement` with separate evidence;
- expected artifacts;
- protected paths and pre-existing dirty, staged, unstaged, or untracked state;
- any compatibility normalization.

The invocation can prefill a recommended selection but is not itself confirmation. The user explicitly confirms or changes the checkpoint through a structured question control when available or an explicit textual reply otherwise. No architecture audit, provider lookup, mutation, or external side effect begins before that confirmation.

### Setup action

`setup` accepts exactly one profile:

- `all` selects every `Scope: target-repository`, `Adoptable: true` provider ADR.
- `repo-relevant` selects provider ADRs whose applicability intersects inspected target evidence and records every other adoptable provider ADR as `defer` with a future trigger or owner condition.
- `base` selects exactly AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, and AC-ADR-022 and records every other adoptable provider ADR as deferred.

Setup discovers the repository's existing ADR and instruction conventions before writing. It establishes or repairs the minimal governance structure, persists selected provider decisions under repository-native ADR IDs, records a stable `AC-ADR -> local ADR` mapping, and updates supported agent-instruction surfaces. `all` does not include skill-runtime ADRs. `repo-relevant` and `base` do not silently omit non-selected candidates.

### Apply action

`apply` accepts exactly one variant:

- `audit` is strictly read-only. It compares current implementation and accepted repository architecture with applicable provider ADRs, reports concrete deviations, and then offers exactly: end, create a refactoring specification, or start a refactor. It does not bootstrap setup or create any artifact.
- `audit-and-adr-apply` audits first, then creates or repairs missing governance and persists the applicable provider ADRs and mapping. Its write scope ends at ADR, index, mapping, and supported agent-instruction files.
- `audit-and-apply-refactor` performs the audit and ADR application, translates the reconciled ADR set and gap report into a refactoring specification, obtains one explicit architecture checkpoint for the complete bounded refactor, and then executes the approved reversible slices autonomously until completion or a declared stop condition.

A writing Apply variant explicitly records its fallback setup profile; `repo-relevant` is the recommended prefill, not an implicit selection. Missing or incomplete setup is repaired before provider ADR persistence or code refactoring. Audit never inherits that write behavior.

### Local ADR identity and overlap

Provider IDs are provenance identifiers, not target-repository numbering authority. Every adopted or adapted provider decision maps to one repository-native ADR ID and path. The mapping records provider ID, local ID/path, disposition, status, and adaptation or conflict notes.

An accepted local ADR is never overwritten. When a local ADR combines a provider decision with additional repository-specific decisions, the record is split through the target repository's accepted history mechanism so the provider decision remains independently discoverable and the additional local decision remains in a separate ADR. When an accepted local decision conflicts with a provider decision, preserve it and stop the affected write until the maintainer accepts a successor, an explicit adaptation, or a defer/reject disposition. Mechanical copying never changes historical meaning.

Use a repository-local configured spec interviewer for unresolved conflict when present. Otherwise use the interviewer matching the execution host. If neither is available, return a bounded decision handoff without claiming acceptance.

### Agent instructions and deviations

Recognize existing `AGENTS.md` files, `CLAUDE.md` or `.claude/rules`, and `.cursor/rules`. `CLAUDE.local.md` and legacy `.cursorrules` are evidence when already present. Do not treat `CONTEXT.md` as a Claude instruction file automatically.

Updated instructions identify the canonical ADR index and mapping, require applicable accepted ADRs to be read and followed, and state that code or prompt intent cannot silently supersede them. If the user requests an accepted-ADR violation, emit a visible warning naming the ADR, conflict, affected scope, and resolution options, then stop the affected implementation until the user accepts a successor or adaptation or withdraws the deviation.

### Compatibility

`refactor` remains a deprecated input alias and is normalized to `apply` before the checkpoint. `new-implementation`, `pr-review`, `docs-sync`, and `stack-deviation` remain accepted internal context hints for evidence selection, collaboration route, and report shape; they are not additional public actions or variants.

The target state is semantic rather than byte-identical: repositories use their native IDs and conventions while retaining independently discoverable provider decisions, explicit mapping, binding agent instructions, conforming implementation where authorized, and staged validation evidence.

## Invariants

- The skill never starts substantive work from inferred prompt intent alone.
- Exactly one public action and one applicable profile or variant are confirmed.
- Audit is read-only even when setup is absent or drift is severe.
- A selection checkpoint does not grant permission for a later destructive, irreversible, externally visible, or scope-expanding action.
- Provider ADRs keep their decision semantics while local IDs and wrappers remain repository-native.
- Accepted local decisions and accepted provider decisions change through explicit adaptation or reciprocal succession, never silent overwrite.
- Agent instructions make accepted ADRs binding and make deviations visible.
- Internal compatibility contexts do not expand the public mode inventory.

## Conflict resolution

Operational instructions and permissions limit what may execute. Accepted local ADRs and accepted provider decisions establish intended architecture within their applicable scope. If they conflict, stop the affected mutation and resolve the architecture history explicitly. If a requested write exceeds the confirmed variant, return to the selection checkpoint. If the initial checkpoint conflicts with later repository evidence, present the revised scope and obtain confirmation again before mutation.

## Failure handling

Stop before the affected action when user confirmation is absent, repository identity or status drifts materially, write authority is missing, protected paths overlap unexpectedly, setup cannot be repaired safely, mapping is ambiguous, an accepted ADR conflict remains unresolved, or work would cross an irreversible boundary without separate approval and recovery evidence. Preserve completed disjoint reversible work, report the blocker, and do not use destructive Git operations to force alignment.

## Acceptance criteria

- Every activation visibly lists and confirms the applicable finite choices before substantive work.
- Setup profile behavior is deterministic, including the exact six-ADR base set and visible deferrals.
- All three Apply variants enforce their distinct write boundaries.
- Writing Apply variants repair missing setup before ADR or code changes.
- Audit findings identify concrete drift and expose the three explicit follow-up choices without writing.
- Local ADR mapping, split, adaptation, and succession preserve accepted history.
- Supported agent instructions are updated without treating `CONTEXT.md` as a Claude file.
- An explicit ADR-breaking request warns and stops until documented resolution.
- A confirmed full-refactor checkpoint authorizes only its bounded slices and validation, after which execution proceeds without repeated preference questions unless a stop condition occurs.

## Consequences

Every invocation has an extra confirmation step and writing Apply runs maintain a mapping artifact. In exchange, users can invoke the skill without perfectly phrasing the first prompt, audit remains predictably non-mutating, repositories retain native ADR history, and Architecture Compass outcomes become comparable without requiring identical filenames or IDs.
