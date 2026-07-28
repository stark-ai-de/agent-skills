---
title: "Native TypeScript Tooling Architecture Compass"
slug: "native-typescript-tooling-architecture-compass"
artifact_path: "docs/specs/native-typescript-tooling-architecture-compass-spec.md"
mode: "compact"
status: "verified"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-06-11"
updated: "2026-06-11"
source_request: "use $codex-spec-interviewer to create a new adr for my repo guidance architecture skill, which defines the use tsgo -> according packages, ide setup, oxc package?"
---

# Native TypeScript Tooling Architecture Compass

## Goal

Update Architecture Compass with an accepted ADR and implementation guidance that makes native TypeScript tooling the preferred baseline for TypeScript repositories, including package selection, IDE setup, and layered Oxc usage.

## Scope

- In scope: ADR-0019, ADR index linkage, Architecture Compass preferred stack guidance, public skill version bump, package release metadata, and changelog.
- Out of scope: migrating this repository's Astro site, package scripts, or CI to `tsgo`; adding new validation scripts; publishing a release.

## Repo context

- Relevant files or areas: `docs/adrs/`, `docs/adrs.md`, `skills/engineering-workflows/architecture-compass/`, `package.json`, `CHANGELOG.md`.
- Existing commands or conventions: ADRs use `NNNN-kebab-title.md`, public skill changes require metadata and package release bumps, and final validation runs through `npm run validate`.
- Unknown repo facts marked as unspecified: final TypeScript 7 stable package timing.

## Requirements

### Functional requirements

- WHEN Architecture Compass describes TypeScript repo setup, THE SYSTEM SHALL prefer native TypeScript tooling and `tsgo` while TypeScript 7 is pre-stable.
- WHEN tools require the TypeScript 6 JavaScript compiler API, THE SYSTEM SHALL document explicit compatibility package use instead of hiding the exception.
- WHEN Architecture Compass describes Oxc, THE SYSTEM SHALL keep `oxlint`/`oxfmt` as fast lint/format tooling and add `oxlint-tsgolint` only for intentional type-aware linting.

### Constraints

- Keep/change: preserve existing Architecture Compass public skill shape and existing Bun/pnpm guidance.
- Must not: stage files, publish, change unrelated skills, or replace this repo's validation pipeline.
- Compatibility/performance/security constraints: do not include secrets, private paths, customer data, or internal hostnames.

## File plan

- Update: `docs/adrs.md`, `skills/engineering-workflows/architecture-compass/references/preferred-stack-profile.md`, `skills/engineering-workflows/architecture-compass/SKILL.md`, `package.json`, `CHANGELOG.md`.
- Add: [ADR-0019](../adrs/0019-use-native-typescript-tooling.short.md) ([Long, canonical](../adrs/0019-use-native-typescript-tooling.long.md) · [Guide](../adrs/0019-use-native-typescript-tooling.guide.md)).
- Avoid touching: unrelated skills, site runtime, and package lockfiles unless validation proves they must change.

## Architectural decisions

- ADR required: yes
- Existing ADRs consulted: ADR-0013, ADR-0015, ADR-0018
- ADR draft or path: [ADR-0019](../adrs/0019-use-native-typescript-tooling.short.md) ([Long, canonical](../adrs/0019-use-native-typescript-tooling.long.md) · [Guide](../adrs/0019-use-native-typescript-tooling.guide.md))
- Implementation blocked until ADR accepted: no

## Source challenge

- Repo evidence checked: `AGENTS.md`, `docs/specs.md`, `docs/adrs.md`, release validation scripts, Architecture Compass skill and preferred stack profile.
- ADRs/specs checked: ADR-0013, ADR-0015, ADR-0018.
- External docs checked or skipped: Microsoft TypeScript 7 beta/native preview docs, `microsoft/typescript-go`, Oxc type-aware linting docs, and live npm metadata for TypeScript/Oxc packages were checked during planning.
- Requirements revised: ADR number changed from planned 0018 to 0019 because ADR-0018 already exists in the working tree.
- Requirements preserved: full `tsgo` guidance, layered Oxc policy, accepted ADR status.
- ADR gate result: ADR required and persisted.

## Validation

```bash
npm run validate
pnpm format:check
pnpm lint
git diff --check
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --base-ref origin/main
```

## Done when

- [ ] ADR-0019 is saved and indexed.
- [ ] Architecture Compass stack guidance defines native TypeScript, IDE, compatibility, and Oxc package policy.
- [ ] Public skill and package release metadata are coherent.
- [ ] Relevant checks pass or blockers are reported.

## Assumptions and open questions

- Assumption: "make full use of tsgo" means Architecture Compass should recommend native TypeScript as the preferred baseline, not research-only guidance.
- Assumption: The existing ADR-0018 Bun/pnpm worktree changes should be preserved and incorporated into the same release metadata.
- Open question: none blocking.
