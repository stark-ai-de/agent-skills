# AC-INTERNAL-002: Select Capability-Aware Receipt Renderers

> Internal implementation record. This triplet is not a public Architecture Compass ADR, is excluded from the public catalog, and cannot override an accepted public Long decision.

ID: AC-INTERNAL-002
Title: Select Capability-Aware Receipt Renderers
Status: Accepted
Date: 2026-08-05
Owner: stark-ai-de
Scope: skill-runtime-internal
Category: implementation-policy
Tags: architecture-compass, receipts, presentation, host-adapters, accessibility
Applies when: Architecture Compass emits a concise user-facing receipt or adapts a final report for a terminal, chat, CI, redirect, or unknown host.
Adoptable: false
Visibility: Internal
Public catalog: Excluded
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Preserve one semantic receipt with plain and enhanced final profiles plus a separate transient progress adapter, without requiring emoji, color, ANSI, or Clack.

Variants: **Short** · [Long, canonical](internal-adr-002-select-capability-aware-receipt-renderers.long.md) · [Guide](internal-adr-002-select-capability-aware-receipt-renderers.guide.md)

## Decision summary

Keep status, evidence stage, subject, result, limitation, and next action as the canonical receipt content. Select `plain` for chat, CI, redirects, non-TTY, unknown, or capability-disabled hosts; select bounded `enhanced` presentation only for a capable human TTY; use `interactive` spinners or task logs only for real in-progress work, never as final evidence. Symbols, color, framing, and Clack-like rendering are optional adapters, not literal requirements on model-authored output. Plain text must remain complete and meaningful.

## Invariants

- Presentation never changes facts, evidence stage, status, limitations, or write authority.
- Text carries meaning without emoji, color, Unicode width support, ANSI, cursor controls, or a renderer package.
- Unknown, non-TTY, CI, redirected, `NO_COLOR`, or renderer-failure states fall back to compact plain output.

## Consequences

- Human terminal receipts can be polished without sacrificing portability or accessibility.
- Capability detection and bounded fallback add a small adapter concern; the semantic receipt remains one contract.
