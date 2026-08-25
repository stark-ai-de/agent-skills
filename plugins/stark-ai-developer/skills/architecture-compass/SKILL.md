---
name: architecture-compass
description: Set up repository-native ADR governance, audit architecture, or plan and execute ADR-guided refactors through intent-bound workflows. Use when work needs binding agent-facing ADRs, provider-to-local mapping, architecture PR review or drift, Next.js request patterns, source placement, backend/runtime/env/config boundaries, stack deviations, or bounded ADR-governed implementation. Do not use for tiny edits, generic framework education, or work with no architecture or governance consequence.
license: Apache-2.0
compatibility: Designed for Codex, Cursor, Claude Code, and other Agent Skills hosts; adapts to host planning, review, question, and permission controls while keeping one portable ADR workflow.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.6.5"
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

- **Workflows:** [AC-ADR-048 Short](references/ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.short.md) · [Guide](references/ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.guide.md).
- **Validation:** [AC-ADR-049 Guide](references/ac-adr-049-distinguish-change-risk-from-representative-environment-observation.guide.md).
- **Host state:** [AC-ADR-036 Guide](references/ac-adr-036-keep-architecture-compass-portable-through-host-adapters.guide.md).
- **Execution and claims:** [AC-ADR-003 Guide](references/ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.guide.md) · [AC-ADR-004 Guide](references/ac-adr-004-report-staged-evidence-and-protect-public-outputs.guide.md).
- **Presentation:** [AC-ADR-050 Short](references/ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.short.md) · [Guide](references/ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.guide.md).
- **Conflicts:** [AC-ADR-046 Guide](references/ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.guide.md).

For provider mechanics, resolve the applicable public AC-ADR and load its Long first. Then conditionally read [the internal ADR index](references/internal/internal-adr-index.md) and only `AC-INTERNAL-001` for persistence resolution or `AC-INTERNAL-002` for receipt rendering. Internal ADRs are implementation policy, do not enter target-repository adoption, and cannot relax an accepted public Long decision.

Use the catalog for namespace authority, lineage, canonical Long variants, and task-specific decisions. AC-ADR-001 is superseded historical context only.

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

Load the [AC-ADR-048 Guide](references/ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.guide.md) and the matching report asset after selection and before producing an artifact or executing a mutation. Keep these entry gates visible:

### `setup`

- Use target evidence for `recommended` or evaluate every accepted adoptable target-repository decision for `complete`. Only a new or evidence-empty repository receives AC-ADR-005, 006, 018, 019, 021, 022, and 049 as its initial candidate foundation. Setup never authorizes application refactoring, deployment, publication, or production probes.

### `audit`

- Preserve enforceable no-write behavior and perform a strictly read-only architecture, ADR-coverage, drift, and validation assessment. Create no artifact or mutation.

### `refactor`

- Verify accepted local ADRs govern and the request authorizes the whole bounded change. Stop on missing governance, conflict, unresolved durable choice, scope expansion, or material drift. Direct refactor never invents a durable decision or silently repairs governance.

### `plan-refactor`

- Resolve and approve the bounded specification in the Plan lifecycle; after exit, persist only authorized governance artifacts and stop before source implementation.

### `plan-run-refactor`

- Follow `plan-refactor`, then recheck state and execute only the unchanged approved plan in reversible slices. Stop on material drift, new decisions, failed proof, or scope expansion.

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

Assets are derived and non-normative. Use [`assets/setup-report-template.md`](assets/setup-report-template.md) for setup and [`assets/refactor-report-template.md`](assets/refactor-report-template.md) for the other routes; use the remaining assets only for authorized governance work. Applicable canonical Long ADRs prevail.

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

Apply the selected procedure's criteria in the AC-ADR-048 Guide and reconcile its AC-ADR-049 receipt. Completion covers only the authorized workflow and evidence stages.

## Failure modes

Apply the route and Plan stops in the AC-ADR-048 Guide and validation recovery in the AC-ADR-049 Guide. Never turn a blocked or indeterminate state into a completion claim.
