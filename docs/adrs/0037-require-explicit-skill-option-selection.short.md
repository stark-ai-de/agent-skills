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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0038
Guide verified: 2026-07-28
Gist: Multi-path skills must obtain a visible explicit selection before substantive work begins.

Variants: **Short** · [Long, canonical](0037-require-explicit-skill-option-selection.long.md) · [Guide](0037-require-explicit-skill-option-selection.guide.md)

## Decision

Every stable public skill that exposes two or more material user-selectable outcomes, workflow variants, or mutation scopes must present a bounded start-selection checkpoint and obtain explicit user confirmation before substantive inspection, mutation, external side effects, or the selected workflow begins. Prompt wording may prefill a recommendation but never counts as confirmation. Internal capability routing, safety fallback, effort sizing, and host-control translation that do not change the user's outcome remain internal and do not require a menu. Every stable public skill must have a reviewed `migrate` or `not-needed` disposition, and every migrated skill must have positive and negative eval evidence for the selection boundary.

## Context

- Users should not need to know a skill's exact mode syntax before invoking it.
- Materially different read/write outcomes need visible scope before execution.
- Internal capability detection and safety fallback should remain concise and deterministic.

## Consequences

- Good: Invocation is forgiving while execution authority remains explicit.
- Tradeoff: Multi-path skills add one startup confirmation.
- Risk: Poorly scoped menus could expose implementation detail instead of meaningful user choices.
