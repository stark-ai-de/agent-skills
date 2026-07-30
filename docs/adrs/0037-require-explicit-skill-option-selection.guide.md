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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0038
Guide verified: 2026-07-28
Gist: Multi-path skills must obtain a visible explicit selection before substantive work begins.

Variants: [Short](0037-require-explicit-skill-option-selection.short.md) · [Long, canonical](0037-require-explicit-skill-option-selection.long.md) · **Guide**

This guide is non-normative. [Long](0037-require-explicit-skill-option-selection.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Treat a choice as material when it changes at least one of these:

- the user's requested outcome;
- whether repository or external state may change;
- the class of artifacts produced;
- the approval or recovery boundary;
- the scope that will be inspected or transformed.

At activation, list the finite choices, mark one recommendation when the prompt supports it, summarize write scope and outputs, and ask the user to confirm or change the selection. A host-native structured question is preferred; an explicit textual answer is portable. Begin substantive work only after the response.

Do not expose deterministic tool fallback, capability detection, host-specific control translation, or effort sizing unless it changes the user's outcome or requires separate authority. A later destructive, paid, irreversible, external, or scope-expanding step still needs its own approval even after startup selection.

## Historical note

ADR-0038 supersedes this confirmation-only guidance. The central `migrate`/`not-needed` inventory and its migration-specific eval shape are retired; focused skill evals now verify intent, ambiguity, and authority boundaries.

## Verification

- Follow ADR-0038 for current workflow-routing policy.
- Run `npm run validate:skills` and the affected skill-specific validators.

## Current references

- [Agent Skills specification](https://agentskills.io/specification) defines the portable skill package; this repository decision defines its multi-path startup interaction.

## Revisit

Follow ADR-0038 and any later reciprocal successor for current policy.
