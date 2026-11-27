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
Variant: Short
Canonical variant: Long
Supersedes: ADR-0036
Superseded by: None
Guide verified: 2026-11-27
Gist: Consume pinned shared quality policy with preserved correctness, explicit compatibility and non-increasing migration allowances.

Variants: **Short** · [Long, canonical](0080-consume-shared-code-quality-policy.long.md) · [Guide](0080-consume-shared-code-quality-policy.guide.md)

## Context

Shared quality policy needs one required reusable owner while the existing repository preserves correctness and measured legacy migration.

## Decision

This repository will consume the reviewed, immutable `@servrox/code-quality` package as the owner of shared JavaScript/TypeScript core, strict, modularity, anti-slop and formatting policy. Repository configuration owns maintained-source coverage, generated/vendor exclusions, environments, framework selection, entrypoints, command orchestration and explicit compatibility exceptions. Preserve the existing passing native correctness gate while an additive shared-policy gate enforces reviewed non-increasing migration allowances; new findings, increased counts or metrics, malformed reports and tool failures fail closed. Baseline expansion is an explicit reviewed migration, and pruning makes improvements permanent. Shared policy changes arrive through a reviewed package-pin and lockfile update, not copied rules or a second ESLint runner. Existing compiler, pnpm, runtime, validation and release ownership remain governed by their accepted decisions, and the reusable provider contract is exposed through AC-ADR-069 and AC-ADR-070.

## Consequences

Consumer scope, compatibility exceptions and baseline cleanup remain explicit. A passing regression gate preserves current debt bounds without claiming a violation-free repository.
