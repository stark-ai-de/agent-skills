# Activation Cases

## Routing expectations

Activation and collaboration routing are separate decisions. After activation,
use a read-only decision phase for unresolved durable choices or broad,
multi-boundary, behavior-changing, or phased refactors. Fully specified narrow
behavior-preserving work can execute directly. Audits remain read-only, and PR,
branch, or diff reviews prefer the host review surface without requiring Plan
mode for the review itself. A direct route whose required write-capable control
is still inactive reports `pending write permission`; it is not ready to mutate
until that separate transition is confirmed.

## Positive cases

### Case 1: ADR setup for an existing repo

Prompt:

```text
Use Architecture Compass in setup mode for this repo. Make future agents rely on the provided ADRs.
```

Expected: activate. The skill should inspect existing ADRs and docs and compare
bundled guardrails against target evidence. Adoption conflicts, rejection,
adaptation, or stale ADRs require the decision phase; a mechanical refresh under
accepted ADRs can execute directly. It should defer future-fit guardrails,
challenge rejected guardrails, update or create agent instructions, update the
ADR index, and return future prompts.

### Case 2: ADR setup for a new repo

Prompt:

```text
Use the Architecture Compass in setup mode for a new TypeScript monorepo. Create the minimal ADR governance files before implementation starts.
```

Expected: activate and prefer the decision phase because stack, deployable-unit,
ownership, and adoption choices are unresolved. The skill should create nothing
until those choices are approved, then use the bounded execution continuation to
create a starter ADR governance baseline with `AGENTS.md`, an ADR index, a
source-structure ADR, bundled guardrail adoption decisions, optional stack rules,
and validation notes.

### Case 3: Existing repo refactor

Prompt:

```text
Refactor this feature so it follows the repository source-structure ADR and the approved query/read/write examples.
```

Expected: activate. The skill should inspect ADRs, stack rules, and examples
before proposing or applying changes. Broad, multi-boundary, behavior-changing,
or phased refactors require the decision phase; narrow behavior-preserving ADR
alignment can execute directly.

### Case 4: New implementation guardrail

Prompt:

```text
Add a new data-backed screen and make sure the implementation follows our route, component, query, and Server Action patterns.
```

Expected: activate. The skill should create a file placement map and validation
plan. Unresolved placement, request, runtime, package, or public-contract
boundaries require the decision phase; a fully placed ADR-backed implementation
can execute directly.

### Case 5: New repository bootstrap

Prompt:

```text
Create a starter source structure and ADRs for a new TypeScript monorepo so future implementation follows the same architecture rules.
```

Expected: activate and prefer the decision phase while repository ownership,
runtime, stack, or guardrail choices are unresolved. The skill should produce an
adoption plan, ADR draft, bundled guardrail adoption decisions, docs list, and
starter examples before a bounded setup continuation.

### Case 6: Backend runtime composition

Prompt:

```text
Create a new worker service and follow our runtime composition pattern with main.ts, runtime.ts, http-app.ts, routes, services, config, and env loading.
```

Expected: activate. The skill should enforce process bootstrap versus
composition-root boundaries. It may execute directly when accepted ADRs fully
specify service ownership and placement; unresolved deployable-unit or package
boundaries require the decision phase.

### Case 7: PR drift review

Prompt:

```text
Review this branch for architecture drift against our ADRs and stack rules, especially server-only boundaries and package ownership.
```

Expected: activate and remain read-only without requiring Plan mode. Prefer the
host review surface when available and return blocking, important, and cleanup
findings. Remediation planning is a separate phase after findings exist.

### Case 8: Stack deviation

Prompt:

```text
This feature might need a different request library. Check whether that deviates from our stack rules before implementation.
```

Expected: activate and run the stack-deviation gate. An actual durable deviation
or new ADR requires the decision phase; a conclusion that the existing stack is
sufficient does not require a Plan transition.

## Negative cases

### Case 1: Tiny edit

Prompt:

```text
Fix this typo in README.
```

Expected: do not activate.

### Case 2: Generic framework explanation

Prompt:

```text
Explain how TanStack Query staleTime works.
```

Expected: do not activate unless tied to a target repo ADR or implementation guardrail.

### Case 3: Dependency-only update

Prompt:

```text
Bump the patch version of this package and update the lockfile.
```

Expected: do not activate unless stack rules or architecture policy are involved.

### Case 4: Debugging-only task

Prompt:

```text
A test is failing. Find the bug and fix it.
```

Expected: do not activate by default. A debugging skill should own it unless the failure is caused by architecture-boundary drift.

### Case 5: Product planning

Prompt:

```text
Write a PRD for a new analytics dashboard.
```

Expected: do not activate. A PRD or spec skill should own it until implementation placement is needed.
