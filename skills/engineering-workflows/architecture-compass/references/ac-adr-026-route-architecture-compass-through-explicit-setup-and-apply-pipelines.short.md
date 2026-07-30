# AC-ADR-026: Route Architecture Compass Through Explicit Setup and Apply Pipelines

ID: AC-ADR-026
Title: Route Architecture Compass Through Explicit Setup and Apply Pipelines
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, explicit-selection, setup, apply
Applies when: Architecture Compass is activated, classifies setup or apply work, persists provider ADRs, or starts ADR-guided refactoring.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-002
Superseded by: AC-ADR-043
Guide verified: 2026-07-28
Gist: Require a confirmed finite Setup or Apply selection before Architecture Compass begins substantive work.

Variants: **Short** · [Long, canonical](ac-adr-026-route-architecture-compass-through-explicit-setup-and-apply-pipelines.long.md) · [Guide](ac-adr-026-route-architecture-compass-through-explicit-setup-and-apply-pipelines.guide.md)

## Decision summary

Architecture Compass begins every activation with a no-work selection checkpoint. It exposes `setup` with `all`, `repo-relevant`, or the fixed base set AC-ADR-005, 006, 018, 019, 021, and 022; and `apply` with `audit`, `audit-and-adr-apply`, or `audit-and-apply-refactor`. Prompt intent may prefill but never confirm the selection. Audit is strictly read-only. Writing Apply variants repair missing setup, use repository-native ADR IDs plus an AC-to-local mapping, preserve accepted local ADRs through split/adaptation/succession, and update supported agent instructions so accepted ADRs remain binding. `refactor` is a deprecated alias for `apply`; legacy contexts remain internal hints rather than public modes.

## Context

The previous dispatcher mixed one setup action with a broad refactor action and several internal modes. Users could not see the complete mutation boundary before the workflow began, and provider ADR adoption could be confused with overwriting repository history.

## Invariants

- The selection checkpoint precedes substantive inspection, mutation, or external work.
- The public choice inventory is finite and complete.
- Audit never bootstraps setup or changes files.
- Accepted local ADRs are not overwritten.
- Writing variants stop on unresolved ADR conflict, scope drift, missing authority, or irreversible work.

## Consequences

Users make one additional explicit selection, even when their invocation already suggests it. In return, write scope, expected artifacts, setup behavior, and refactor authority are visible before work begins and comparable across repositories.
