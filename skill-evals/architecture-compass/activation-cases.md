# Activation Cases

## Routing expectations

Activation and workflow routing are separate. Every direct invocation exposes `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`. Clear task intent with sufficient authority selects and announces a workflow immediately; bare or materially ambiguous activation asks. There is no `auto` workflow.

Start ADR discovery at `references/adr-catalog.md`, use Short variants for inventory, load only applicable canonical Long ADRs, and use Guides for procedure. Planning capability and filesystem/write permission remain separate controls.

## Positive cases

### Governance setup

```text
Establish recommended repository-native ADR governance so future coding agents follow accepted decisions.
```

Select `setup/recommended`, state rationale and governance-only write scope, inspect target conventions, and proceed. For a new/evidence-empty repository only, evaluate the exact seven-decision foundation first. An explicit exhaustive request selects `setup/complete`.

### Read-only architecture review

```text
Audit this branch for architecture and accepted-ADR drift. Do not change files.
```

Select `audit`, use the host review/read-only surface when available, and return evidence-backed findings without governance repair, artifacts, installs, or external mutations.

### Bounded governed refactor

```text
Refactor these two adapter files to conform to accepted ADR-0012.
```

Select `refactor` only when accepted local decisions already govern the complete change. Execute reversible slices inside the named scope and stop if a durable decision or missing governance appears.

### Plan only

```text
Plan and persist a repository architecture migration, but do not implement it.
```

Select `plan-refactor`. Use native Plan mode when supported, approve the bounded specification while repository artifacts remain read-only, exit Plan mode, persist and validate only the approved planning/ADR artifacts, then stop.

### Plan and run

```text
Plan and implement this broad multi-package architecture migration; ownership decisions are unresolved.
```

Select `plan-run-refactor`. Resolve decisions in Plan mode, exit before persistence, recheck state, and execute only the unchanged approved plan.

### Bare activation

```text
Use Architecture Compass here.
```

Show all workflows and ask which outcome is wanted. Do not infer mutation, persistence, or scope.

### Agent-discovered concern

When the agent activates the skill because it discovers an architecture concern during another task, it may select a relevant read-only audit. It may select mutation only if the user's existing request already authorizes that outcome and scope.

### Conditional target instruction

During setup, add or preserve the generic finite-workflow/intent-selector instruction only when target evidence proves a stable public skill with multiple material workflows. During audit, report its classification only. Indeterminate evidence authorizes no write.

## Negative cases

- A typo or style-only edit does not activate the skill.
- Generic framework education without target architecture evidence does not activate it.
- An ordinary dependency patch does not activate it unless architecture/stack policy is implicated.
- A generic failing test routes to diagnosis unless architecture-boundary drift is the cause.
- Product requirements work routes to a specification workflow until architecture governance or placement is in scope.
