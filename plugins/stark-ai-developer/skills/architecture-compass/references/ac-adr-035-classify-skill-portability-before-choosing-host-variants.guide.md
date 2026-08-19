# AC-ADR-035: Classify Skill Portability Before Choosing Host Variants

ID: AC-ADR-035
Title: Classify Skill Portability Before Choosing Host Variants
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: portability, host-variants, metadata, catalog
Applies when: Naming, placing, splitting, or adding host metadata to a public skill capability.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Classify agent-bound, host-variant, and adapter-based skills from contract evidence before packaging them.

Variants: [Short](ac-adr-035-classify-skill-portability-before-choosing-host-variants.short.md) · [Long, canonical](ac-adr-035-classify-skill-portability-before-choosing-host-variants.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls portability classification.

## Comparison matrix

| Dimension                    | Host A | Host B | Materially different? |
| ---------------------------- | ------ | ------ | --------------------- |
| User-facing trigger and name |        |        |                       |
| Target state and evidence    |        |        |                       |
| Workflow and lifecycle       |        |        |                       |
| Permissions and side effects |        |        |                       |
| Persisted artifacts          |        |        |                       |
| Failure and handoff          |        |        |                       |
| Final outcome                |        |        |                       |

- Choose **agent-bound** when the target itself is agent-specific, such as one host's persistent memory store.
- Choose **optimized host variants** when the shared goal still requires materially different target artifacts or lifecycle contracts.
- Choose **one portable skill with adapters** when only host controls or instruction conventions differ.

For Codex/OpenAI presentation, validate `agents/openai.yaml` against the current host schema and keep its display name, description, prompt, invocation policy, and tool declarations coherent with `SKILL.md`. Do not add it to a Claude-only, Cursor-only, or host-neutral skill solely for symmetry.

## Decision lineage

- `consolidates`: [ADR-0021](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0021-place-portable-skills-in-workflow-categories.long.md), [ADR-0016](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0016-use-openai-metadata-for-codex-skills.long.md).

## Current references

- [Agent Skills specification](https://agentskills.io/specification)
- [Open skills CLI host compatibility](https://github.com/vercel-labs/skills)

## Revisit

Create a successor if package discovery gains a standardized multi-host adapter or variant manifest. Re-verify host metadata schemas before every release that changes them.
