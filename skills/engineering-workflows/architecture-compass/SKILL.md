---
name: architecture-compass
description: Set up ADR governance or align, implement, audit, and review repository code against explicit architectural decisions. Use when a repository needs agent-facing ADR guardrails, a categorized adoption plan, source/runtime/request/data/security/testing/delivery constraints, or a refactor that must follow accepted ADRs. Do not use for tiny edits, style-only cleanup, generic framework education, or tasks without architecture evidence or requested governance adoption.
license: Apache-2.0
compatibility: Designed for Codex, Cursor, Claude Code, and other Agent Skills hosts; adapts to host planning, review, and permission controls while keeping one portable ADR workflow.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.3.0"
---

# Architecture Compass

## Goal

Make implementation decisions explicit, durable, and reusable. Set up target-repository ADR guardrails or align code and reviews with accepted decisions while loading only the applicable parts of the routed ADR library.

## When to use

- Set up or refresh repository ADR governance for coding agents.
- Plan, implement, audit, review, or document work governed by architectural decisions.
- Select stack, source, runtime, request, data, security, testing, accessibility, performance, or delivery guardrails.
- Reconcile repository instructions, accepted ADRs, current code, and implementation evidence.

## When not to use

- Tiny edits or style-only cleanup with no architectural consequence.
- Generic framework education without target-repository evidence.
- Work whose architecture is already fully prescribed and does not need an ADR-aware check.
- A request that neither asks for governance adoption nor provides architecture evidence.

## Public actions

Choose one action before selecting an internal mode.

### `setup`

Install or refresh durable ADR governance. The user has authorized standard guardrail files, but not unrelated code changes.

Canonical prompt:

```text
Use Architecture Compass in setup mode for this repo.
```

Use `setup-existing-repo` or `setup-new-repo`. Accept `new-repo-bootstrap` only as a deprecated alias for `setup-new-repo`.

### `refactor`

Align an audit, review, implementation, or refactor with existing ADRs and approved examples.

Canonical prompt:

```text
Use Architecture Compass in refactor mode for this repo.
```

Use one internal mode: `audit`, `refactor`, `new-implementation`, `pr-review`, `docs-sync`, or `stack-deviation`.

## References

Start with [the ADR catalog](references/adr-catalog.md). Select entries by `Scope`, `Category`, `Tags`, and `Applies when`.

- Read Short first.
- Read Long when the decision governs the active task, a conflict exists, or implementation depends on its invariants.
- Read Guide when concrete procedures, examples, current packages, commands, or compatibility notes are needed.
- Do not read the entire library for a narrow task.
- Treat Long as canonical. Short cannot relax it; Guide is non-normative.

Route skill behavior conditionally:

- Read [AC-ADR-001 Short](references/ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.short.md) ([Long, canonical](references/ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.long.md) · [Guide](references/ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.guide.md)) when discovering or linking library decisions.
- Read [AC-ADR-002 Short](references/ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.short.md) ([Long, canonical](references/ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.long.md) · [Guide](references/ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.guide.md)) when selecting an action, resolving a conflict, or recording setup adoption.
- Read [AC-ADR-003 Short](references/ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.short.md) ([Long, canonical](references/ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.long.md) · [Guide](references/ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.guide.md)) for decision phases, delegation, approvals, mutation, interruption, or re-entry.
- Read [AC-ADR-004 Short](references/ac-adr-004-report-staged-evidence-and-protect-public-outputs.short.md) ([Long, canonical](references/ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md) · [Guide](references/ac-adr-004-report-staged-evidence-and-protect-public-outputs.guide.md)) before making completion, CI, publication, deployment, production, or external claims.

In setup, scan every `scope: target-repository` and `Adoptable: true` Short entry. Load Long only for adopted or adapted decisions and Guide only for approved setup mechanics. In refactor, select only decisions whose applicability intersects the task.

## Inputs to inspect

Inspect target evidence before adopting bundled guardrails:

- applicable user request and authorized scope,
- repository agent instructions and permission controls,
- accepted and superseding ADRs,
- architecture, stack, validation, security, and delivery docs,
- representative code and tests,
- current Git state, scripts, CI configuration, and generated-file policy.

Use two authority axes:

1. Host and repository instructions, permissions, and safety constraints decide what the agent may do.
2. Accepted or superseding ADRs decide the intended architecture.

Current code proves current state, not intended policy. A user request can ask to change an ADR but does not silently supersede it. If operational instructions and an accepted ADR conflict semantically, obey the safety boundary, report the conflict, and stop the blocked implementation until the sources are synchronized or superseded.

## Collaboration route

Classify the preliminary route from the request, inspect only enough evidence to confirm it, and reclassify before mutation if repository facts change the route.

- **Decision phase:** unresolved durable choices or broad, multi-boundary, behavior-changing, or phased work. Remain read-only through the architecture checkpoint.
- **Direct execution:** narrow, behavior-preserving work already prescribed by accepted ADRs and explicitly requested.
- **Read-only audit:** diagnose or report without implementation.
- **Review:** use the host review surface when available and preserve a no-write boundary.

Planning capability and filesystem permission are independent. Never claim prompt text changed either control. Report their evidence separately. Silence is not a declined transition.

The lead agent owns scope, approvals, mutations, reconciliation, and final claims. Delegated work inherits the route, permission boundary, and allowlist. Treat delegated findings as provisional until checked against current files, Git state, validation, and final artifacts. Concurrent writes require disjoint paths. A replaced user scope or material drift invalidates the previous checkpoint.

