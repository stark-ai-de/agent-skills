# AC-ADR-043: Route Architecture Compass Through Explicit Setup and Apply Pipelines With Risk-Based Validation

ID: AC-ADR-043
Title: Route Architecture Compass Through Explicit Setup and Apply Pipelines With Risk-Based Validation
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, explicit-selection, setup, apply, validation
Applies when: Architecture Compass is activated, classifies setup or apply work, persists provider ADRs, or starts ADR-guided refactoring.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-026
Superseded by: AC-ADR-045
Guide verified: 2026-07-29
Gist: Preserve explicit Setup and Apply pipelines while adding risk-based validation to the fixed base profile.

Variants: [Short](ac-adr-043-route-architecture-compass-through-explicit-setup-and-apply-pipelines-with-risk-based-validation.short.md) · **Long, canonical** · [Guide](ac-adr-043-route-architecture-compass-through-explicit-setup-and-apply-pipelines-with-risk-based-validation.guide.md)

## Context

AC-ADR-026 established finite `setup` and `apply` actions, explicit confirmation, distinct write boundaries, repository-native provider mapping, and preservation of accepted local history. It also fixed `base` to six provider decisions. AC-ADR-042 now makes validation cadence, check ownership, evidence reuse, Preview-first environment proof, and guarded production fallback a default repository guardrail. Editing AC-ADR-026 would violate accepted-history stability, so this successor carries its complete contract forward and changes only the validation baseline and its derived checkpoint fields.

## Decision

Architecture Compass exposes exactly two canonical public actions and waits for explicit user confirmation before beginning substantive work.

### Start-selection checkpoint

On every activation, the skill may inspect only the minimum host capability and non-mutating repository identity/status evidence needed to populate a checkpoint. It then presents:

- action and variant;
- setup profile, including the fallback profile for a writing Apply variant;
- intended write scope;
- `Planning capability` and `Read-only enforcement` with separate evidence;
- expected artifacts;
- protected paths and pre-existing dirty, staged, unstaged, or untracked state; and
- any compatibility normalization.

The invocation can prefill a recommended selection but is not itself confirmation. The user explicitly confirms or changes the checkpoint through a structured question control when available or an explicit textual reply otherwise. No architecture audit, provider lookup, mutation, or external side effect begins before that confirmation.

### Setup action

`setup` accepts exactly one profile:

- `all` selects every `Scope: target-repository`, `Adoptable: true` provider ADR.
- `repo-relevant` selects provider ADRs whose applicability intersects inspected target evidence and records every other adoptable provider ADR as `defer` with a future trigger or owner condition.
- `base` selects exactly AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, AC-ADR-022, and AC-ADR-042 and records every other adoptable provider ADR as deferred.

Setup discovers the repository's existing ADR, instruction, validation, and evidence conventions before writing. It establishes or repairs the minimal governance structure, persists selected provider decisions under repository-native ADR IDs, records a stable `AC-ADR -> local ADR` mapping, and updates supported agent-instruction surfaces. `all` does not include skill-runtime ADRs. `repo-relevant` and `base` do not silently omit non-selected candidates.

When AC-ADR-042 is selected, Setup records an existing repository-native Spec, status, or evidence path for reusable validation receipts. If none exists, it proposes the smallest fitting path and obtains confirmation before creating it. Setup does not run implementation tests, create Preview, deploy, publish, or probe production merely because it adopts the validation policy.

### Apply action

`apply` accepts exactly one variant:

- `audit` is strictly read-only. It compares current implementation and accepted repository architecture with applicable provider ADRs, reports concrete deviations, and then offers exactly: end, create a refactoring specification, or start a refactor. It does not bootstrap setup, create an artifact, run a Preview, or perform a production probe.
- `audit-and-adr-apply` audits first, then creates or repairs missing governance and persists the applicable provider ADRs and mapping. Its write scope ends at ADR, index, mapping, confirmed evidence-location, and supported agent-instruction files.
- `audit-and-apply-refactor` performs the audit and ADR application, translates the reconciled ADR set and gap report into a refactoring specification, obtains one explicit architecture checkpoint for the complete bounded refactor, and then executes the approved reversible slices autonomously until completion or a declared stop condition.

A writing Apply variant explicitly records its fallback setup profile; `repo-relevant` is the recommended prefill, not an implicit selection. Missing or incomplete setup is repaired before provider ADR persistence or code refactoring. Audit never inherits that write behavior.

When the local mapping selects AC-ADR-042, the refactoring specification and checkpoint identify the highest risk, proof obligations, cadence, one owner per check, reusable and invalidated receipts, final aggregate gate, failure-localization path, and environment-evidence choice. Preview, deployment, production, publication, traffic, migration, and other external actions retain their own permissions and stop conditions. The Setup/Apply checkpoint does not grant them.

### Local ADR identity and overlap

Provider IDs are provenance identifiers, not target-repository numbering authority. Every adopted or adapted provider decision maps to one repository-native ADR ID and path. The mapping records provider ID, local ID/path, disposition, status, and adaptation or conflict notes.

