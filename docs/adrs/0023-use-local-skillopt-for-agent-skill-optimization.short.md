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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Optimize skills through an ignored local SkillOpt workspace.

Variants: **Short** · [Long, canonical](0023-use-local-skillopt-for-agent-skill-optimization.long.md) · [Guide](0023-use-local-skillopt-for-agent-skill-optimization.guide.md)

## Decision

We will use Microsoft SkillOpt through `.agents/` and persist only curated run summaries and adopted skill changes.

## Context

- SkillOpt is an external optimizer, not runtime skill content.
- `.agents/` is already ignored for local helper state.

## Consequences

- Good: repeatable local optimization without polluting public installs.
- Good: Codex-heavy users can avoid API-key target rollouts.
- Tradeoff: adapter templates may need updates as SkillOpt evolves.
- Risk: all-Codex reflection stays experimental until validated.
