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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0037
Superseded by: None
Guide verified: 2026-07-29
Gist: Multi-workflow skills disclose finite choices while agents may route from clear intent and existing authority.

Variants: [Short](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.short.md) · **Long, canonical** · [Guide](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.guide.md)

## Decision

Every stable public skill with two or more material workflows must expose its complete finite workflow set when activated. It must not add a recursive `auto` workflow. When a direct invocation states an unambiguous outcome and scope, the agent announces the task-derived workflow and rationale, then proceeds without a second workflow-selection confirmation. When the agent activates a skill on its own, it may likewise announce and use the workflow that matches the already-authorized task.

A bare invocation, conflicting cues, or ambiguity about outcome, scope, delivery, or mutation authority requires the skill to present the finite workflows and ask the user to choose. An agent may select a mutating workflow only when the user's request already authorizes that mutation and scope; otherwise it selects a relevant read-only route or asks.

Workflow selection never supplies authority for destructive, paid, external, deployment, publication, production, irreversible, or scope-expanding actions. Those actions retain their own approval and safety boundaries. Internal capability routing, deterministic fallback, effort sizing, and host-control translation remain implementation details unless they change the user-visible outcome or authority boundary.

## Why

- Agent-driven skill discovery is useful only if a capable agent can route an already-clear task without forcing a redundant human menu interaction.
- A finite disclosed workflow set still gives users a predictable choice surface and makes ambiguous activation safe.
- Separating route selection from action authority permits autonomy without weakening destructive, external, or scope-expanding controls.
- Keeping capability fallback internal avoids a recursive `auto` mode and prevents implementation detail from becoming public workflow surface.

## Options

- Chosen: Intent-bound selection with finite disclosure, ambiguity fallback, and unchanged approval boundaries.
- Rejected: Retain mandatory confirmation for every invocation, because it blocks autonomous skill activation and repeats choices already made in clear task language.
- Rejected: Add an `auto` workflow, because it recursively hides the real workflow and complicates contracts, evals, and receipts.
- Rejected: Allow unrestricted agent inference, because mutation or delivery ambiguity can materially change user intent and authority.

## Consequences

- Good: Users and agents can invoke a skill naturally while preserving a visible, testable workflow model.
- Good: Clear read-only and explicitly requested mutating tasks can begin without an unnecessary round trip.
- Good: Bare or ambiguous activation remains a safe checkpoint.
- Tradeoff: Each multi-workflow skill needs focused routing evals for clear intent, ambiguity, and mutation authority.
- Risk: Poor intent classification could select the wrong route; finite disclosure, announcement, and fail-closed ambiguity handling limit that risk.

## Follow-up

- Keep public workflow inventories, metadata, focused evals, and validators synchronized per skill.
- Treat a new material outcome or mutation scope as a workflow-contract change.
- Keep single-outcome skills free of artificial workflow menus.