## Workflow

1. Select `setup` or `refactor` and one canonical internal mode.
2. Classify the collaboration route and required host controls.
3. Inspect target evidence with non-mutating, index-safe operations while the route is provisional.
4. Open the catalog and select applicable ADR Shorts.
5. Build a rule map with provenance: `target ADR`, `target instructions`, `target docs`, `target example`, `target stack rule`, `bundled ADR candidate`, or `assumption`.
6. Resolve conflicts before broad work. Accepted target ADRs remain binding; changed durable intent needs a successor.
7. In setup, record every adoptable target-repository guardrail as `adopt`, `adapt`, `defer`, or `reject`. A rejection needs maintainer-confirmed rationale; a defer needs a future trigger or owner condition.
8. Load applicable Long decisions and only the Guides needed for approved setup or implementation mechanics.
9. Map files and boundaries, then produce a concise gap report before broad edits.
10. For a decision phase, return the checkpoint, approved allowlist, validation, required permission transition, and exact re-entry. Do not implement before approval.
11. Before approved mutation, recheck Git identity/status, governing ADRs, and target paths. Stop on material drift.
12. Implement small reversible slices inside the allowlist. Completing one slice does not authorize the next.
13. Update relevant target documentation when architecture, deviation, validation, or agent instructions change.
14. Run focused target-repository validation and report evidence by stage.

## Public statuses

The following is a dispatcher copy of the canonical lifecycle contract in AC-ADR-003 Long; the Long decision prevails. Report these exact fields when collaboration routing is material:

- `Planning capability`: `Active | Available but inactive | Unavailable | Explicitly declined | Indeterminate | Not applicable`, with evidence.
- `Read-only enforcement`: `enforced | available but inactive | unavailable | explicitly declined | indeterminate | not applicable`, with evidence.
- `Architecture decision status`: `not required | pending | approved | blocked`.
- `Execution status`: `not requested | ready for direct execution | pending Plan-mode exit | pending write permission | blocked | completed`.

`completed` means only the approved slice and declared validation completed. It does not imply CI, publication, deployment, production, or third-party success.

## Assets

Assets are derived, non-normative helpers. Applicable canonical Long ADRs prevail.

- Use `assets/setup-report-template.md` for setup adoption results.
- Use `assets/new-repo-adoption-plan-template.md` for a separately approved first implementation.
- Use `assets/refactor-report-template.md` for audit/refactor findings.
- Use `assets/agent-instructions-template.md` for target agent instructions.
- Use `assets/adr-template.short.md`, `assets/adr-template.long.md`, and `assets/adr-template.guide.md` to scaffold a target ADR triplet.
- Use `assets/adr-example.short.md`, `assets/adr-example.long.md`, and `assets/adr-example.guide.md` to explain the three variants.
- Use `assets/adr-index-template.md` only when explicit setup authorizes a new target ADR index.

## Scripts

Architecture Compass has no bundled runtime scripts. Use only target-repository commands discovered from its instructions, package scripts, CI configuration, or approved validation plan; do not invent commands from a Guide.

## Safety rules

- Do not invent repository facts, paths, commands, accepted ADRs, validation, or host capabilities.
- Do not override accepted target ADRs with bundled defaults.
- Do not turn an audit or review into implementation without authorization.
- Do not create missing target docs, ADR directories, or validators outside explicit setup or separate approval.
- Do not expose secret values anywhere. Keep customer data, private provenance, internal hostnames, and private repository paths out of public persisted artifacts; exact authorized target paths may remain in the task-local report.
- Do not perform destructive or irreversible work without exact scope, approval, stop conditions, and recovery evidence.
- Mark missing context `unspecified` rather than guessing.

## Failure modes

- **No applicable ADR:** state that routing found none and continue only from authoritative target evidence.
- **Missing or contradictory evidence:** report the exact gap; do not convert an assumption into a decision.
- **Instruction/ADR conflict:** obey the operational safety boundary and stop the affected implementation until the architecture sources are reconciled.
- **Permission or scope gap:** preserve the read-only boundary and return the exact authorization or re-entry needed.
- **Repository drift or stale delegation:** re-inspect and reconcile before using previous findings or mutating files.
- **Validation or evidence-stage failure:** report the failing stage without claiming later stages.

## Output format

Return, in order:

1. Action, internal mode, collaboration route, capability fields, and architecture/execution statuses.
2. Inspected and unavailable evidence.
3. Selected ADRs and provenance rule map.
4. Setup adoption matrix, gap report, or implementation placement map.
5. Proposed or completed bounded changes.
6. Documentation, ADR, or agent-instruction changes.
7. Validation ledger by `source/static`, `local`, `CI`, `publication/install`, `deployed/production`, and `external/third-party`.
8. Stack-deviation result when applicable.
9. Remaining risks, assumptions, deferred triggers, and follow-ups.

For audit-only work, do not paste patches unless asked. For implementation, summarize changed files and exact validation without overstating later evidence stages.

## Completion criteria

- Target evidence was inspected before bundled guardrails were applied, or its absence is explicit.
- Only applicable ADRs were loaded; Long governed implementation and Guide supplied mechanics.
- Setup dispositioned every adoptable guardrail without silent omission.
- Conflicts, file roles, runtime boundaries, approvals, and allowlists are explicit.
- Delegated results were reconciled against final artifacts.
- Changes are bounded and reversible, and validation is run or blocked with reason.
- No private or source-project-specific material entered a public artifact.
