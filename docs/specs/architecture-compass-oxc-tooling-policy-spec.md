---
title: "Architecture Compass Oxc tooling policy"
slug: "architecture-compass-oxc-tooling-policy"
artifact_path: "docs/specs/architecture-compass-oxc-tooling-policy-spec.md"
mode: "compact"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-06-11"
updated: "2026-06-11"
source_request: "use $codex-spec-interviewer to create a new adr for my repo guidance architecture skill, which defines the use of formating and linting -> oxc tools."
---

# Architecture Compass Oxc tooling policy

## Goal

Persist an accepted ADR and implementation contract that make Oxc the formatting and linting baseline for this repository and the strict JS/TS starter default in Architecture Compass setup guidance.

## Scope

- In scope: ADR, ADR index, Architecture Compass guidance, validation docs, release metadata, and this companion spec.
- Out of scope: adding new validation scripts, changing Oxc versions, migrating non-JS/TS repositories, or forcing Oxc over target-repo ADRs.

## Repo context

- Relevant files or areas: `docs/adrs/`, `docs/adrs.md`, `docs/validation.md`, `skills/engineering-workflows/architecture-compass/`, `package.json`, and `CHANGELOG.md`.
- Existing commands or conventions: ADR filenames use `NNNN-kebab-title.md`; public skill behavior changes require `metadata.version` increases; CI runs `npm run validate`, `pnpm format:check`, and `pnpm lint`.
- Unknown repo facts marked as unspecified: none.

## Requirements

### Functional requirements

- WHEN ADR validation runs, THE REPO SHALL include an accepted Oxc ADR under the next sequential ADR number and list it in `docs/adrs.md`.
- WHEN Architecture Compass creates JS/TS starter guidance, THE SKILL SHALL treat Oxc linting and formatting as the default guardrail unless target-repo evidence overrides or rejects it.
- WHEN public skill validation runs, THE SKILL SHALL have an increased `metadata.version`.
- WHEN validation docs describe repository checks, THE DOCS SHALL present Oxc checks as part of the normal validation surface.

### Constraints

- Keep target-repo ADRs, stack rules, and explicit maintainer rejection higher precedence than bundled Architecture Compass defaults.
- Must not overwrite the existing ADR-0018 Bun/pnpm guidance or ADR-0019 native TypeScript guidance.
- Must not stage, unstage, commit, or push files.

## File plan

- Add: [ADR-0020](../adrs/0020-use-oxc-for-formatting-and-linting.short.md) ([Long, canonical](../adrs/0020-use-oxc-for-formatting-and-linting.long.md) · [Guide](../adrs/0020-use-oxc-for-formatting-and-linting.guide.md)).
- Add: `docs/specs/architecture-compass-oxc-tooling-policy-spec.md`.
- Update: ADR index, Architecture Compass skill references/templates, validation docs, package version, and changelog.
- Avoid touching: unrelated skills, installer behavior, and Oxc package versions.

## Architectural decisions

- ADR required: yes.
- Existing ADRs consulted: ADR-0013, ADR-0014, ADR-0018, ADR-0019.
- ADR path: [ADR-0020](../adrs/0020-use-oxc-for-formatting-and-linting.short.md) ([Long, canonical](../adrs/0020-use-oxc-for-formatting-and-linting.long.md) · [Guide](../adrs/0020-use-oxc-for-formatting-and-linting.guide.md)).
- Implementation blocked until ADR accepted: no; ADR is accepted by maintainer direction.

## Source challenge

- Repo evidence checked: `AGENTS.md`, `package.json`, `oxfmt.json`, `oxlint.json`, `.oxfmtignore`, `.github/workflows/validate.yml`, `docs/validation.md`, and Architecture Compass references.
- ADRs/specs checked: ADR policy and existing ADR index; existing public spec convention.
- External docs checked: official Oxc documentation for `oxfmt --check`, `--write`, `--config`, `--ignore-path`, and `oxlint --config`/fix behavior.
- Requirements revised: ADR number changed to `0020` because ADR-0018 and ADR-0019 already exist in the current worktree.
- Requirements preserved: accepted ADR, publishable spec, Oxc as strict JS/TS starter default.
- ADR gate result: ADR required and persisted.

## Validation

```bash
npm run validate
pnpm format:check
pnpm lint
node scripts/check-release-intent.mjs --base-ref origin/main
node scripts/validate-release.mjs --version 0.4.3 --base-ref origin/main
npx skills@latest add ./skills --list
npm run smoke:install
```

## Done when

- [ ] ADR and spec exist at their artifact paths.
- [ ] Architecture Compass guidance records Oxc as the JS/TS starter default.
- [ ] Public skill and package release metadata are coherent.
- [ ] Relevant validation commands pass or blockers are reported.

## Assumptions and open questions

- Assumption: Oxc applies to JS/TS starter guidance, not unrelated language stacks.
- Assumption: Target-repo ADRs, stack rules, and explicit rejection override the bundled default.
- Open question: none.
