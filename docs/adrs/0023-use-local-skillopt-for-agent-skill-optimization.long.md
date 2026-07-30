# ADR-0023: Use local SkillOpt for Agent Skill optimization

ID: ADR-0023
Title: Use local SkillOpt for Agent Skill optimization
Status: Proposed
Date: 2026-05-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: skillopt, optimization, local-state
Applies when: Optimizing an Agent Skill with SkillOpt.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Optimize skills through an ignored local SkillOpt workspace.

Variants: [Short](0023-use-local-skillopt-for-agent-skill-optimization.short.md) · **Long, canonical** · [Guide](0023-use-local-skillopt-for-agent-skill-optimization.guide.md)

## Decision

We will use Microsoft SkillOpt through `.agents/` and persist only curated run summaries and adopted skill changes.

## Why

- SkillOpt is an external optimizer, not runtime skill content.
- `.agents/` is already ignored for local helper state.
- Raw optimizer traces can contain prompts, paths, and provider metadata.
- Public proof should stay reviewable under `skill-evals/`.
- Codex CLI target mode lets users reuse local authentication for rollout execution.

## Options

- Chosen: ignored local SkillOpt clone with curated public summaries.
- Rejected: vendor SkillOpt into the public skill payload.
- Rejected: commit raw optimizer run output as eval proof.

## Consequences

- Good: repeatable local optimization without polluting public installs.
- Good: Codex-heavy users can avoid API-key target rollouts.
- Tradeoff: adapter templates may need updates as SkillOpt evolves.
- Risk: all-Codex reflection stays experimental until validated.

## Follow-up

- Keep `skillopt-setup` eval proof current as the adapter workflow changes.
