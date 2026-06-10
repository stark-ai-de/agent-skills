# Adoption Workflows

Use this reference to choose the top-level user action and the right internal operating mode.

## Top-level action selection

| User-facing action | Use when                                                                                   | Main output                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `setup`            | The user wants ADRs to become durable repo guardrails for future agents and contributors.  | Agent instructions, ADR index, stack rules, setup report, future prompts.    |
| `refactor`         | The user wants code, diffs, or new implementation aligned with existing ADRs and examples. | Rule set, drift report or placement map, patches when requested, validation. |

## Internal mode selection

| Mode                  | Use when                                                                  | Main output                                                                |
| --------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `setup-existing-repo` | `setup` action for a repo that already has ADRs or architecture notes.    | Updates to `AGENTS.md`, ADR index, stack rules, and optional PR checklist. |
| `setup-new-repo`      | `setup` action for a new repo or starter app.                             | Starter ADR governance files and first-implementation guardrails.          |
| `audit`               | The user wants to know whether current code follows ADRs and examples.    | Drift report and validation recommendations.                               |
| `refactor`            | The user wants changes applied to existing code.                          | Small implementation slices, docs updates, validation results.             |
| `new-implementation`  | The user is adding a feature under existing repo rules.                   | File placement map and implementation guardrails.                          |
| `new-repo-bootstrap`  | The user is starting a repository or app that should follow this pattern. | Starter layout, ADR draft, stack rules, agent rules, examples.             |
| `pr-review`           | The user wants a diff or PR checked for architecture drift.               | Blocking/non-blocking findings and remediation suggestions.                |
| `docs-sync`           | Code or rules changed and repo docs must be aligned.                      | Minimal docs and index updates.                                            |
| `stack-deviation`     | A task may require a new library or pattern.                              | Preferred-stack check and deviation rationale.                             |

## Setup action

Use setup when the user explicitly asks to make a repository rely on ADRs. Setup is allowed to create standard guardrail files because the action itself is approval to install the governance layer.

### Existing repository setup

1. Discover current ADR locations, architecture docs, stack rules, agent instructions, README/contribution docs, and approved examples.
2. Preserve the repo's existing ADR directory and naming convention. If none exists, prefer `docs/adr/` unless the repo already uses another convention.
3. Compare target evidence with bundled ADR guardrails. For each guardrail, record `adopt`, `adapt`, `defer`, or `reject`. Do not omit a guardrail because target evidence is sparse. Use `defer` when a guardrail does not fit the current slice but may fit future repo growth. Ask for a user-confirmed rationale when target evidence conflicts with a guardrail.
4. Add or update agent instructions so they state:
   - accepted ADRs are binding,
   - ADRs must be inspected before architecture-affecting code changes,
   - existing ADR-linked examples should be preferred over generic framework defaults,
   - conflicts with ADRs must be reported before implementation,
   - final responses should name the ADRs applied.
5. Add or update an ADR index that lists active decisions by area.
6. Add or update stack rules only when the repo has a dependency policy or the user provided one.
7. Add an optional PR checklist only when a PR-template convention exists or the user asks for one.
8. Return a setup report and the canonical prompts future agents should use.

### New repository setup

1. Identify the intended stack and deployable units.
2. Create the smallest useful governance set:
   - `AGENTS.md`,
   - `docs/adr/index.md`,
   - initial source-structure ADR,
   - optional `STACK_RULES.md`,
   - optional PR checklist,
   - minimal example files only for selected stack boundaries.
3. Treat bundled ADR guardrails as the starter baseline. Mark each as adopted, adapted, deferred, or rejected. Use `defer` for guardrails that are not part of the first implementation slice.
4. Avoid creating unused apps, packages, or backend services before they have owners.
5. Mark open decisions explicitly instead of pretending the architecture is complete.
6. Return first-implementation guardrails and validation commands.

### Setup output

Use `assets/setup-report-template.md`. Include:

- action and internal setup mode,
- files created or changed,
- ADR discovery paths,
- active ADRs or starter ADRs,
- bundled guardrail adoption decisions and challenged rejections,
- agent instruction summary,
- future prompts,
- open decisions,
- validation performed or skipped.

