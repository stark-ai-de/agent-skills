# ADR-0013: Persist specs and ADRs as repo artifacts

Status: Accepted  
Date: 2026-05-22  
Owner: stark-ai-de  
Gist: Specs and ADRs are saved files, not chat-only output.

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
