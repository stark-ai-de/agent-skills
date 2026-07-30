---
title: "Architecture Compass portable Plan routing"
slug: "architecture-compass-portable-plan-routing"
artifact_path: "docs/specs/architecture-compass-portable-plan-routing-spec.md"
mode: "deep"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-11"
updated: "2026-07-13"
source_request: "Implement the approved conditional Plan-mode recommendations for Architecture Compass and publish the release."
phases: ["governance", "skill-lifecycle", "evaluation", "release"]
---

# Architecture Compass portable Plan routing

## Goal

Add a portable decision-to-execution lifecycle to Architecture Compass so unresolved durable choices and broad, multi-boundary, behavior-changing, or phased refactors use a read-only planning phase, narrow behavior-preserving ADR-backed work remains direct, audits and reviews remain read-only, and approved implementation resumes through an exact bounded continuation. Release the behavior as Architecture Compass 0.2.0 in catalog v0.8.0.

## Background

- Architecture Compass currently moves from evidence inspection and a gap report directly into requested edits.
- Native Plan, Review, and permission controls differ across Codex, Cursor, and Claude.
- A blanket Plan requirement would interrupt audits, reviews, docs sync, and narrow behavior-preserving refactors.
- ADR-0021 keeps portable workflows unified unless runtime evidence or output contracts materially diverge.

## Scope

### In scope

- Conditional decision-phase routing for setup, refactor, implementation, and stack-deviation work.
- Capability-detected host adapters for planning, review, permissions, and instruction-file conventions.
- Read-only decision behavior, explicit status fields, exact route-matching continuations, and repository-state recheck.
- Report templates, checklists, public install/usage docs, evaluation proof, versioning, changelog, PR, and release publication.
- Correct post-release operator guidance to install the explicit Codex-ready skill list instead of a cross-runtime wildcard.

### Non-goals

- Creating separate Codex, Cursor, or Claude Architecture Compass skills.
- Changing the runtime-specific spec interviewers.
- Requiring Plan mode for every Architecture Compass invocation.
- Treating Plan mode as a filesystem or security boundary.
- Prefixing the implicitly invokable OpenAI default prompt with `/plan`.
- Refactoring release helpers, adding an automated behavioral runner, or publishing an npm package.

### Cross-host clarification

- Keep `host-collaboration-modes.md` inside Architecture Compass: its route states, architecture checkpoint, and re-entry contract are workflow-specific, not a general activation layer.
- Do not create a router skill. Agent Skills clients discover from skill names and descriptions before loading skill bodies, so another skill cannot guarantee activation.
- Cross-host installation changes only the execution host; Architecture Compass remains portable because its evidence and outputs are host-neutral.
- Backend gateways such as SkillOpt's Codex adapter are unrelated to collaboration-mode routing and remain with their owning workflow under [ADR-0028](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.short.md) ([Long, canonical](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md) · [Guide](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.guide.md)).

## Repo context

- Public skill: `skills/engineering-workflows/architecture-compass/`.
- Evaluation proof: `skill-evals/architecture-compass/`.
- Durable policy: ADR-0021 and ADR-0024.
- Release policy: ADR-0015, `docs/publishing.md`, and the release-intent validators.
- Current versions before implementation: skill 0.1.3 and catalog 0.7.0.
- Required repository validation: `npm run validate`, Oxc checks, install smoke, release-intent validation, and release validation.

## Requirements

### Functional requirements

