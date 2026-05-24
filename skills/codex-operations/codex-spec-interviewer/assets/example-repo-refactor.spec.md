---
title: "Replace legacy fetchJson wrapper with typed apiClient across the repo"
slug: "typed-api-client-repo-refactor"
mode: "deep"
status: "draft"
owner: "platform-foundation"
repo: "monorepo"
created: "2026-05-21"
updated: "2026-05-21"
source_request: "Refactor the repo to use the new typed API client instead of the old fetch wrapper"
phases: ["phase-1-safe-adoption", "phase-2-full-cutover"]
---

# Replace legacy fetchJson wrapper with typed apiClient across the repo

## Goal

Standardize HTTP access on the new typed `apiClient` abstraction to improve type safety, error consistency, retry handling, and maintainability, while minimizing regression risk during the migration.

## Background

The repository currently uses a mixture of `fetchJson(...)`, ad hoc `fetch(...)`, and service-local wrappers. This creates inconsistent error handling, duplicated headers, and weak typing at call sites. The new `apiClient` already exists but is only partially adopted.

## Scope

### In scope

- migrate direct `fetchJson(...)` call sites to `apiClient`
- align common error handling on the `apiClient` response/error model
- update affected tests and mocks
- preserve current user-visible behavior

### Non-goals

- redesign backend APIs
- rename domain models unrelated to the migration
- perform unrelated cleanup in touched files
- replace transport behavior that is intentionally service-specific

## Repo context

- Relevant packages/services/modules:
  - `packages/api-client/`
  - `apps/web/`
  - `apps/admin/`
  - `packages/test-utils/`
- Current architecture and seams:
  - shared HTTP utilities live in `packages/api-client`
  - some apps still import `fetchJson` from legacy utility modules
- CI/build/test expectations:
  - lint, typecheck, unit tests, and affected integration tests must pass
- Unknowns:
  - full inventory of remaining `fetchJson` usage is unspecified before code search

## Requirements

### Functional requirements

- WHEN a module currently uses `fetchJson(...)`, THE SYSTEM SHALL migrate it to `apiClient` unless a documented exception applies.
- WHEN a migrated call previously returned typed domain data, THE SYSTEM SHALL preserve the same effective runtime behavior while improving compile-time typing.
- IF the old call path relied on custom headers, auth propagation, or retries, THEN THE SYSTEM SHALL preserve that behavior after migration.
- IF a call site cannot be safely migrated in this pass, THEN THE SYSTEM SHALL be left unchanged and documented as deferred.

### Non-functional requirements

- Performance: no materially worse request fan-out or duplicate calls.
- Reliability: preserve timeout/retry behavior where it already exists.
- Security/privacy: preserve auth headers, CSRF handling, and redaction rules.
- Observability: preserve or improve request error logging.
- Backward compatibility: no user-visible API contract changes.

## Design

### Proposed architecture

- `apiClient` becomes the default shared abstraction.
- Legacy `fetchJson` remains only as a temporary compatibility shim during the migration window.
- Shared test helpers and mocks are updated first so downstream migrations become cheaper.
- Service-specific adapters may wrap `apiClient` if a domain needs typed helper methods.

### Alternatives considered

- Big-bang removal of all legacy wrappers in one PR:
  - rejected because review size and regression risk are too high.
- Permanent dual-stack support:
  - rejected because it keeps error semantics inconsistent.
- Per-app independent migration strategies:
  - rejected because shared consistency is the point of the refactor.

## Architectural decisions

- ADR required: yes, if `apiClient` is not already the accepted shared HTTP abstraction.
- Existing ADRs consulted: check for API-client or transport ADR before implementation.
- ADR draft or path: `docs/adr/NNNN-use-typed-api-client.md` if no accepted ADR exists.
- Supersedes: any accepted ADR that requires permanent legacy `fetchJson` usage.
- Implementation blocked until ADR accepted: yes for repo-wide cutover; no for inventory-only work.

## Source challenge

- Repo evidence checked:
  - inventory current `fetchJson(...)` call sites before deciding migration phases
  - inspect `apiClient` behavior, shared mocks, and test utilities before replacing call sites
- ADRs/specs checked:
  - check for any API-client or transport ADR before finalizing the migration contract
- External docs checked:
  - check current framework/runtime fetch behavior only if `apiClient` depends on changed platform semantics
- Requirements revised:
  - defer call sites with undocumented service-specific behavior
- Requirements preserved:
  - preserve auth, headers, retry behavior, and user-visible runtime behavior
