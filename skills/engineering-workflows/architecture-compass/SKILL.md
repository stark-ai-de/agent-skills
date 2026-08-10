---
name: architecture-compass
description: Set up repository-native ADR governance, audit architecture, or plan and execute ADR-guided refactors through intent-bound workflows. Use when work needs binding agent-facing ADRs, provider-to-local mapping, architecture PR review or drift, Next.js request patterns, source placement, backend/runtime/env/config boundaries, stack deviations, or bounded ADR-governed implementation. Do not use for tiny edits, generic framework education, or work with no architecture or governance consequence.
license: Apache-2.0
compatibility: Designed for Codex, Cursor, Claude Code, and other Agent Skills hosts; adapts to host planning, review, question, and permission controls while keeping one portable ADR workflow.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.6.2"
---

# Architecture Compass

## Goal

Make architecture decisions explicit, binding, locally traceable, and executable. Establish repository-native governance, audit implementation, or perform an ADR-guided refactor without overwriting accepted history or broadening authority.

## When to use

- Establish/reconcile ADR governance or audit architecture, decision coverage, drift, risk, and evidence.
- Plan or execute bounded ADR-governed work, including broad work that first requires durable decisions.

## When not to use

- Tiny/style-only or ordinary governed edits with no architecture consequence or ADR-aware boundary check.
- Generic framework education or requests without target evidence and a governance, audit, planning, or refactoring outcome.

## Activation and receipt presentation

Route activation and receipt presentation through [AC-ADR-053 Short](references/ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.short.md) · [Long](references/ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.long.md) · [Guide](references/ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.guide.md). Start with Short and load Long before conditionally loading `AC-INTERNAL-002` from the internal index for renderer-selection mechanics. This dispatcher does not define a presentation profile or renderer policy.

## Workflow selection

Every direct invocation exposes exactly these public workflows:

- `setup`: establish or reconcile repository-native ADR governance with `recommended` or `complete` coverage.
- `audit`: perform a strictly read-only architecture, ADR-coverage, drift, and validation assessment.
- `refactor`: execute explicit bounded work already governed by accepted local ADRs.
- `plan-refactor`: collaborate on and persist an approved bounded refactoring specification without implementing it.
- `plan-run-refactor`: plan, persist, recheck, and execute an approved broad or decision-bearing refactor.

There is no `auto` workflow. Route by task evidence:

| Intent evidence                                                       | Selected workflow   |
| --------------------------------------------------------------------- | ------------------- |
| Establish or reconcile ADR governance                                 | `setup/recommended` |
| Review architecture, ADR coverage, drift, or risk                     | `audit`             |
| Produce a refactoring plan without execution                          | `plan-refactor`     |
| Broad implementation or unresolved durable decisions before execution | `plan-run-refactor` |
| Explicit bounded work fully governed by accepted local ADRs           | `refactor`          |

For clear direct or agent-discovered intent with sufficient authority, state the complete workflow set, selected workflow and rationale, setup coverage when applicable, exact write scope, expected artifacts, planning/read-only capability, protected state, and separate approval boundaries, then proceed. A bare activation, conflicting cues, or ambiguity about outcome, governance, scope, persistence, or mutation authority requires showing the workflows and asking.

Agent-initiated activation may select and announce `audit` without mutation authority. It may select a mutating workflow only when the user's existing task already requests that outcome and scope. Selection never authorizes destructive, paid, irreversible, external, deployment, publication, production, or scope-expanding work.

## References

Start with [the ADR catalog](references/adr-catalog.md). Select entries by `Scope`, `Category`, `Tags`, and `Applies when`:

- Read Short first.
- Read Long when a selected decision governs the task, a conflict exists, or implementation depends on its invariants.
- Read Guide only for current procedures, examples, commands, or compatibility notes.
- Do not load the entire library for a narrow task.
- Treat Long as canonical. Short cannot relax it; Guide is non-normative.

Route skill behavior through:

