# AC-ADR-043: Route Architecture Compass Through Explicit Setup and Apply Pipelines With Risk-Based Validation

ID: AC-ADR-043
Title: Route Architecture Compass Through Explicit Setup and Apply Pipelines With Risk-Based Validation
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, explicit-selection, setup, apply, validation
Applies when: Architecture Compass is activated, classifies setup or apply work, persists provider ADRs, or starts ADR-guided refactoring.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-026
Superseded by: AC-ADR-045
Guide verified: 2026-07-29
Gist: Preserve explicit Setup and Apply pipelines while adding risk-based validation to the fixed base profile.

Variants: **Short** · [Long, canonical](ac-adr-043-route-architecture-compass-through-explicit-setup-and-apply-pipelines-with-risk-based-validation.long.md) · [Guide](ac-adr-043-route-architecture-compass-through-explicit-setup-and-apply-pipelines-with-risk-based-validation.guide.md)

## Decision summary

Architecture Compass begins every activation with the explicit Setup/Apply selection contract established by AC-ADR-026. It exposes `setup` with `all`, `repo-relevant`, or the fixed base set AC-ADR-005, 006, 018, 019, 021, 022, and 042; and `apply` with `audit`, `audit-and-adr-apply`, or `audit-and-apply-refactor`. Prompt intent may prefill but never confirm the selection. Audit stays read-only. Writing Apply variants repair setup, preserve repository-native ADR identity and history, and bind accepted ADRs through supported agent instructions.

Setup confirms an existing repository-native Spec, status, or evidence path for reusable validation receipts, or proposes a path and waits for confirmation before creating it. Apply plans risk, cadence, check ownership, evidence reuse and invalidation, the final aggregate gate, and any environment-evidence path under the locally adopted AC-ADR-042. Neither selection nor ADR adoption authorizes Preview, deployment, production, publication, or other external action, and no new public validation mode is introduced.

## Context

AC-ADR-026 made the public workflow finite but fixed `base` before risk-proportional validation and repository-native receipt reuse became part of the default governance baseline. The accepted workflow must be carried forward rather than edited in place.

## Invariants

- The selection checkpoint precedes substantive work.
- The public action, profile, and variant inventory does not expand.
- Base resolves to exactly seven named adoptable ADRs.
- Audit never writes or performs an environment probe.
- Setup adoption and the refactor checkpoint never imply deployment or production authority.

## Consequences

Base setup gains one default provider decision and writing Apply reports gain compact validation-planning fields. The explicit confirmation, write scopes, repository-native mapping, accepted-history preservation, deviation stop, and autonomous bounded-slice behavior of AC-ADR-026 remain intact.