- Preceding ADR/spec work needed:
  - add an ADR or migration note if `apiClient` is not already the accepted default abstraction
- ADR gate result:
  - unresolved until existing ADRs and `apiClient` ownership are checked
- Skipped checks and why:
  - package-specific external docs are unnecessary until the concrete `apiClient` implementation is inspected

## File and module plan

### Expected touched areas

- `packages/api-client/**`
- `packages/test-utils/**`
- `apps/web/**`
- `apps/admin/**`

### Expected new files

- migration inventory note if needed:
  - `docs/adr/` or `docs/migrations/typed-api-client.md`
- targeted helpers/tests only if required

### Explicitly protected areas

- backend services
- public API schema definitions
- unrelated UI state management

## Artifact plan

- Spec path: `docs/specs/typed-api-client-migration-spec.md`
- Destination basis: existing `docs/specs/` convention; ADR path requires confirmation if a new ADR is needed
- Explicit confirmation needed: yes, for ADR creation or ambiguous API-client ownership
- Spec persistence: saved
- Existing file overwrite needed: no
- ADR paths:
  - `docs/adr/NNNN-adopt-typed-api-client.md` if no existing ADR covers the default transport abstraction
- ADR persistence: blocked until existing ADR coverage and API-client ownership are confirmed
- ADR index updates needed: yes when a new ADR is saved
- Companion execution prompt path or embedding: embed with saved spec unless the repo already stores execution prompts separately

## Task breakdown

### Phase 1

- inventory all `fetchJson` call sites
- migrate shared mocks/helpers to support `apiClient`
- migrate low-risk leaf modules first
- add lint rule or grep-based guard to prevent new `fetchJson` usage

Validation gate:

- typecheck passes
- migrated leaf modules pass tests
- no net-new legacy call sites appear

### Phase 2

- migrate remaining app call sites module by module
- preserve service-specific behaviors with adapters where necessary
- leave deferred exceptions documented with reasons
- reduce legacy wrapper to compatibility-only or remove if zero usages remain

Validation gate:

- full test suite passes
- search confirms expected usage count
- diff review confirms no unrelated scope expansion

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
rg "fetchJson\\(" .
```

### Manual verification

- Verify login/authenticated flows still send expected auth context.
- Verify representative success and error flows in web and admin apps.
- Verify test mocks and fixtures still match runtime request shape.

### Review focus

- silent error-shape drift
- auth/header propagation regressions
- duplicated requests or retry regressions
- accidental scope creep in touched files

## Verification checkpoint

- Scope and non-goals confirmed: yes
- Assumptions reviewed: yes
- Non-blocking unknowns accepted: no; API-client ownership must be confirmed first
- Blocking decisions: ADR gate remains unresolved until existing ADRs and ownership are checked
- Risks and rollout reviewed: yes
- Validation plan reviewed: yes
- ADR result reviewed: yes
- Spec saved: yes
- ADR persistence needed: unresolved

## Rollout and rollback

- Rollout strategy:
  - merge in phases, not one giant refactor
- Feature flag:
  - not required unless runtime path selection is introduced
- Data migration/backfill:
  - none expected
- Monitoring during rollout:
  - watch request error rates and auth-related failures
- Rollback trigger:
  - elevated request failures, auth regressions, or broad integration breakage
- Rollback procedure:
  - revert the current migration slice, keep already-stable shared helper changes if isolated and safe

## Risks

| Risk                                     | Why it matters                                                  | Mitigation                                    |
| ---------------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| hidden service-specific wrapper behavior | a naive replacement can break retries/headers/error translation | inventory and preserve behavior before swap   |
| too-large PRs                            | review quality and regression risk collapse                     | phase the migration by package or module      |
| mock drift                               | tests pass for the wrong reason or start failing everywhere     | migrate shared test utilities first           |
| partial cutover confusion                | engineers may keep adding legacy calls                          | add a guardrail and document the default path |

## Done when

- [ ] All planned modules are migrated or explicitly deferred
- [ ] No unintended user-visible behavior changed
- [ ] Validation commands pass
- [ ] Remaining exceptions are documented
- [ ] Legacy abstraction is either compatibility-only or removed where safe

## Assumptions and open questions

- Assumption: `apiClient` already exists and is preferred by maintainers.
- Assumption: phase-based migration is acceptable.
- Open question: whether a repo-level lint guard already exists for legacy wrapper usage.
- Open question: whether any package intentionally depends on fetch-specific semantics that `apiClient` does not yet expose.
