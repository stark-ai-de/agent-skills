# AC-ADR-070: Use Shared Quality in the Public Skill Repository Profile

ID: AC-ADR-070
Title: Use Shared Quality in the Public Skill Repository Profile
Status: Accepted
Date: 2026-11-27
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: stack-profile, code-quality, typescript, pnpm, oxc
Applies when: Setting up a new public skill repository whose maintainer wants a concrete maintained starting stack.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-040
Superseded by: none
Guide verified: 2026-11-28
Gist: Retain independent public-skill stack choices and require the shared quality policy on applicable source.

Variants: [Short](ac-adr-070-use-shared-quality-in-the-public-skill-repository-profile.short.md) · [Long, canonical](ac-adr-070-use-shared-quality-in-the-public-skill-repository-profile.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Use the profile only when a new public skill repository needs a concrete maintained starting stack. Established repositories may adopt AC-ADR-069 directly without selecting this profile.

### Select and map components

Record one disposition (`adopt`, `adapt`, `defer`, or `reject`) and repository-native mapping per component. Reuse the target's existing instructions and authorized scope. Profile selection alone is not installation, CI mutation, source migration or publication permission.

| Component                                         | Provider decisions                             | Required target evidence                                                                              |
| ------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Open skill format, promoted catalog and promotion | AC-ADR-027, AC-ADR-028, AC-ADR-029             | Public payload boundaries and maintainer evaluation ownership                                         |
| Repository-owned licensing                        | AC-ADR-030                                     | Ownership and attribution review                                                                      |
| Toolchain and shared quality                      | AC-ADR-069, AC-ADR-058 when applicable         | Exact pins, source scope, compiler/runtime owners, compatibility exceptions and real command evidence |
| Portable helpers and local state                  | AC-ADR-033, AC-ADR-032, AC-ADR-038             | Installed helper prerequisites, effects and unavailable paths                                         |
| Migration, validation and delivery                | AC-ADR-021, AC-ADR-018, AC-ADR-049, AC-ADR-055 | Baseline/cleanup ownership, proof stages and release gates                                            |
| Public distribution                               | AC-ADR-041                                     | Reviewed source and independently authorized publication                                              |

### Apply shared quality to actual source

Use [AC-ADR-069 Short](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.short.md) · [Long](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.long.md) · [Guide](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.guide.md) for the mandatory core, strict, modularity, anti-slop and formatter exports, latest-stable npm discovery followed by an exact qualified package pin and compatible tool versions. Keep project paths, environment globals, optional framework presets, entrypoints and baselines in the consumer. Do not copy rule bodies or add an extra ESLint runner.

A pure non-JavaScript/TypeScript skill repository records non-applicability and keeps its native checks. A repository with Python skills and JavaScript maintenance helpers applies shared quality to those helpers while retaining Python proof. Do not infer React, Playwright, a documentation generator or an application host from the profile.

### Qualify the profile

Use AC-ADR-069 for package-manager, compiler, lint/format, orchestration and supply-chain ownership, AC-ADR-014 for any application runtime/host, and AC-ADR-021 for existing-code migration. Keep pnpm installation separate from runtime execution. Verify source/tool pins and clean frozen installation, actual passing/failing checks, scope/exceptions, and local versus hosted evidence before claiming implementation. A measured baseline pass is controlled migration evidence, not proof of zero debt.

An unresolved accepted local conflict blocks only its affected replacement. Record the governing decision and bounded successor/adaptation instead of forcing a universal tooling rewrite or expanding the seven-decision foundation.

## Decision lineage

- `generalizes`: [ADR-0035](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0035-use-stable-native-typescript-with-a-compatibility-lane.long.md), [ADR-0080](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0080-consume-shared-code-quality-policy.long.md).

## Official sources

- [Agent Skills specification](https://agentskills.io/specification)
- [Shared quality package](https://github.com/servrox/code-quality/blob/651582f77fecf1904bc84787b6d8a9d78394162e/README.md)
- [pnpm documentation](https://pnpm.io/)