## Existing repository audit

1. Read target ADRs and repo rules.
2. Identify the accepted source-structure pattern.
3. Sample current files from the touched boundaries.
4. Map each sampled file to its source role.
5. Mark drift by severity:
   - `blocking`: unsafe runtime boundary, secret leakage risk, wrong request/write boundary, broken public package contract.
   - `important`: structure contradicts ADR and will confuse future work.
   - `cleanup`: low-risk shallow wrappers, naming drift, docs cross-reference drift.
6. Return a gap report with recommended refactor slices.

## Existing repository refactor

1. Start from the audit or create a compact gap report first.
2. Choose a vertical slice that keeps behavior stable.
3. Move code to the owner layer before changing behavior.
4. Preserve public interfaces or update all callers in the same slice.
5. Add or adjust tests only where the target repo already has a test pattern or where behavior changed.
6. Update docs when rules or public contracts changed.
7. Run focused validation.

Avoid broad churn. Do not rename or move unrelated files just because they are near the touched area.

## New implementation guardrail

Before adding a feature:

1. Identify the target route, package, backend service, or app.
2. Select the file pattern:
   - Next.js route/screen/hydrated/RCC/UI/query/action split,
   - backend runtime/service split,
   - domain-core package contract,
   - UI package component or token change,
   - tooling package change.
3. List exact files to create and why each owns its role.
4. Confirm read/write/request boundaries.
5. Confirm stack choices and validation commands.
6. Implement only after the placement map is clear.

## New repository bootstrap

Use this internal mode when the `setup` action targets a new repository or when no target repo rules exist yet.

Create or propose:

- `AGENTS.md` or equivalent agent instructions, using `assets/agent-instructions-template.md` as a starting point.
- Stack rules or dependency decision order.
- `docs/adr/` or the target repo ADR convention.
- A source-structure ADR using `assets/adr-draft-template.md`.
- A docs index if the repo already has docs or the user approves creating one.
- Minimal example files for the selected stack, not full product examples.
- Initial validation commands and source-shape reporting plan.

Do not assume every bundled pattern is part of the first implementation slice. Do not silently omit a bundled guardrail; ask or infer the selected stack first, then record the guardrail as adopted, adapted, deferred, or rejected.

## PR review for architecture drift

Focus on architecture rules, not general code style.

Check:

- Did new files go into the correct source roles?
- Did route handlers and framework files stay thin?
- Did browser-safe code avoid server-only imports?
- Did server-only files include required sentinels?
- Did reads and writes use the accepted request boundaries?
- Did shared packages remain app-agnostic where required?
- Did backend services preserve explicit runtime composition?
- Did env/config reads stay at the app boundary?
- Did infrastructure artifacts stay outside runtime source trees?
- Did public package exports remain intentional?
- Did docs or ADR indexes need updates?

Output findings as `blocking`, `important`, or `cleanup`.

## Docs sync

Update only existing, relevant repo-facing files when architecture-facing behavior changes.

Common docs that may need updates:

- ADR index.
- Architecture decision summary.
- `AGENTS.md` or equivalent agent instructions.
- Stack rules or dependency policy.
- Source-shape validation docs.
- Package README or public API docs.

When multiple docs need the same explanation, put durable policy in one canonical file and add concise links from other files.

Ask before creating missing docs or indexes.

## Stack-deviation gate

Use target stack rules first. Default decision order:

1. Prefer the existing stack and built-in platform capabilities.
2. If a specialized library is needed, prefer the library named in the target repo’s stack rules.
3. If the preferred stack is insufficient, explain the technical gap before introducing another dependency.
4. Update docs if the deviation becomes a repeated pattern.

Return:

```text
Preferred option considered: <name>
Reason insufficient: <technical reason or "not insufficient">
Chosen option: <name>
Docs update needed: yes/no
Validation: <commands>
```

## Phasing large refactors

Split large refactors into phases:

1. Document accepted rule and current drift.
2. Refactor one boundary with no behavior change.
3. Add or update tests for behavior touched by the move.
4. Update imports and public package exports.
5. Run validation.
6. Repeat for the next boundary.
7. Add source-shape reporting only after exceptions are understood.
