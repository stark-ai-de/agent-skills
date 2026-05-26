# ADR-0016: Use OpenAI metadata for Codex-facing skills

Status: Accepted
Date: 2026-05-26
Owner: stark-ai-de
Gist: Codex-facing skills should carry OpenAI product metadata without making it universal boilerplate.

## Decision

We will include `agents/openai.yaml` for public and incubator skills whose primary runtime or user surface is Codex or OpenAI.

## Why

- `SKILL.md` remains the portable Agent Skills contract.
- Codex/OpenAI metadata improves UI labels, default prompts, invocation policy, and tool dependency declarations.
- Non-Codex skills should not carry product-specific boilerplate before it is useful.

## Options

- Chosen: Require it for Codex/OpenAI-facing repo-managed skills.
- Rejected: Require it for every skill, because many skills should stay format-portable.
- Rejected: Keep it ad hoc, because Codex-facing skills should present consistently.

## Consequences

- Good: Codex-facing skills get clearer OpenAI/Codex presentation.
- Tradeoff: Maintainers must keep `SKILL.md` and `agents/openai.yaml` coherent.
- Risk: Generated metadata can drift or drop fields if not reviewed.

## Follow-up

- Document the authoring rule and add missing metadata to Codex-facing skills.
