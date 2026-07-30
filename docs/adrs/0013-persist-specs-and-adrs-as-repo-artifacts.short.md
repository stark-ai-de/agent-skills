# ADR-0013: Persist specs and ADRs as repo artifacts

ID: ADR-0013
Title: Persist specs and ADRs as repo artifacts
Status: Superseded
Date: 2026-05-22
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: specs, adr, persistence, superseded
Applies when: Reviewing the former persistence and ADR filename convention.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0032
Guide verified: 2026-07-28
Gist: Specs and ADRs are saved files, not chat-only output.

Variants: **Short** · [Long, canonical](0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · [Guide](0013-persist-specs-and-adrs-as-repo-artifacts.guide.md)

## Decision

We will persist implementation specs under `docs/specs/` and ADRs under `docs/adrs/` using predictable filenames, with user-approved folder creation when a target repo lacks those folders.

## Context

- Chat-only specs are easy to lose and hard to review.
- Predictable paths let agents and maintainers find planning artifacts.

## Consequences

- Good: Implementation contracts and durable decisions stay inspectable.
- Tradeoff: Spec work may need one extra folder decision.
- Risk: Stale specs need cleanup during maintenance.
