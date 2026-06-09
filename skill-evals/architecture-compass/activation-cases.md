# Activation Cases

## Positive cases

### Case 1: ADR setup for an existing repo

Prompt:

```text
Use Architecture Compass in setup mode for this repo. Make future agents rely on the provided ADRs.
```

Expected: activate. The skill should inspect existing ADRs and docs, update or create agent instructions, update the ADR index, and return future prompts.

### Case 2: ADR setup for a new repo

Prompt:

```text
Use the Architecture Compass in setup mode for a new TypeScript monorepo. Create the minimal ADR governance files before implementation starts.
```

Expected: activate. The skill should create a starter ADR governance plan with `AGENTS.md`, ADR index, source-structure ADR, optional stack rules, and validation notes.

### Case 3: Existing repo refactor

Prompt:

```text
Refactor this feature so it follows the repository source-structure ADR and the approved query/read/write examples.
```

Expected: activate. The skill should inspect ADRs, stack rules, and examples before proposing or applying changes.

### Case 4: New implementation guardrail

Prompt:

```text
Add a new data-backed screen and make sure the implementation follows our route, component, query, and Server Action patterns.
```

Expected: activate. The skill should create a file placement map and validation plan.

### Case 5: New repository bootstrap

Prompt:

```text
Create a starter source structure and ADRs for a new TypeScript monorepo so future implementation follows the same architecture rules.
```

Expected: activate. The skill should produce an adoption plan, ADR draft, docs list, and starter examples.

### Case 6: Backend runtime composition

Prompt:

```text
Create a new worker service and follow our runtime composition pattern with main.ts, runtime.ts, http-app.ts, routes, services, config, and env loading.
```

Expected: activate. The skill should enforce process bootstrap versus composition-root boundaries.

### Case 7: PR drift review

Prompt:

```text
Review this branch for architecture drift against our ADRs and stack rules, especially server-only boundaries and package ownership.
```

Expected: activate. The skill should return blocking/important/cleanup findings.

### Case 8: Stack deviation

Prompt:

```text
This feature might need a different request library. Check whether that deviates from our stack rules before implementation.
```

Expected: activate. The skill should run the stack-deviation gate.

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