- **Workflows:** [AC-ADR-048 Short](references/ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.short.md) · [Guide](references/ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.guide.md) — finite routing, setup coverage, Plan persistence, and refactor boundaries.
- **Validation:** [AC-ADR-049 Guide](references/ac-adr-049-distinguish-change-risk-from-representative-environment-observation.guide.md) — risk, cadence, receipt identity/reuse, representative observation, and final-gate recovery.
- **Host state:** [AC-ADR-036 Guide](references/ac-adr-036-keep-architecture-compass-portable-through-host-adapters.guide.md) — capability states, index-safe evidence, and fallbacks.
- **Execution:** [AC-ADR-003 Guide](references/ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.guide.md) — delegation, checkpoints, mutation, and re-entry.
- **Claims:** [AC-ADR-004 Guide](references/ac-adr-004-report-staged-evidence-and-protect-public-outputs.guide.md) — evidence stages and public safety.
- **Presentation:** [AC-ADR-050 Short](references/ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.short.md) · [Guide](references/ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.guide.md) — accessible semantic markers for concise user-facing receipts.
- **Conflicts:** [AC-ADR-046 Guide](references/ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.guide.md) — evidence ranking and conflict stops without extra authority.

When Architecture Compass needs provider implementation mechanics, resolve the applicable exposed AC-ADR from the public catalog and load its Long first. Then conditionally read [the internal ADR index](references/internal/internal-adr-index.md) and only the matching internal Short/Long/Guide triplet: `internal-adr-001-resolve-persistence-surfaces-before-writes` for persistence-surface resolution or `internal-adr-002-select-capability-aware-receipt-renderers` for capability-aware receipt adapters. Internal ADRs are implementation policy, are not entries in the public catalog or target-repository adoption flow, and cannot relax an applicable accepted public Long decision.

Use the catalog for AC-ADR-051 public/internal namespace authority, AC-ADR-044 lineage, every canonical Long variant, and task-specific target decisions. AC-ADR-001 remains available as superseded historical context only.

## Inputs to inspect

After the route is resolved, inspect only what it needs:

- Outcome, repository identity/HEAD, protected Git/external state, and exact authorized scope.
- Repository instructions, ADR/index/mapping/history conventions, architecture/stack contracts, and validation receipts.
- Only representative code, tests, CI, public contracts, and migration/security/delivery evidence needed for the selected route.
- Supported instruction surfaces: nearest `AGENTS.md`, `CLAUDE.md`, existing `CLAUDE.local.md`, `.claude/rules`, `.cursor/rules`, and legacy `.cursorrules` only as migration evidence.

Do not classify `CONTEXT.md` as a Claude instruction file automatically.

Before persisting a spec, ADR, report, or instruction-surface change, route through [AC-ADR-052 Short](references/ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.short.md) · [Long](references/ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.long.md) · [Guide](references/ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.guide.md). Start with Short and load Long before conditionally loading `AC-INTERNAL-001` from the internal index for persistence-resolution mechanics. This dispatcher does not select or authorize a write surface.

## Authority and collaboration

Use two independent axes:

1. Host/repository instructions, permissions, protected paths, user authorization, and safety constraints decide what may execute.
2. Applicable accepted or superseding ADRs decide intended architecture.

Current code proves current state, not intended policy. A requested accepted-ADR violation requires a visible warning naming the decision, conflict, affected scope, and resolution options; stop the affected implementation until a successor/adaptation is accepted or the conflict is withdrawn.

Rank architecture sources through AC-ADR-046: applicable accepted or superseding target ADRs; specific canonical target documentation; ADR-linked approved target examples; consistent current implementation; applicable adoptable provider decisions; then general framework defaults. Never blend contradictory sources into an undocumented compromise. Record the sources, affected scope and impact, recommended resolution, and decision owner, and stop only the dependent work. This ranking cannot expand the operational authority granted by the user, host, repository, or permissions.

If evidence changes the route materially, announce the reclassification and resolve its authority before continuing. Planning capability and filesystem permission are independent. Never claim prompt text changed either control.

