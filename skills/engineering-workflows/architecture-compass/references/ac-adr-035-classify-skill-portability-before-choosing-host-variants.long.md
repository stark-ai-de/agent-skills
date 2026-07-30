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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Classify agent-bound, host-variant, and adapter-based skills from contract evidence before packaging them.

Variants: [Short](ac-adr-035-classify-skill-portability-before-choosing-host-variants.short.md) · **Long, canonical** · [Guide](ac-adr-035-classify-skill-portability-before-choosing-host-variants.guide.md)

## Context

A capability can be tied to one agent's durable state, share a goal while requiring materially different host workflows, or keep the same trigger and output while translating only collaboration controls. Copying every capability per host causes policy and evidence drift. Combining genuinely different target contracts behind a generic name makes activation, required evidence, and delivered artifacts unpredictable. Host-specific metadata can improve presentation, but mandatory boilerplate misrepresents unsupported products.

## Decision

Before naming, placing, duplicating, consolidating, or adding host metadata to a public skill, classify the capability as exactly one of these portability types:

1. **Agent-bound skill.** The capability operates on agent-specific state or has a target-specific name, configuration, evidence source, safety boundary, or output that has no portable equivalent. It lives in the matching agent or runtime category and does not claim a generic cross-host contract.
2. **Portable capability with optimized host variants.** The user goal is shared, but supported hosts require materially different activation language, lifecycle transitions, target evidence, persisted artifacts, safety controls, or final execution contracts. Each variant has a host-clear name and package, shares only source-backed common material, and carries independent eval and maintenance evidence. Cosmetic wording or one metadata file is insufficient reason to split.
3. **One portable skill with host adapters.** Trigger, substantive workflow, target evidence, safety boundary, and outcome remain the same. The package detects available host capabilities and adapts planning, questions, reviews, permissions, agent-instruction conventions, or presentation internally. Missing native controls use documented safe fallbacks without changing the target contract.

The classification record compares trigger, inputs, evidence, workflow, side effects, artifacts, failure behavior, and expected outcome across claimed hosts. A split or merge requires material evidence and a migration plan for names, install docs, evals, and existing users.

Every type keeps a conforming `SKILL.md` as its package contract. Host metadata is added only when the skill intentionally exposes that host surface and the metadata improves current discovery, UI, invocation, or tool declarations. For example, a Codex- or OpenAI-facing skill may carry `agents/openai.yaml`; unrelated skills do not receive it automatically. Host metadata cannot broaden the portable skill's permissions, silently select a workflow, or contradict its name and description.

## Invariants

- One capability has one explicit portability classification at a time.
- Folder category and name follow the target contract rather than the execution host used by a maintainer.
- Host variants differ materially in trigger or outcome contract and have independent proof.
- Adapter logic changes collaboration controls, not the substantive target outcome.
- `SKILL.md` remains valid without optional host metadata.
- Host metadata is coherent with the package and tested on the named host.

## Failure handling

When evidence does not justify a split, keep one portable package and mark host-specific support gaps. When a supposedly portable package produces materially different target outcomes, stop cross-host claims and either constrain support or accept a variant decision. Do not add or remove host metadata from all skills mechanically without reviewing each classification.

## Consequences

Users see names and categories that match actual behavior, and portable workflows avoid unnecessary copies. Maintainers must sustain a classification inventory, host-specific evidence where claimed, and deliberate migrations when capability boundaries change.