- WHEN a new-repo setup, existing setup, refactor, implementation, or stack-deviation request contains unresolved durable architecture choices, THE SKILL SHALL enter a read-only decision phase before edits.
- WHEN a refactor is broad, multi-boundary, behavior-changing, or phased even though accepted ADRs provide direction, THE SKILL SHALL use the decision phase to approve the bounded execution slice before edits.
- WHEN a narrow behavior-preserving change is fully prescribed by accepted ADRs, THE SKILL SHALL permit direct execution without a Plan handoff.
- WHEN the request is an audit, THE SKILL SHALL remain read-only without requiring Plan mode.
- WHEN the request is a PR, branch, or diff review, THE SKILL SHALL prefer the host review surface when available and SHALL NOT require Plan mode for the review itself.
- WHEN native Plan mode is supported but inactive for a decision-heavy request, THE SKILL SHALL request a host-controlled transition and SHALL NOT claim that prompt text changed the mode.
- WHEN a selected decision, audit, or review-fallback route requires read-only enforcement and a host exposes an inactive permission or sandbox control, THE SKILL SHALL request that separate host-controlled transition before repository work on that route and SHALL NOT infer that Plan mode enabled it.
- WHEN a selected decision, audit, or review-fallback route requires read-only enforcement but enforceable controls are unavailable, THE SKILL SHALL record that limitation and preserve the behavioral no-write gate.
- WHEN the user explicitly declines an available read-only transition, THE SKILL SHALL record `Read-only enforcement: explicitly declined - <user statement>`, SHALL NOT repeat the request, and SHALL preserve the behavioral no-write gate.
- WHEN Plan instructions forbid edits without naming an active permission or sandbox boundary, THE SKILL SHALL treat them as behavioral no-write evidence and SHALL NOT report read-only enforcement as active.
- WHEN a requested sandbox flag or successful helper preflight conflicts with command-level evidence that the sandbox is unavailable or disabled, THE SKILL SHALL report the command-level limitation rather than claim enforcement.
- WHEN a selected decision-phase route requires planning but native Plan mode is unavailable or explicitly declined, THE SKILL SHALL record the evidence and preserve the same read-only decision gate conversationally.
- WHEN planning support or state is indeterminate for a selected decision-phase route, THE SKILL SHALL not treat that as a decline and SHALL avoid writes until the user confirms a safe route.
- WHEN the preliminary route is direct execution, THE SKILL SHALL NOT request Plan or Read Only merely because either control is available.
- WHILE a preliminary route remains provisional, THE SKILL SHALL validate it with only non-mutating operations and index-safe Git status.
- WHEN repository evidence invalidates the preliminary route, THE SKILL SHALL stop before decision work or mutation, resolve the newly required host controls, and continue under the reclassified route.
- WHILE the decision phase is active, THE SKILL SHALL perform no repository, untracked, ignored, index, or external-state writes.
- WHEN the architecture checkpoint is approved, THE SKILL SHALL return an architecture-decision status and an execution status.
- WHEN reporting any route, THE SKILL SHALL expose `Planning capability` and `Read-only enforcement` as separate public fields and SHALL use `Not applicable` only when the selected route does not use that control.
- WHEN approved implementation was requested, THE SKILL SHALL additionally return enumerated target paths, enumerated validation commands, any required write-permission transition, and an exact direct, native, or portable-fallback continuation; otherwise it SHALL return `Execution status: not requested` without an implementation handoff.
- WHEN implementation is architecturally ready but a known required write-capable control remains inactive or unconfirmed, THE SKILL SHALL return `Execution status: pending write permission` rather than `ready for direct execution`.
- BEFORE approved edits, THE SKILL SHALL confirm direct-route readiness, native Plan exit, or portable-fallback implementation approval, plus any separately approved write-capable permission transition, then re-read repository identity and state, governing ADRs, and target paths; material drift SHALL stop execution.
- WHEN setup targets an existing instruction convention, THE SKILL SHALL preserve it. For an unspecified new-repo runtime, `AGENTS.md` remains the default and additional runtime files remain optional until approved.

### Routing matrix

