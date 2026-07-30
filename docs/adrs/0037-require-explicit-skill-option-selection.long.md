# ADR-0037: Require explicit skill option selection

ID: ADR-0037
Title: Require explicit skill option selection
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: agent-skills, explicit-selection, workflow-routing
Applies when: A stable public skill exposes multiple material user-selectable outcomes, workflow variants, or mutation scopes.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0038
Guide verified: 2026-07-28
Gist: Multi-path skills must obtain a visible explicit selection before substantive work begins.

Variants: [Short](0037-require-explicit-skill-option-selection.short.md) · **Long, canonical** · [Guide](0037-require-explicit-skill-option-selection.guide.md)

## Decision

Every stable public skill that exposes two or more material user-selectable outcomes, workflow variants, or mutation scopes must present a bounded start-selection checkpoint and obtain explicit user confirmation before substantive inspection, mutation, external side effects, or the selected workflow begins. Prompt wording may prefill a recommendation but never counts as confirmation. Internal capability routing, safety fallback, effort sizing, and host-control translation that do not change the user's outcome remain internal and do not require a menu. Every stable public skill must have a reviewed `migrate` or `not-needed` disposition, and every migrated skill must have positive and negative eval evidence for the selection boundary.

## Why

- Explicit selection lets users invoke a skill by name without memorizing mode syntax or fearing an accidental write-capable route.
- The checkpoint makes outcome, write scope, artifacts, and later approval boundaries visible before work begins.
- Separating material choices from internal routing avoids turning capability detection into repetitive preference questions.
- A repository-wide disposition inventory prevents older stable skills from escaping the contract silently.

## Options

- Chosen: A confirmation checkpoint for material public choices, with intent used only as a recommended prefill.
- Rejected: Infer and immediately execute from the first prompt, because a plausible inference can still select the wrong mutation boundary.
- Rejected: Ask about every technical branch, because tool availability, deterministic fallbacks, effort sizing, and host translation are implementation concerns unless they change the user's outcome or authority.
- Rejected: Apply the rule only to new skills, because existing multi-path stable skills would retain inconsistent invocation behavior.

## Consequences

- Good: Users see the complete choice surface and can correct the route before substantive work.
- Good: Read-only and write-capable variants become testable as distinct contracts.
- Tradeoff: Multi-path skills require one extra interaction even when intent appears obvious.
- Tradeoff: Maintainers must keep option inventories, prompts, metadata, and evals synchronized.
- Risk: Menus can become noisy if internal implementation branches are mislabeled as user choices.

## Historical disposition

ADR-0038 supersedes this confirmation-only policy. Its successor removes the central migration inventory and permits intent-bound agent selection while preserving finite workflow disclosure and separate approval boundaries.
