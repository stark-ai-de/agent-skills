# AC-ADR-050: Use Semantic Status Markers in User-Facing Receipts

ID: AC-ADR-050
Title: Use Semantic Status Markers in User-Facing Receipts
Status: Accepted
Date: 2026-08-04
Owner: stark-ai-de
Scope: skill-runtime
Category: quality-delivery
Tags: accessibility, evidence, reporting, status-markers, usability
Applies when: Architecture Compass presents a concise user-facing completion, validation, setup, audit, or limitation summary.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-04
Gist: Use redundant semantic markers for verified, informational, skipped, and attention-required receipt items.

Variants: [Short](ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.short.md) · **Long, canonical** · [Guide](ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.guide.md)

## Context

Plain bullet lists give verified work, informational facts, intentional skips, and unresolved limitations the same visual weight. Replacing every bullet with a success checkmark is more engaging but semantically wrong: work that was unnecessary, unavailable, stale, or not run can look verified. Emoji-only meaning also fails when a renderer changes glyphs, strips color, or when a reader cannot distinguish the symbol.

AC-ADR-004 already defines exact evidence stages and statuses. This decision adds a redundant, human-scannable presentation layer without changing those evidence semantics.

## Decision

When Architecture Compass presents a concise user-facing outcome or evidence list, each material item uses CommonMark list syntax and one semantic marker:

- `- ✅ ...` for a currently `verified` check or a completed authorized slice whose stated acceptance criteria are satisfied at the named evidence stages;
- `- ℹ️ ...` for contextual information, an unchanged condition, or work that evidence shows was not needed;
- `- ⏭️ ...` for an intentionally skipped or `not run` check, including the reason and any resulting evidence limit; and
- `- ⚠️ ...` for a `failed`, `unavailable`, or `stale` check, a limitation, residual risk, blocker, or remaining issue requiring attention.

The marker is always redundant. The sentence or adjacent structured field states the exact status, subject, evidence stage when material, reason, and limitation without depending on the marker's shape or color. `✅` never describes a skipped, unavailable, stale, merely configured, or not-needed check. `ℹ️` never hides a required proof gap. `⏭️` and `⚠️` remain visible in the final summary rather than being omitted to make the result appear cleaner.

Use textual prefixes such as `Verified:`, `Info:`, `Not run:`, and `Attention:` when the target surface does not reliably support Unicode or when a repository's established accessible style excludes emoji. Do not force markers into machine-readable data, commands, filenames, metadata, raw logs, or dense tables where they reduce parsing or clarity.

## Invariants

- Semantic status is understandable without emoji rendering, color, or visual position.
- AC-ADR-004 evidence stages and statuses remain canonical; markers do not create new evidence states.
- One item receives one marker that matches its most important current status.
- Mixed outcomes are split into separate items rather than assigning a success marker to a sentence that also contains an unresolved failure.
- Engagement never outranks evidence accuracy, accessibility, or repository-native output conventions.

## Conflict resolution

An applicable host, repository, accessibility, localization, or machine-readable output contract may require plain text or another presentation. Preserve the same semantic categories and exact status wording without emoji. When the correct marker is ambiguous, use explicit text and the more cautious non-success category until the evidence is separated.

## Failure handling

If a receipt uses `✅` for unverified work, correct the marker and the accompanying claim before treating the output as final. If a renderer corrupts or removes markers, fall back to textual prefixes. If one line combines verified and limited results, split it so each outcome has an honest marker and evidence statement.

## Acceptance criteria

- Concise user-facing receipt lists distinguish verified, informational, skipped, and attention-required items.
- Every marker is paired with explicit text that remains meaningful when the marker is removed.
- Skipped, not-needed, failed, unavailable, stale, and limited work is never presented as verified.
- Structured evidence continues to use AC-ADR-004 stages and statuses.

## Consequences

Reports become faster and more pleasant to scan while retaining accurate evidence boundaries. Writers must classify each item instead of using decorative checkmarks mechanically, and some output surfaces will correctly use plain-text fallbacks.