## Workflow

Load the [AC-ADR-048 Guide](references/ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.guide.md) for the selected route's detailed procedure and the matching report asset before producing its artifact. Keep these entry gates visible:

### `setup`

- Announce `recommended` or `complete` coverage. Use target evidence for `recommended`; evaluate every accepted adoptable target-repository decision for `complete`. Only a new or evidence-empty repository receives AC-ADR-005, 006, 018, 019, 021, 022, and 049 as its initial candidate foundation.
- Preserve repository-native identity and accepted history; record each candidate as `adopt`, `adapt`, `defer`, or `reject`, stable provider-to-local mappings, instruction bindings, and the receipt location.
- Apply the conditional selector only when proven applicable and validate only the authorized governance slice. Setup never authorizes application refactoring, deployment, publication, or production probes.

### `audit`

- Preserve enforceable no-write behavior and perform a strictly read-only architecture, ADR-coverage, drift, and validation assessment.
- Report prioritized conflicts, missing coverage, implementation/boundary risk, proof gaps, receipt validity, selector classification, and evidence limits.
- Create no artifact, repair, backup, patch, index change, install, environment mutation, deployment, publication, or production probe; recommend a separate authorized workflow when needed.

### `refactor`

- Verify accepted local ADRs govern the whole bounded change and the request authorizes its exact paths and behavior.
- Use AC-ADR-049 for risk, proof owners, receipt reuse, rollback, stop conditions, owning-boundary checks, and one final aggregate gate for the frozen candidate.
- Stop and reclassify on missing governance, decision conflict, unresolved durable choice, scope expansion, or material drift. Direct refactor never invents a durable decision or silently repairs governance.

### `plan-refactor`

- Resolve and approve the bounded specification in the Plan lifecycle while keeping repository/workspace artifacts read-only.
- After Plan-mode exit, persist only the authorized approved specification and required governance artifacts, validate and report them, emit a bounded copy-ready execution handoff, and stop before source implementation. Without persistence authority, return the same bounded copy-ready handoff and stop without writing.

### `plan-run-refactor`

- Follow `plan-refactor` through approval and bounded governance persistence, then recheck repository, dependencies, permissions, protected paths, and external state.
- Execute only the unchanged approved plan in reversible slices; stop on material drift, new decisions, failed proof, or scope expansion.
- Reconcile AC-ADR-049 receipts against the integrated candidate and report stage-accurate evidence without implying deployment, publication, production, or third-party success.

## Plan lifecycle

Use the AC-ADR-048 and AC-ADR-036 Guides for detailed transitions and portable status handling:

1. Report `Planning capability` exactly as `Active | Available but inactive | Unavailable | Explicitly declined | Indeterminate | Not applicable`. `Available but inactive` and `Indeterminate` stop pending confirmed activation; only `Unavailable` permits the portable fallback. Uncertainty never authorizes fallback.
2. Honor `Explicitly declined` without repeating the unchanged request; use another workflow only when its preconditions hold. `Not applicable` is valid only for a non-Plan workflow.
3. Write no target repository/workspace artifact while Plan mode is active. Perform no mutation of repository, workspace, index, environment, or external state before Plan-mode exit. Exit before persistence or implementation.
4. For execution, recheck state after approval and Plan-mode exit; changed scope, invalidated approval, or material drift requires a new checkpoint.

## Conditional stable-skill selector instruction

Classify this target-repository instruction as `applicable`, `not applicable`, or `indeterminate`. It is applicable only when evidence proves the target publishes a stable public skill with multiple material workflows.

- In `setup`, preserve an equivalent rule or add a generic rule requiring complete finite workflow disclosure, intent-bound selection and rationale, an ambiguity question, mutation only within already-authorized outcome/scope, and separate high-risk/external approvals.
- In `audit`, report the classification and any missing/equivalent/conflicting rule without writing.
- Direct `refactor` does not repair a missing rule; route governance repair to `setup`.
- `indeterminate` never authorizes a write.
- Never copy this repository's or the provider skill's ADR ID into the target. Use repository-native identity only when local governance requires a decision.