| Internal mode                           | Planning route                                                               | Direct/read-only route                   |
| --------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| `setup-new-repo` / `new-repo-bootstrap` | Unresolved stack, deployable units, ownership, or guardrail adoption         | Fully specified minimal setup            |
| `setup-existing-repo`                   | Adoption conflict, rejection, adaptation, or stale ADR                       | Mechanical refresh under accepted ADRs   |
| `refactor`                              | Broad, multi-boundary, behavior-changing, or phased work                     | Narrow behavior-preserving ADR alignment |
| `new-implementation`                    | Unresolved placement, request, runtime, package, or public-contract boundary | Fully placed ADR-backed implementation   |
| `stack-deviation`                       | Actual durable deviation or new ADR                                          | Existing stack is sufficient             |
| `audit`                                 | Never solely for the audit                                                   | Read-only audit                          |
| `pr-review`                             | Never for the review itself                                                  | Host review or read-only findings        |
| `docs-sync`                             | Only if a new durable decision appears                                       | Direct sync of approved decisions        |

### Public status contract

- `Architecture decision status: not required | pending | approved | blocked`
- `Execution status: not requested | ready for direct execution | pending Plan-mode exit | pending write permission | blocked | completed`

### Approved continuation contract

These continuations apply only when implementation was requested. An approved
architecture-only decision ends with `Execution status: not requested` and no
implementation handoff.

```text
Exit Plan mode. If a separate read-only control remains active after Plan exit, request an approved write-capable permission for this execution slice. After all required host transitions are confirmed, re-read repository state (HEAD and `git --no-optional-locks status` when Git exists), the governing ADRs, and the approved target paths. Stop and report any material drift. Otherwise apply only the approved Architecture Compass <setup/refactor slice> to: <enumerated paths>. Do not expand scope. Run: <enumerated validation commands>. Report changed paths, validation results, and remaining ADR gaps, then stop.
```

Portable fallback continuation:

```text
After explicit implementation approval, confirm any required write permission, then re-read repository state (HEAD and `git --no-optional-locks status` when Git exists), the governing ADRs, and the approved target paths. Stop and report any material drift. Otherwise apply only the approved Architecture Compass <setup/refactor slice> to: <enumerated paths>. Do not expand scope. Run: <enumerated validation commands>. Report changed paths, validation results, and remaining ADR gaps, then stop.
```

Direct-route permission continuation:

```text
After the required write-capable permission is confirmed, re-read repository state (HEAD and `git --no-optional-locks status` when Git exists), the governing ADRs, and the approved target paths. Stop and report any material drift. Otherwise apply only the approved Architecture Compass <setup/refactor slice> to: <enumerated paths>. Do not expand scope. Run: <enumerated validation commands>. Report changed paths, validation results, and remaining ADR gaps, then stop.
```

### Non-functional requirements

- Portability: core architecture evidence and outputs remain host-neutral.
- Safety: collaboration mode and host permission/sandbox controls remain distinct.
- Backward compatibility: existing `setup` and `refactor` prompts and architecture outputs remain valid.
- Honesty: live runtime proof is reported separately from static or source-backed proof.
- Public safety: no secrets, private paths, internal hostnames, or customer data enter public artifacts.

## Design

### Portable core

1. Classify the action and preliminary route from the request without repository inspection or writes.
2. Resolve only route-relevant controls: planning plus read-only enforcement for a decision phase, read-only enforcement for an audit, the review surface plus read-only enforcement when that surface does not establish a no-write boundary for a review, and no Plan or Read Only request for direct execution merely because a control is available.
3. Under the confirmed route, inspect only enough repository evidence to validate the classification, using non-mutating operations and index-safe Git status while the route remains provisional. If the evidence changes the route, stop before decision work or mutation and resolve the newly required controls.
4. In a decision phase, build the rule/adoption/placement map and ask only material questions.
5. Finish with explicit statuses and, only when implementation was requested, a bounded continuation.
6. Confirm every required host transition, then recheck repository state before execution and stop on drift.

### Host adapter

- Codex: use native Plan for investigation/proposal, request Read Only permissions separately for no-write enforcement, and use Review for diff findings when available. If Read Only cannot be activated, record that limitation before using the behavioral no-write gate.
- Cursor: use a capability-exposed Plan/read-only mode; do not assume every version or surface exposes the same transition command.
- Claude: use a capability-exposed Plan permission mode or transition tool; allow only host-managed plan artifacts when the host requires them.
- Unknown host: use a conversational read-only decision gate and record unavailable, declined, or indeterminate capability evidence.

