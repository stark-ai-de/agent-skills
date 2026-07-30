# ADR-0038: Expose finite skill workflows and permit intent-bound agent selection

ID: ADR-0038
Title: Expose finite skill workflows and permit intent-bound agent selection
Status: Accepted
Date: 2026-07-29
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: agent-skills, intent-routing, workflow-selection
Applies when: A stable public skill exposes multiple material user-selectable outcomes, workflow variants, or mutation scopes.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0037
Superseded by: None
Guide verified: 2026-07-29
Gist: Multi-workflow skills disclose finite choices while agents may route from clear intent and existing authority.

Variants: **Short** · [Long, canonical](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md) · [Guide](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.guide.md)

## Decision

Every stable public skill with two or more material workflows must expose its complete finite workflow set when activated. It must not add a recursive `auto` workflow. When a direct invocation states an unambiguous outcome and scope, the agent announces the task-derived workflow and rationale, then proceeds without a second workflow-selection confirmation. When the agent activates a skill on its own, it may likewise announce and use the workflow that matches the already-authorized task.

A bare invocation, conflicting cues, or ambiguity about outcome, scope, delivery, or mutation authority requires the skill to present the finite workflows and ask the user to choose. An agent may select a mutating workflow only when the user's request already authorizes that mutation and scope; otherwise it selects a relevant read-only route or asks.

Workflow selection never supplies authority for destructive, paid, external, deployment, publication, production, irreversible, or scope-expanding actions. Those actions retain their own approval and safety boundaries. Internal capability routing, deterministic fallback, effort sizing, and host-control translation remain implementation details unless they change the user-visible outcome or authority boundary.

## Context

- Agents need to activate and route skills from already-clear task intent.
- Users still need a finite workflow surface when intent is missing or ambiguous.
- Workflow routing must not expand mutation or external-action authority.

## Consequences

- Good: Clear requests proceed after an announced selection instead of a redundant confirmation.
- Tradeoff: Multi-workflow skills need focused intent, ambiguity, and authority evals.
- Risk: Ambiguous requests must fail closed to a user choice.
