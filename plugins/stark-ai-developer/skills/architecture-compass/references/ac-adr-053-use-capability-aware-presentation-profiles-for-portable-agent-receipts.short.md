# AC-ADR-053: Use Capability-Aware Presentation Profiles for Portable Agent Receipts

ID: AC-ADR-053
Title: Use Capability-Aware Presentation Profiles for Portable Agent Receipts
Status: Accepted
Date: 2026-08-05
Owner: stark-ai-de
Scope: skill-runtime
Category: quality-delivery
Tags: reporting, receipts, accessibility, portability, capabilities, token-cost
Applies when: Architecture Compass presents a final concise receipt to a human or terminal surface after setup, audit, planning, validation, or an authorized bounded change.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Preserve one evidence-first receipt contract with plain and enhanced final profiles plus a separate transient progress adapter.

Variants: **Short** · [Long, canonical](ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.long.md) · [Guide](ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.guide.md)

## Decision summary

Architecture Compass keeps final receipt semantics independent from decoration and selects one of two final-receipt profiles: `plain` for every surface and fallback or `enhanced` for capable human TTYs. A separate `interactive` adapter may render transient progress but is not a receipt profile. Enhanced presentation may add bounded markers, color, or framing, but it never changes status, evidence stage, limitations, or next action. Initial skill activation remains compact and host-neutral; machine JSON/JSONL and persisted user style preferences remain deferred.

## Invariants

- Text remains complete and meaningful when symbols, color, or framing are removed.
- Non-TTY, CI, redirected, unknown, Unicode-limited, and `NO_COLOR` surfaces use `plain`.
- Interactive spinners or cursor controls never become final evidence.
- Decoration cannot introduce repeated legends, duplicate claims, or avoidable context/output bloat.

## Consequences

- Receipts can be pleasant to scan on capable terminals without sacrificing portability or accessibility.
- Capability detection and compactness evaluation become part of receipt validation, while model-authored output stays renderer-agnostic.
