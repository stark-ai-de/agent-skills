# ADR-0080: Consume shared code-quality policy

ID: ADR-0080
Title: Consume shared code-quality policy
Status: Accepted
Date: 2026-11-27
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: code-quality, ultracite, oxc, baseline, compatibility
Applies when: Changing repository lint, format, quality migration or the shared provider contract.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0036
Superseded by: None
Guide verified: 2026-11-27
Gist: Consume pinned shared quality policy with preserved correctness, explicit compatibility and non-increasing migration allowances.

Variants: [Short](0080-consume-shared-code-quality-policy.short.md) · **Long, canonical** · [Guide](0080-consume-shared-code-quality-policy.guide.md)

## Decision

This repository will consume the reviewed, immutable `@servrox/code-quality` package as the owner of shared JavaScript/TypeScript core, strict, modularity, anti-slop and formatting policy. Repository configuration owns maintained-source coverage, generated/vendor exclusions, environments, framework selection, entrypoints, command orchestration and explicit compatibility exceptions. Preserve the existing passing native correctness gate while an additive shared-policy gate enforces reviewed non-increasing migration allowances; new findings, increased counts or metrics, malformed reports and tool failures fail closed. Baseline expansion is an explicit reviewed migration, and pruning makes improvements permanent. Shared policy changes arrive through a reviewed package-pin and lockfile update, not copied rules or a second ESLint runner. Existing compiler, pnpm, runtime, validation and release ownership remain governed by their accepted decisions, and the reusable provider contract is exposed through AC-ADR-069 and AC-ADR-070.

## Why

- The former preferred Oxc candidate does not give multiple repositories a single required policy owner.
- This repository has existing correctness checks and substantial legacy source; adopting shared policy must preserve their protection while measuring migration debt honestly.
- Reusable policy and repository-specific paths, compatibility, runtime and CI responsibilities change at different boundaries.

## Options

- Chosen: Import the pinned shared package, preserve the passing correctness gate, and add a blocking non-increasing migration gate with explicit exceptions.
- Rejected: Copy preset rules or implement another plugin, because consumers would diverge from the shared policy owner.
- Rejected: Replace all current enforcement and reformat all source immediately, because coverage and accepted byte-sensitive artifacts need qualification.
- Rejected: Silently regenerate baselines in CI, because new defects would become accepted debt.

## Consequences

- Good: Shared policy has one reviewed source and consumer updates remain reproducible.
- Good: Existing correctness remains blocking while new quality regressions cannot enter the measured migration scope.
- Tradeoff: Owners maintain baseline cleanup, exceptions and evidence for all declared source boundaries.
- Risk: Exclusions or stale allowances could conceal source; contract checks and real failing examples must prove the configured boundary.

## Follow-up

- Preserve ADR-0036 and ADR-0020 as historical predecessors with reciprocal succession.
- Keep compiler compatibility under ADR-0035 and pnpm/runtime ownership under ADR-0054 and ADR-0055.
- Requalify changed package versions, rules, source scope, wrapper behavior and formatter exceptions through the owning gates.
