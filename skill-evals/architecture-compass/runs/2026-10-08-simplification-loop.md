# Simplification loop integration evidence

Date: 2026-10-08. Scope: optional non-normative AC-ADR-006 guidance,
Architecture Compass 0.11.0 and the generated developer plugin 1.8.0.
Repository baseline: `9595f9e` on `main`.

## Source and claim review

The integration keeps the five public workflows, canonical decisions, ADR
inventory and adoption matrix intact. It routes a requested simplification to
existing ownership, runtime, dependency and validation contracts. Runtime
content stays in the skill; synthetic scenarios remain in `skill-evals/`.

Four new cases cover existing capabilities, contract mismatch, coverage/drift,
and honest metrics/stopping. Their prompts and expected behavior were inspected
against the guide and registered with the owning validator. This is
source/static review and scenario-structure validation, not executed model
conversations, cross-project behavior proof or measured code savings.

The synthetic arithmetic case reconciles implementation `-80`, tests `+24`,
docs `+12`, TypeScript `-56` and all files `-44`. No measurement or identifying
provenance from a private project is included. Dependency examples require
target-version evidence and make no performance or zero-maintenance claim.

## Candidate identity

The verified installed payload uses these canonical source SHA-256 values:

| Skill-relative path                                                          | SHA-256                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `SKILL.md`                                                                   | `73e6f6ee5ad5730e5a1604081663fe350a8cea20f65a9d288c1eeb8e53fab222` |
| `references/ac-adr-006-assign-workspace-ownership-and-source-roles.guide.md` | `a57803f60e4ada513b016a03493afbe826ba8af236abd539c3aa374077b4e856` |
| `assets/refactor-report-template.md`                                         | `b8168e41a5960521a1462510b408725fe619f89122f61c15a2b1bcb3a18ad01d` |

Toolchain: pnpm 11.24.0, Bun 1.4.2, Node.js 24.20.0, Skills CLI 1.5.23;
isolated Linux execution with the unchanged repository lockfile and Bun config.

## Local proof

| Obligation / owner                              | Check                                                                              | Result                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Skill contract / Architecture Compass validator | `pnpm run validate:architecture-compass`                                           | Passed, including mutation fixtures; 66 public ADRs, 198 public triplets, 51 routed-library cases                       |
| Catalog / skill validator                       | `pnpm run validate:skills`                                                         | Passed; existing advisory size/pattern warnings remain                                                                  |
| Decision integrity / repository ADR validator   | `pnpm run validate:adrs`                                                           | Passed                                                                                                                  |
| Distribution / plugin validators                | `pnpm run validate:projections`, `validate:bundles`, `validate:release-descriptor` | Passed; exact generated source parity and safety/determinism fixtures                                                   |
| Listing / OpenAI validators                     | `pnpm run validate:openai` and focused release-issue rerun below                   | All constituent checks passed after the fixture fix                                                                     |
| Feature metadata / release-intent validator     | `pnpm run release:intent -- --base-ref origin/main`                                | Feature contract passed for skill 0.11.0 and plugin 1.8.0                                                               |
| Formatting and lint / Oxc                       | `pnpm run format:check`, `pnpm run lint`; focused checks after the fixture fix     | Passed                                                                                                                  |
| Documentation mapping / traceability generator  | `pnpm run validate:traceability`                                                   | Current                                                                                                                 |
| Catalog rendering / site validator              | `ASTRO_TELEMETRY_DISABLED=1 pnpm run validate:site`                                | Passed; 46 pages built and SEO validated                                                                                |
| Installation / existing smoke harness           | `pnpm run smoke:install` with pinned Skills CLI override                           | Passed; 11 public skills discovered, seven installs, Architecture Compass byte parity for Codex, Cursor and Claude Code |

The smoke harness copied 2,232 Git candidate files at fingerprint
`98a342536f701c31ebd7125f783ff160d78360f09859458f8e47fee030e18a1e`.
Subsequent changes are the release-issue test fix and this maintainer receipt;
the installed skill bytes above are unchanged. Reuse is limited to that unchanged
payload and installation obligation, not a claim that the final whole-tree
fingerprint matches the earlier copy.

The plugin version increase exposed a fixture that hardcoded `1.8.0` as a future
version. It now uses the existing `semver.inc` API. The focused
`bun --bun scripts/validation/test-openai-release-issue.mjs` rerun passed, as did
its Oxc checks. Earlier unchanged OpenAI checks are reused. An initial site build
could not write telemetry configuration; disabling telemetry allowed the same
build to finish. No dependency or lockfile change was required.

## Evidence limits and governance

ADRs 0007, 0029, 0039, 0041, 0043, 0050, 0055, 0056 and 0060 govern this integration.
The local aggregate is not a separate obligation for this Draft PR; hosted
`Validate` remains the required PR gate and its result belongs to the PR status.
No model benchmark, release publication, deployment or production observation
was performed. Reopen behavioral qualification when a maintainer selects a
representative governed target and authorizes execution of these scenarios.
