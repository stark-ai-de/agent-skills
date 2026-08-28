# ADR-0034: Separate package manager, runtime, orchestration, and hosting decisions

ID: ADR-0034
Title: Separate package manager, runtime, orchestration, and hosting decisions
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: package-manager, runtime, orchestration, hosting
Applies when: Choosing package management, runtime, task orchestration, or hosting guidance.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0018
Superseded by: ADR-0053, ADR-0054
Guide verified: 2026-07-28
Gist: Tool and platform choices require independent target evidence.

Variants: **Short** · [Long, canonical](0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.long.md) · [Guide](0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.guide.md)

## Decision

We will choose package management, application runtime, task orchestration, and deployment hosting independently, preserve one explicit owner for each concern, and gate every choice on target compatibility evidence.

## Context

- pnpm workspace ownership does not imply Bun runtime, Turbo orchestration, or Vercel hosting.
- Runtime and platform support differ by framework, dependency, region, compliance, and delivery model.

## Consequences

- Good: Target evidence determines the deployed stack without split ownership.
- Tradeoff: Setup records more explicit dispositions.
- Risk: Unverified combinations must remain deferred.
