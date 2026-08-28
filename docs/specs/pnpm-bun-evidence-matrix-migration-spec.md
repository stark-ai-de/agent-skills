---
title: "pnpm and Bun evidence-matrix migration"
slug: "pnpm-bun-evidence-matrix-migration"
artifact_path: "docs/specs/pnpm-bun-evidence-matrix-migration-spec.md"
mode: "compact"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-08-26"
updated: "2026-08-26"
source_request: "Keep AC-ADR-014 and the Bun-first provider decision, reconcile them through an evidence matrix, supersede local ADR-0034 with two joint successors, and complete the pnpm/Bun migration in PR #68."
---

# pnpm and Bun evidence-matrix migration

## Goal

Keep evidence-based runtime selection and Bun-first repository tooling as complementary decisions, then migrate this repository to the resulting package, runtime, validation, CI, and release contract in PR #68.

## Scope

- Reconcile AC-ADR-014 and AC-ADR-058 without rewriting their accepted decisions.
- Accept local ADR-0053 and ADR-0054 as joint successors to ADR-0034.
- Add a public, machine-validated runtime evidence matrix whose unknown cells remain advisory.
- Keep pnpm as the only persistent dependency and lockfile owner.
- Use Bun 1.4.0 as the selected runtime for compatible repository JavaScript/TypeScript commands and record narrow Node.js fallbacks.
- Update package scripts, toolchain declarations, lockfile floors, current CI/actions, release descriptors, validation ownership, and current maintainer documentation.
- Regenerate the portable stark AI Developer plugin projection from canonical bundled-skill sources.
- Complete the PR body and hosted review loop with thematic inline comments.

## Non-goals

- Do not rewrite accepted decision text in ADR-0034, AC-ADR-014, or AC-ADR-058.
- Do not use Bun for persistent dependency installation or create a Bun lockfile.
- Do not turn evidence-matrix completeness into a mandatory release or validation gateway.
- Do not weaken the memory-curator fail-closed fixtures or execute Node.js syntax checks through Bun's incompatible `--check` behavior.
- Do not migrate immutable historical/tag-bound post-release action contracts that intentionally execute their captured Node.js scripts.
- Do not add Vitest, a server artifact, a hosting migration, a release, a deployment, or a PR merge.
- Do not mechanically rewrite historical ADRs, archived evidence, or consumer-facing `npx skills` installation examples.

## Requirements

### Decision coordination

- AC-ADR-014 remains the evidence-selection authority per concrete executable or deployable.
- AC-ADR-058 remains the Bun-first candidate and package-ownership policy for JavaScript/TypeScript repository tooling.
- Evidence produced while applying AC-ADR-058 may populate the AC-ADR-014 matrix, but the ADR's existence alone is not proof.
- When Bun is not the supported winner, the selected fallback is the best evidenced candidate from the matrix; if no candidate has better evidence and Node.js works, Node.js is the default fallback.

### Advisory evidence matrix

- The matrix classifies each current execution boundary exactly once and records candidates, signals, winner, rationale, evidence references, fallback order, and revisit trigger.
- `unknown` and `not-applicable` signals are valid and do not fail validation merely because they are incomplete.
- The validator fails on malformed or contradictory declarations, an unclassified required surface, a winner that is not a candidate, drift between selected commands and the matrix, an undocumented fallback, or package/lockfile/toolchain inconsistency.
- Actual command failures and mandatory repository gates remain authoritative over matrix completeness.

### Toolchain and execution

- `packageManager` is `pnpm@11.24.0`; `pnpm-lock.yaml` remains the only package-manager lockfile.
- `.bun-version`, `engines.bun`, the release descriptor, and CI all select Bun 1.4.0.
- `bunfig.toml` disables environment-file loading and automatic package installation.
- Compatible JavaScript/TypeScript CLIs use `bun --bun`; composed expressions use `bun exec`; nested project scripts use `pnpm run`.
- The memory-curator validator remains an explicit Node.js fallback because its fail-closed backup-root fixtures pass under Node.js and fail under Bun 1.4.0.
- Script syntax validation explicitly uses Node.js `--check`; focused script fixtures execute under the Bun parent runtime.
- Native Oxfmt/Oxlint commands remain direct.
- Repository smoke-install uses version-qualified `pnpm dlx skills@1.5.23`; consumer installation documentation remains `npx skills` where it describes the public upstream interface.

### CI and release

- Every current GitHub Actions job that runs Bun installs the version from `.bun-version`.
- Current repository-owned CI, release, listing, Pages, and composite-action commands use the selected package scripts/runtime.
- Historical tag-bound post-release helpers remain Node.js where their immutable captured contract requires it.
- The release descriptor validates Node.js, Bun, pnpm, package metadata, and version files together.

## File plan

