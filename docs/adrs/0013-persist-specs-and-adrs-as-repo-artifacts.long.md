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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0032
Guide verified: 2026-07-28
Gist: Specs and ADRs are saved files, not chat-only output.

Variants: [Short](0013-persist-specs-and-adrs-as-repo-artifacts.short.md) · **Long, canonical** · [Guide](0013-persist-specs-and-adrs-as-repo-artifacts.guide.md)

## Decision

We will persist implementation specs under `docs/specs/` and ADRs under `docs/adrs/` using predictable filenames, with user-approved folder creation when a target repo lacks those folders.

## Why

- Chat-only specs are easy to lose and hard to review.
- Predictable paths let agents and maintainers find planning artifacts.
- ADRs remain separate from implementation specs.

## Options

- Chosen: `docs/specs/<slug>-spec.md` and `docs/adrs/NNNN-title.md`.
- Rejected: console-only drafts, because they are not durable.
- Rejected: mixed spec and ADR folders, because their lifetimes differ.

## Consequences

- Good: Implementation contracts and durable decisions stay inspectable.
- Tradeoff: Spec work may need one extra folder decision.
- Risk: Stale specs need cleanup during maintenance.

## Follow-up

- Keep README, AGENTS, and contributing docs aligned with this policy.
