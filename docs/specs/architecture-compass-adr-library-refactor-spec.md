---
title: "Architecture Compass as a routed ADR library"
slug: "architecture-compass-adr-library-refactor"
artifact_path: "docs/specs/architecture-compass-adr-library-refactor-spec.md"
mode: "deep"
status: "approved"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-28"
updated: "2026-07-28"
source_request: "Refactor Architecture Compass into a categorized Short, Long, and Guide ADR library and migrate this repository's ADRs to the same contract."
phases: ["governance", "repo-adr-cutover", "skill-library", "validation-release"]
---

# Architecture Compass as a routed ADR library

## Goal

Turn Architecture Compass into an agent-facing, progressively disclosed ADR library that makes implementation decisions explicit, reusable, reviewable, and enforceable. Migrate this repository's ADRs to the same Short/Long/Guide triplet contract so humans and agents can scan a short view, rely on one canonical decision, and load implementation guidance only when needed.

Success means the public skill routes tasks to a bounded set of applicable ADRs, all decisions have consistent triplets and links, current technical guidance is source-challenged, and deterministic validators prevent drift.

## Background

- The current skill spreads normative rules across `SKILL.md`, eight references, six assets, reports, checklists, and a multi-decision ADR template.
- Several rules conflict or have aged: authority precedence, environment loading, TypeScript preview tooling, AI SDK v5, Vercel KV, Supabase credentials, and Next.js/TanStack Query request patterns.
- Repository ADR-0003 prohibits the requested Long form, while ADR-0018 through ADR-0020 encode tooling decisions that now need successors.
- Agent Skills supports a concise `SKILL.md` with on-demand resources under `references/`; deep category folders would add routing and link maintenance without improving authority.

## Scope

### In scope

- Adopt a flat Short/Long/Guide ADR triplet contract with Long as canonical.
- Migrate every repository ADR and every tracked ADR link.
- Refactor Architecture Compass into 25 routed ADR triplets plus a human-readable catalog.
- Replace duplicated policy in assets with derived templates and one coherent example triplet.
- Add strict ADR and Architecture Compass validators, generator support, eval cases, and cross-host install-smoke checks.
- Prepare release-coherent metadata for Architecture Compass `0.3.0` and repository `0.14.0` while the verified baseline remains `0.2.1`/`0.13.0`.

### Non-goals

- Change the behavior of unrelated public skills.
- Modify ignored private specs or copy private provenance into public artifacts.
- Automatically change a target repository when Architecture Compass is merely being read or audited.
- Stage, commit, push, create or merge PRs, tag, publish, or claim hosted/production proof without separate authorization and evidence.
- Preserve the old unsuffixed ADR paths after the atomic cutover.

## Repo context

- The baseline contains 31 repository ADRs, Architecture Compass `0.2.1`, package `0.13.0`, 15 focused lifecycle eval cases, and no focused Architecture Compass validator.
- `npm run validate` is the aggregate local gate; release intent additionally requires version, changelog, and public-skill version coherence.
- Existing accepted ADRs must not be silently rewritten. A changed decision receives a successor; a mechanical triplet migration preserves status, outcome, and history.
- `docs/adrs.md` is the repository ADR policy/index. `references/adr-catalog.md` will be the skill-library catalog.

## Requirements

### Functional requirements

- WHEN an ADR is created or migrated, THE SYSTEM SHALL provide exactly `.short.md`, `.long.md`, and `.guide.md` variants with synchronized identity metadata.
- WHEN an ADR is linked outside a catalog, THE SYSTEM SHALL link Short first and include sibling Long and Guide links in parentheses.
- WHEN a task activates Architecture Compass, THE SKILL SHALL load the catalog, select ADRs by scope, category, tags, and `Applies when`, read Short first, and load Long or Guide only when needed.
- WHEN setup evaluates bundled guardrails, THE SKILL SHALL evaluate only `scope: target-repository` and `Adoptable: true` entries as `adopt`, `adapt`, `defer`, or `reject`.
- WHEN operational instructions conflict with accepted architectural intent, THE SKILL SHALL obey safety and permission constraints, report the semantic conflict, and stop the blocked implementation.
- WHEN technical syntax, package versions, provider behavior, or commands can age, THE SYSTEM SHALL keep the durable selection rule in Long and the current mechanics and verification date in Guide.
- WHEN a repository ADR's decision changes, THE SYSTEM SHALL create a successor rather than alter the accepted historical outcome.

### Non-functional requirements