- Add: this spec, ADR-0054 triplet, `.bun-version`, `bunfig.toml`, `docs/runtime-evidence-matrix.json`, and its validator.
- Update: ADR-0034 metadata, ADR-0053 triplet, ADR index and decision lock, AC-ADR-014/058 Guides, package manifests and lockfile, CI/actions, release descriptor/schema/tests, validation ownership, current maintainer docs, and release/listing metadata already in PR #68.
- Regenerate: `plugins/stark-ai-developer/` from canonical skill and plugin source inputs.
- Preserve: unrelated worktrees, historical decision text, immutable post-release action behavior, consumer installation examples, versions not already part of PR #68, and all publication/deployment state.

## Source challenge

- Repository evidence checked: `AGENTS.md`, package manifests, lockfile, current scripts, GitHub workflows/actions, release descriptor and validators, validation ownership, smoke-install boundary, site build, and existing PR #68 changes.
- ADRs checked: local ADR-0034/0050; AC-ADR-014/055; ADR-0041 validation ownership; ADR-0043 projection generation; accepted-decision lock and reciprocal supersession rules.
- Runtime observations checked: Bun 1.4.0 passed the representative Astro production build and most repository validators; Node.js passed the memory-curator fail-closed fixtures that Bun failed; Node.js `--check` and Bun script execution have different semantics.
- Current primary-source versions checked on 2026-08-26: pnpm 11.24.0, Astro 7.2.7, Vite 8.2.2, and skills CLI 1.5.23.
- Requirements revised: the matrix is advisory rather than a completeness gate, and Node.js remains a documented fallback for the two evidenced incompatibility boundaries.
- ADR gate result: ADR-0053 and ADR-0054 are required joint successors and are accepted by explicit maintainer direction.

## Validation

```bash
pnpm run validate:adrs
pnpm run validate:architecture-compass
pnpm run sync:agent-plugin
pnpm run validate:projections
pnpm run validate:runtime-matrix
pnpm run validate:ownership
pnpm install --frozen-lockfile --prefer-offline
pnpm run smoke:fingerprint
pnpm run validate
pnpm run validate:archives
pnpm run verify:release-reproducibility
pnpm run validate:openai-plugin
pnpm run format:check
pnpm run lint
pnpm dlx skills@1.5.23 add ./skills --list
pnpm run smoke:install
pnpm run smoke:fingerprint
```

Hosted validation must pass on the exact pushed head, including the Ubuntu aggregate and Linux/macOS/Windows archive-identity lanes. Local checks prove only the local candidate; hosted checks prove only their CI subjects.

## Risks and recovery

- Bun/runtime incompatibility: keep the failing boundary on its documented Node.js candidate and revisit on a declared version or issue trigger.
- Cross-platform shell drift: keep composed commands inside `bun exec` and require hosted platform evidence where the workflow exercises them.
- Dependency drift: update only through pnpm and reject secondary lockfiles or automatic Bun installs.
- Projection drift: edit only canonical skill sources and regenerate the portable plugin projection.
- Plan drift: stop if HEAD, index state, path scope, accepted decisions, or external PR state changes materially before the relevant mutation.
- Local failure recovery: fix the smallest owning boundary, rerun that focused check, freeze a new candidate, then rerun the required aggregate.

## User verification

- The maintainer approved keeping AC-ADR-014 and AC-ADR-058 through reciprocal explanatory references.
- The maintainer approved accepting ADR-0053 and ADR-0054 jointly and superseding ADR-0034.
- The maintainer selected an advisory matrix: unknown cells do not block and the best evidenced working candidate wins.
- The maintainer authorized the full migration, exact staging, commit, fast-forward push, PR-body update, thematic inline review comments, replies to old explanatory threads, and thread resolution after green CI.

## Done when

- [ ] ADR-0034 is Superseded by accepted ADR-0053 and ADR-0054 without changing its locked Decision text.
- [ ] AC-ADR-014 and AC-ADR-058 explain how candidate evidence and final selection coordinate without changing their locked decisions.
- [ ] The advisory matrix and validator agree with package scripts, CI, fallbacks, and toolchain declarations.
- [ ] pnpm 11.24.0 owns dependencies; Bun 1.4.0 runs compatible repository tooling; documented Node.js fallbacks remain narrow.
- [ ] Current CI, release contracts, validation ownership, docs, and generated projection are coherent.
- [ ] Required local validation passes against the final candidate and fingerprints match.
- [ ] The exact reviewed paths are staged, committed, and fast-forward pushed to PR #68.
- [ ] The PR body describes the completed migration and every thematic package has an inline GitHub review comment explaining effect and value.
- [ ] Hosted checks pass on the exact PR head and no unresolved review thread remains.

## Assumptions and open questions

- Assumption: Node.js 24.18.0 remains the compatibility runtime and upstream CLI host while Bun 1.4.0 is the repository-tooling candidate.
- Assumption: a boundary with no server artifact records server compilation as not applicable.
- Open question: none.
