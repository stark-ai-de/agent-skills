# ADR-0001: Use the open Agent Skills specification

Status: Accepted  
Date: 2026-05-19  
Owner: stark-ai-de  
Gist: The repo needs one portable skill format.

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
