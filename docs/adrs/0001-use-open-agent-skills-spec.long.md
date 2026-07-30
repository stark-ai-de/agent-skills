# ADR-0001: Use the open Agent Skills specification

ID: ADR-0001
Title: Use the open Agent Skills specification
Status: Accepted
Date: 2026-05-19
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: agent-skills, portability, specification
Applies when: Creating or validating a public Agent Skill.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: The repo needs one portable skill format.

Variants: [Short](0001-use-open-agent-skills-spec.short.md) · **Long, canonical** · [Guide](0001-use-open-agent-skills-spec.guide.md)

## Decision

We will use `https://agentskills.io/specification` as the normative format for all public skills.

## Why

- It defines `SKILL.md`, required frontmatter, and optional resource folders.
- It keeps the repo portable across Codex and other agents.
- It supports progressive disclosure, which keeps agent context smaller.

## Options

- Chosen: Agent Skills specification.
- Rejected: Codex-only format, because the repo should stay portable.
- Rejected: Custom format, because installers and agents may not discover it.

## Consequences

- Good: Skills are easier to install and validate.
- Tradeoff: Skill names and metadata must follow stricter rules.
- Risk: Some optional fields may not work in every agent.

## Follow-up

- Add validation for frontmatter and naming rules.