## Public statuses

When material, use the exact evidence-backed `Read-only enforcement`, `Architecture decision status`, and `Execution status` values in the AC-ADR-036 Guide and report asset. Planning and filesystem enforcement remain independent. `completed` covers only the authorized slice/stages; it implies no CI, publication, deployment, production, or third-party success.

For concise user-facing outcome lists, route status semantics through [AC-ADR-050 Short](references/ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.short.md) and presentation through AC-ADR-053 plus the conditional internal renderer route above.

## Assets

Assets are derived and non-normative; applicable canonical Long ADRs prevail:

- [`assets/setup-report-template.md`](assets/setup-report-template.md): setup coverage, adoption, mapping, instruction, and validation receipt.
- [`assets/refactor-report-template.md`](assets/refactor-report-template.md): audit, direct refactor, planning, execution, and evidence receipt.
- [`assets/new-repo-adoption-plan-template.md`](assets/new-repo-adoption-plan-template.md): separately approved first implementation after setup.
- [`assets/agent-instructions-template.md`](assets/agent-instructions-template.md): binding target ADR instructions and the conditional selector rule.
- ADR templates/examples and `assets/adr-index-template.md`: only for authorized governance setup.

## Scripts

Architecture Compass ships no executable runtime scripts. Use repository-native validators only after their behavior and write effects are understood; do not invent or install a helper as part of audit.

## Safety rules

- Do not invent repository facts, paths, commands, ADRs, mappings, validation, or host capability; do not infer mutation from ambiguity.
- Never override accepted target ADRs with bundled decisions or turn audit into setup, planning, or implementation.
- Do not install, invoke, vendor, or configure a public skill merely because it is available or recommended.
- Do not expose secrets, customer data, private provenance, or internal hostnames in reusable artifacts.
- Destructive, irreversible, external, deployment, publication, production, and scope-expanding work requires separate authority, exact target, stop conditions, and recovery evidence.
- Do not duplicate proof obligations, reuse invalidated receipts, create ceremonial permanent smoke harnesses, or overstate evidence stage.
- Stop on scope drift, missing authority, protected-path overlap, ambiguous mapping, unresolved ADR conflict, or failed required validation.

## Output format

Use the matching report asset and AC-ADR-004 evidence table. Include the workflow set and selection, coverage, write scope/status/protected state, inspected and unavailable evidence, decisions/mappings or findings, approved plan or changes, AC-ADR-049 ledger, risks/deferred triggers, and next authorized action.

Render the final receipt through AC-ADR-053 and its conditional internal adapter route; keep this section limited to output assembly rather than duplicating their durable presentation policy.

For `audit`, provide findings in severity order without patches or repository writes. For plan routes, distinguish approved in-Plan content, pending exit/persistence, persisted artifacts, state-recheck result, and executed work.

## Completion criteria

- Exactly one of the five exposed workflows follows clear intent/authority or resolved ambiguity.
- Setup uses valid coverage and foundation eligibility; audit remains artifact-free; direct refactor remains governed, bounded, and reversible.
- Plan routes use the native lifecycle when supported, exit before writes, persist only their authorized governance slice, and recheck before execution.
- ADR mapping/history, selector handling, protected state, AC-ADR-049 receipts, evidence stages, and limitations reconcile with the final candidate.

## Failure modes

- Ambiguous intent, governance, scope, persistence, or authority exposes all workflows and asks.
- An accepted-ADR conflict blocks the affected scope; unavailable read-only enforcement blocks potentially mutating audit checks.
- Planning capability `Available but inactive` or `Indeterminate` waits for confirmation; only `Unavailable` may use the documented fallback without weakening write gates.
- Material drift, failed validation, or contradictory evidence stops the affected slice, preserves safe disjoint work, and requires a new checkpoint rather than a completion claim.