### Alternatives considered

- Blanket Plan preflight: rejected because Architecture Compass also audits, reviews, synchronizes docs, and applies narrow accepted decisions.
- Three runtime copies: rejected by ADR-0024 because the architecture evidence and output contract remain shared.
- Advisory-only Plan text: rejected because unresolved durable decisions need an enforceable stop before edits.

## Architectural decisions

- ADR required: yes.
- Existing ADRs consulted: ADR-0007, ADR-0013, ADR-0015, ADR-0016, ADR-0021.
- ADR path: [ADR-0024](../adrs/0024-keep-architecture-compass-portable-with-host-mode-adapters.short.md) ([Long, canonical](../adrs/0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md) · [Guide](../adrs/0024-keep-architecture-compass-portable-with-host-mode-adapters.guide.md)).
- Supersedes: none; ADR-0024 clarifies ADR-0021.
- Implementation blocked until ADR accepted: no; the maintainer accepted ADR-0024 during the verified planning checkpoint.

## Source challenge

- Repo evidence checked: repository instructions, Architecture Compass skill/references/templates/evals, current runtime-specific Plan precedents, release scripts, workflows, and publishing docs.
- ADRs/specs checked: ADR-0007, ADR-0013, ADR-0015, ADR-0016, ADR-0021, existing Architecture Compass specs, and the spec-interviewer Plan lifecycle proof.
- External docs checked: Agent Skills frontmatter, Codex Plan/permissions/review, Cursor modes/CLI capabilities, and Claude permission modes.
- Requirements revised: blanket Plan routing and immediate runtime duplication were replaced with conditional portable routing and host adapters.
- Requirements preserved: read-only decision work, explicit approval, bounded execution, ADR governance, and full release publication.
- Preceding work needed: accepted ADR-0024 and this public spec.
- ADR gate result: required and accepted.

## User verification

- Final checkpoint confirmed by: repository maintainer.
- Confirmation date: 2026-07-12.
- Verified scope/non-goals: yes.
- Verified rollout/rollback assumptions: yes.
- Review-driven amendment: explicit capability fields, read-only refusal handling,
  and the write-permission readiness gate were accepted within the existing
  lifecycle scope.
- Non-blocking open questions accepted: Claude live proof may remain unavailable when no authenticated CLI exists.

## File and module plan

### Expected touched areas

- `skills/engineering-workflows/architecture-compass/`
- `skill-evals/architecture-compass/`
- `incubator/skills/skill-maintenance/skillopt-setup/scripts/prepare-skillopt-split.mjs` and its root validator, limited to preserving wrapped eval expectations
- `.github/workflows/publish-release.yml`
- `README.md`, `docs/publishing.md`, `package.json`, and `CHANGELOG.md`

### Expected new files

- `skills/engineering-workflows/architecture-compass/references/host-collaboration-modes.md`
- Focused lifecycle cases and one dated run summary under `skill-evals/architecture-compass/`
- ADR-0024 and this spec

### Explicitly protected areas

- Runtime-specific spec interviewers and memory curators
- Incubator skills other than the narrow generic SkillOpt split-parser regression required by these eval cases
- Release workflow tag/release behavior and unrelated public skills; the post-release verification text is the only approved workflow change
- Git index state until release validation is complete

## Task breakdown

### Phase 1: Governance and lifecycle

- Persist and index ADR-0024 and this spec.
- Implement conditional routing, adapters, statuses, continuation, and state recheck.
- Update templates and checklists.
- Validation gate: focused skill/ADR validation and diff review.

### Phase 2: Docs and evaluation

- Update public multi-runtime installation and usage docs.
- Add routing, fallback, no-write, and execution-lifecycle cases plus a runtime proof matrix.
- Validation gate: deterministic assertion review, filesystem no-write proof, and live Codex/Cursor runs where authenticated.

