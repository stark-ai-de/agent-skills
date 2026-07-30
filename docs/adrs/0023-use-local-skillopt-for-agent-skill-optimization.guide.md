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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Optimize skills through an ignored local SkillOpt workspace.

Variants: [Short](0023-use-local-skillopt-for-agent-skill-optimization.short.md) · [Long, canonical](0023-use-local-skillopt-for-agent-skill-optimization.long.md) · **Guide**

This guide is non-normative. [Long](0023-use-local-skillopt-for-agent-skill-optimization.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Map the decision to the owning validation, evidence, promotion, or release boundary.
- Keep local, CI, publication, deployment, and third-party evidence as separate stages.
- Change only the authorized delivery slice and preserve an explicit rollback or stop condition.

## Verification

- Record the exact commands or scenarios executed and the evidence stage each result proves.
- Confirm that generated reports and release claims do not exceed the available evidence.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Keep `skillopt-setup` eval proof current as the adapter workflow changes.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