An accepted local ADR is never overwritten. When a local ADR combines a provider decision with additional repository-specific decisions, split the record through the target repository's accepted history mechanism so the provider decision remains independently discoverable and the additional local decision remains separate. When an accepted local decision conflicts with a provider decision, preserve it and stop the affected write until the maintainer accepts a successor, an explicit adaptation, or a defer/reject disposition. Mechanical copying never changes historical meaning.

Use a repository-local configured spec interviewer for unresolved conflict when present. Otherwise use the interviewer matching the execution host. If neither is available, return a bounded decision handoff without claiming acceptance.

### Agent instructions and deviations

Recognize existing `AGENTS.md` files, `CLAUDE.md` or `.claude/rules`, and `.cursor/rules`. `CLAUDE.local.md` and legacy `.cursorrules` are evidence when already present. Do not treat `CONTEXT.md` as a Claude instruction file automatically.

Updated instructions identify the canonical ADR index and mapping, require applicable accepted ADRs to be read and followed, and state that code or prompt intent cannot silently supersede them. When AC-ADR-042 is adopted, instructions also identify the confirmed receipt location and require risk/cadence planning, one check owner, receipt reconciliation, and explicit invalidation without duplicating the canonical policy text.

If the user requests an accepted-ADR violation, emit a visible warning naming the ADR, conflict, affected scope, and resolution options, then stop the affected implementation until the user accepts a successor or adaptation or withdraws the deviation.

### Compatibility

`refactor` remains a deprecated input alias and is normalized to `apply` before the checkpoint. `new-implementation`, `pr-review`, `docs-sync`, and `stack-deviation` remain accepted internal context hints for evidence selection, collaboration route, and report shape; they are not additional public actions or variants. `reuse`, `final-batch`, `checkpointed`, and `reproduce-first` are internal validation cadences, not public skill modes.

The target state is semantic rather than byte-identical: repositories use native IDs and conventions while retaining independently discoverable provider decisions, explicit mapping, binding agent instructions, conforming implementation where authorized, repository-native receipts, and staged validation evidence.

## Invariants

- The skill never starts substantive work from inferred prompt intent alone.
- Exactly one public action and one applicable profile or variant are confirmed.
- Base resolves to exactly AC-ADR-005, 006, 018, 019, 021, 022, and 042.
- Audit is read-only even when setup is absent or drift is severe.
- A selection checkpoint does not grant permission for destructive, irreversible, externally visible, Preview, deployment, publication, or production action.
- Provider ADRs keep their decision semantics while local IDs and wrappers remain repository-native.
- Accepted local and provider decisions change through explicit adaptation or reciprocal succession, never silent overwrite.
- Agent instructions make accepted ADRs binding and make deviations visible.
- Validation planning assigns each proof obligation once and reuses evidence only after current-state reconciliation.
- Internal compatibility contexts and validation cadences do not expand the public mode inventory.

## Conflict resolution

Operational instructions and permissions limit what may execute. Accepted local ADRs and accepted provider decisions establish intended architecture within their applicable scope. If they conflict, stop the affected mutation and resolve the architecture history explicitly. If a requested write exceeds the confirmed variant, return to the selection checkpoint. If the initial checkpoint conflicts with later repository evidence, present the revised scope and obtain confirmation again before mutation. If a requested environment probe lacks its separate authority or AC-ADR-042 eligibility, report the evidence gap and stop that action.

## Failure handling

Stop before the affected action when user confirmation is absent, repository identity or status drifts materially, write authority is missing, protected paths overlap unexpectedly, setup cannot be repaired safely, mapping or evidence location is ambiguous, an accepted ADR conflict remains unresolved, required evidence is failed or invalid, or work would cross an irreversible or external boundary without separate approval and recovery evidence. Preserve completed disjoint reversible work, report the blocker, and do not use destructive Git operations to force alignment.

## Acceptance criteria

- Every activation visibly lists and confirms the applicable finite choices before substantive work.
- Setup behavior is deterministic, including the exact seven-ADR base set and visible deferrals.
- All three Apply variants enforce their distinct write boundaries.
- Writing Apply variants repair missing setup before ADR or code changes.
- AC-ADR-042 adoption records a confirmed repository-native receipt location without inventing a universal filename.
- Audit findings identify concrete drift and expose the three explicit follow-up choices without writing or probing an environment.
- Local ADR mapping, split, adaptation, and succession preserve accepted history.
- Supported agent instructions are updated without treating `CONTEXT.md` as a Claude file.
- An explicit ADR-breaking request warns and stops until documented resolution.
- A full-refactor checkpoint records risk, cadence, check ownership, receipt status, final gate, and environment path before autonomous bounded execution.
- No checkpoint or validation policy grants Preview, deployment, production, publication, or migration authority.

## Consequences

Every invocation retains one explicit confirmation step, writing Apply runs maintain mapping and receipt-location metadata, and base setup adopts one additional provider decision. In exchange, users keep predictable write boundaries and native ADR history while future agents avoid redundant validation, share reconciled evidence, and preserve Preview-first environment proof without adding a public mode or normalizing production debugging.
