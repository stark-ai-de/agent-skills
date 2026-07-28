# ADR-0016: Use OpenAI metadata for Codex-facing skills

ID: ADR-0016
Title: Use OpenAI metadata for Codex-facing skills
Status: Accepted
Date: 2026-05-26
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: openai, metadata, codex
Applies when: Creating or updating a Codex- or OpenAI-facing skill.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Codex-facing skills should carry OpenAI product metadata without making it universal boilerplate.

Variants: **Short** · [Long, canonical](0016-use-openai-metadata-for-codex-skills.long.md) · [Guide](0016-use-openai-metadata-for-codex-skills.guide.md)

## Decision

We will include `agents/openai.yaml` for public and incubator skills whose primary runtime or user surface is Codex or OpenAI.

## Context

- `SKILL.md` remains the portable Agent Skills contract.
- Codex/OpenAI metadata improves UI labels, default prompts, invocation policy, and tool dependency declarations.

## Consequences

- Good: Codex-facing skills get clearer OpenAI/Codex presentation.
- Tradeoff: Maintainers must keep `SKILL.md` and `agents/openai.yaml` coherent.
- Risk: Generated metadata can drift or drop fields if not reviewed.