- Keep `SKILL.md` under 500 lines and avoid instructions to read all references.
- Apply no numeric word cap to ADR variants; enforce one decision per ADR, consistent authority, and no duplicated normative policy.
- Keep public artifacts free of secrets, customer data, private repository paths, internal hostnames, and private comparison provenance.
- Distinguish source/static, local, CI, publication/install, deployed/production, and external/third-party evidence.
- Make all validators deterministic, dependency-light, and runnable through the repository's aggregate validation command.

## Design

### Triplet contract

Each variant uses readable Markdown metadata: ID, title, status, date, owner, scope, category, tags, applicability, adoptability, variant, canonical variant, supersession, guide verification date, and gist. Shared fields match across the triplet; only `Variant` differs. Long is normative, Short abstracts it without adding or removing obligations, and Guide is explicitly non-normative.

Accepted IDs and stems are stable. Variant navigation is direct. Normal cross-ADR links use Short plus parenthetical Long/Guide links; catalog tables use dedicated variant columns. Unsuffixed legacy files and links are forbidden after cutover.

### Catalog and categories

Use the primary categories `governance`, `agent-lifecycle`, `repository-architecture`, `frontend`, `backend`, `runtime-platform`, `security-data`, `stack-tooling`, and `quality-delivery`. Provide secondary views for testing, accessibility, performance, observability, migration, AI, and collaboration through tags rather than folders.

The catalog first separates `skill-runtime` from `target-repository`, then groups by category and exposes status, applicability, tags, and all three links. Stable IDs, not titles or category placement, identify decisions.

### Architecture Compass ADR inventory

The library contains four non-adoptable runtime decisions and 21 adoptable target-repository guardrails:

1. Route Architecture Compass through canonical ADR triplets.
2. Select actions, resolve authority, and record guardrail adoption.
3. Coordinate agents and execute only approved bounded slices.
4. Report staged evidence and protect public outputs.
5. Make repository ADRs binding agent guardrails.
6. Assign workspace ownership and source roles.
7. Enforce runtime-safe module and public package boundaries.
8. Compose Next.js routes, rendering, and component responsibilities.
9. Choose read, query, caching, and freshness boundaries.
10. Protect writes behind validated command boundaries.
11. Compose long-running backend runtimes and lifecycles explicitly.
12. Resolve environment and configuration at deployable boundaries.
13. Own language, package, build, lint, and supply-chain tooling explicitly.
14. Select application runtimes, deployment hosts, and additional targets by evidence.
15. Select frontend capability libraries by product need.
16. Select AI model, streaming, UI, and agent capabilities deliberately.
17. Select relational, cache, queue, and realtime capabilities by data requirements.
18. Validate behavior at the owning boundary and promote enforcement gradually.
19. Apply security and privacy controls at every trust boundary.
20. Define data ownership, tenancy, retention, and deletion before access paths.
21. Preserve compatibility through explicit migrations and deprecation windows.
22. Deliver reversible slices with explicit rollback and promotion gates.
23. Operate services with observable health, readiness, failure, and cleanup.
24. Meet an explicit accessibility baseline with automated and manual proof.
25. Set measurable performance budgets and optimize from evidence.

### Corrected policy

- Treat runtime, package manager, task orchestration, and hosting as separate compatibility-gated choices.
- Use the current stable native TypeScript toolchain; keep an explicit TypeScript 6 compatibility lane for compiler-API and language-service-plugin consumers.
- Keep Oxc as a candidate/default only where repository coverage and equivalence checks pass; keep type-aware and experimental modes opt-in.
- Resolve environment selection before app bootstrap and parse resolved configuration once at the deployable boundary.
- Prefer Server Components reading trusted server sources directly. Use HTTP for browser/external/non-React consumers and treat Server Actions as reachable mutation endpoints requiring validation, authentication, and authorization.
- Use TanStack Query only for real client-cache/refetch/mutation/offline requirements, with request- and identity-safe clients and one explicit awaited, streamed-Suspense, or client-pending mode.
- Use the supported current AI SDK major as an abstraction; decide managed gateway usage separately. Treat model output and tools as untrusted/security-sensitive.
- Remove Vercel KV and legacy credential defaults. Preserve RLS/user context for user operations and isolate elevated clients.
- Make accessibility, testing, security/privacy, data ownership, migration, rollback, observability, and performance first-class guardrails.

## Architectural decisions

- ADR required: yes.
- Required predecessors: ADR-0032 through ADR-0036.
- Supersedes: ADR-0003, ADR-0013, ADR-0018, ADR-0019, and ADR-0020 as recorded by their respective successors. ADR-0032 carries forward ADR-0013's spec/ADR persistence and approval-controlled folder-creation rule while replacing its unsuffixed ADR filename convention.
- Extends: ADR-0024 for portable host adapters.
- Implementation blocked until ADR acceptance: yes; the maintainer approved all five decisions on 2026-07-28.