### Phase 3: Release

- Bump Architecture Compass to 0.2.0 and catalog to 0.8.0.
- Prepare changelog/release notes, validate, open and merge the release PR, run the guarded dry run, publish, and verify installation.
- Validation gate: all local and CI release checks pass.

## Validation

```bash
npm run validate
pnpm format:check
pnpm lint
git diff --check
npm run list
npx skills@latest add ./skills --list
npm run smoke:install
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --version 0.8.0 --base-ref origin/main
node scripts/print-release-notes.mjs
```

### Manual verification

- Confirm each routing-matrix branch returns the expected Plan, direct, audit, or review behavior.
- Record planning capability and read-only enforcement separately in each decision-phase runtime; confirm direct routes do not request either control merely because it is available.
- Confirm an explicitly declined read-only transition is reported once without a repeated request and preserves the behavioral no-write gate.
- Confirm a direct or fallback route with a pending required write transition returns `pending write permission`; `ready for direct execution` requires confirmed permission or no required transition.
- Confirm repository evidence that changes a preliminary route stops progress until the newly required host controls are resolved.
- In an isolated fixture with `GIT_OPTIONAL_LOCKS=0`, hash every file outside `.git`, hash `.git/index`, and compare full status including ignored files before and after the Plan phase.
- Before direct execution, after native Plan exit, or after portable-fallback implementation approval, confirm any separately required write-capable permission or control transition before re-entry, then prove every changed or untracked path is in the approved allowlist.
- Exercise actual Codex and Cursor native planning through enforced or explicitly limited read-only decision work, approval, exit, any separate write transition, index-safe state recheck, bounded application, and validation.
- Record Claude source-backed/static proof separately when no live CLI is available.

### Review focus

- Accidental blanket Plan routing.
- Confusion between mode selection and permissions.
- Missing or premature write-permission readiness.
- Unverified host command claims.
- Missing state recheck or path allowlist.
- Version/changelog/release incoherence.

## Rollout and rollback

- Rollout: one release-coherent PR, guarded Publish Release dry run, exact-SHA publication, then public-install verification.
- Feature flag or migration: none.
- Monitoring: CI, GitHub Pages build, release workflow, public skill listing, and sample runtime invocations.
- Rollback trigger: routing blocks valid narrow work, decision work writes files, or a host adapter gives unsafe/stale instructions.
- Rollback procedure: revert through a new PR and publish v0.8.1 with Architecture Compass 0.2.1; do not rewrite v0.8.0.

## Risks

| Risk                      | Why it matters                                     | Mitigation                                                     |
| ------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Mode/permission confusion | Plan text alone does not enforce filesystem safety | Explicit permission guidance and no-write proof                |
| Host capability drift     | Native commands and tools evolve                   | Capability detection, source-backed docs, runtime proof matrix |
| Over-routing              | Narrow tasks become unnecessarily multi-turn       | Positive and negative matrix cases                             |
| State drift               | Approved paths or ADRs change before execution     | Mandatory pre-execution state recheck                          |
| Overstated proof          | A static contract is reported as live              | Separate live, static, and unavailable statuses                |

## Done when

- [ ] ADR-0024 and this spec are persisted and linked.
- [ ] Conditional routing and host adapters satisfy the public contract.
- [ ] No-write, fallback, review, direct, and state-drift cases pass.
- [ ] Architecture Compass is 0.2.0 and catalog release metadata is 0.8.0.
- [ ] Local checks and required PR checks pass.
- [ ] v0.8.0 is published from the exact validated `main` SHA.
- [ ] Public listing and installation are verified.

## Assumptions and open questions

- Assumption: one portable Architecture Compass remains the accepted catalog shape.
- Assumption: live Codex and Cursor proof is required when their installed CLIs are authenticated.
- Assumption: missing Claude CLI is non-blocking when the adapter is source-backed and the limitation is explicit.
- Open question: none blocking.
