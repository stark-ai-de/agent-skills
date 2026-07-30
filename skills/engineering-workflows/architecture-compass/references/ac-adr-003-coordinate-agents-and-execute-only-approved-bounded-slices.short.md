# AC-ADR-003: Coordinate Agents and Execute Only Approved Bounded Slices

ID: AC-ADR-003
Title: Coordinate Agents and Execute Only Approved Bounded Slices
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: agent-lifecycle
Tags: collaboration, delegation, execution-boundary
Applies when: Architecture Compass delegates work, resumes an approved checkpoint, or executes a multi-file or phased change.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Keep one accountable lead, disjoint delegated ownership, and an exact approved execution boundary.

Variants: **Short** · [Long, canonical](ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.long.md) · [Guide](ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.guide.md)

## Decision summary

One lead agent owns scope, approvals, reconciliation, and final claims. Delegated agents inherit the same instructions, permissions, evidence limits, and path allowlist; concurrent writers receive disjoint ownership. Their reports remain provisional until the lead reconciles them against the current repository and final artifacts. Material collaboration reports use the exact Planning capability, Read-only enforcement, Architecture decision status, and Execution status values defined by the Long decision.

Execution begins only for a user-requested, approved slice with exact targets and validation. The agent rechecks repository state before the first write, stops on material drift, and does not treat completion of one phase as authorization for the next.

## Read next

Read the [Long variant](ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.long.md) before delegating mutable work or resuming an approved checkpoint. Use the [Guide](ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.guide.md) for ownership and reconciliation worksheets.