## Source challenge

- Repo evidence checked: public skill payload, all Architecture Compass references/assets, ADR policy and template, lifecycle evals, scripts, release metadata, and current Git state.
- External docs checked: Agent Skills, MADR, TypeScript 7, Bun, Next.js, TanStack Query, AI SDK, Vercel, Supabase, Elysia, Oxc, pnpm, frontend libraries, accessibility, and runtime targets.
- Requirements revised: retain `references/`, use flat metadata instead of category folders, reject a fourth prose layer, replace package mandates with durable criteria plus current guides, and supersede stale accepted decisions.
- Requirements preserved: Short/Long/Guide triplets, human-readable catalog, complete repository ADR migration, broad foundational coverage, and source-backed implementation detail.
- Skipped checks: hosted CI, publication, production, and external install proof are not local planning evidence.

## User verification

- Final checkpoint confirmed by: maintainer.
- Confirmation date: 2026-07-28.
- Verified scope/non-goals: yes.
- Verified rollout/rollback assumptions: yes.
- Non-blocking open questions accepted: none.

## Task breakdown

### Phase 1: Governance

- Add this spec and ADR-0032 through ADR-0036 in the current compact format.
- Update required supersession metadata and the ADR index.
- Validate before changing the skill payload.

### Phase 2: Repository ADR cutover

- Add dual-format tooling, migrate all ADRs semantically, switch validation to strict triplets, remove legacy paths, and rewrite tracked links.
- Update ADR policy, instructions, templates, generator, and catalog.

### Phase 3: Skill library

- Build the 25 ADR triplets and catalog.
- Rewrite `SKILL.md` as a compact conditional router.
- Replace normative template/report duplication with derived assets and shared examples.

### Phase 4: Validation and release preparation

- Add the focused validator, regression cases, install-smoke assertions, skill/package version bumps, changelog, and catalog synchronization.
- Run all local and release gates without publishing.

## Validation

```bash
npm run validate:architecture-compass
npm run validate:adrs
npm run validate
pnpm format:check
pnpm lint
git diff --check
npm run list
npx skills@latest add ./skills --list
npm run smoke:install
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --version 0.14.0 --base-ref origin/main
node scripts/print-release-notes.mjs
```

### Required scenarios

- Short-only human inventory without loading all Long variants.
- Narrow frontend/backend routing and cross-category routing.
- Conflicting agent instructions and accepted ADRs stop implementation.
- Setup evaluates only adoptable target-repository ADRs.
- Stale delegated findings are excluded after current-state reconciliation.
- Local proof does not imply CI, publication, deployment, or external proof.
- Missing triplet, duplicate ID, metadata drift, orphan, invalid supersession, and unsuffixed link fail deterministically.
- Codex, Cursor, and Claude Code install payloads contain the same catalog and triplets.

## Rollout and rollback

- Intended review boundary: governance/spec PR, then one atomic cutover/release PR.
- Do not merge a partially migrated payload.
- Before merge, discard or revert the unmerged change through normal Git review; do not alter the index without authorization.
- After merge but before publication, use a revert PR and do not publish.
- After publication, ship a forward corrective patch release; do not move or delete the public tag.

## Risks

| Risk                      | Mitigation                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Historical decision drift | Preserve outcomes mechanically and use successors for changed decisions.                    |
| Large review surface      | Use a deterministic catalog, exact triplets, focused validators, and two review boundaries. |
| Volatile package guidance | Keep mechanics in Guides with official sources and verification dates.                      |
| Broken legacy ADR URLs    | Accepted explicitly; update every tracked link and fail on unsuffixed references.           |
| Context bloat             | Keep `SKILL.md` concise and route Short first, Long/Guide conditionally.                    |

## Done when

- [ ] ADR-0032 through ADR-0036 are accepted and indexed.
- [ ] Every repository and Architecture Compass ADR has a valid triplet.
- [ ] No tracked ADR link uses an unsuffixed legacy path.
- [ ] Architecture Compass routes only relevant ADRs and preserves lifecycle contracts.
- [ ] Existing and new focused cases pass.
- [ ] Public install-smoke payloads contain the complete routed library.
- [ ] Release metadata is coherent for `0.14.0` and Architecture Compass `0.3.0`.
- [ ] All declared local gates pass or are reported with their exact evidence boundary.

## Assumptions and open questions

- Assumption: the verified `0.13.0`/`0.2.1` baseline remains unchanged during implementation.
- Assumption: deleting unsuffixed legacy ADR URLs is intentional.
- Open questions: none.
