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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-04
Gist: Use redundant semantic markers for verified, informational, skipped, and attention-required receipt items.

Variants: **Short** · [Long, canonical](ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.long.md) · [Guide](ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.guide.md)

## Decision summary

Concise user-facing Architecture Compass receipts use `✅` for verified or completed items, `ℹ️` for information or work that was not needed, `⏭️` for intentionally skipped or not-run work, and `⚠️` for failures, unavailable or stale proof, limitations, and remaining issues. Each marker supplements explicit text; it never replaces the exact status, evidence stage, reason, or limitation. Use CommonMark list syntax such as `- ✅ ...`, never mark skipped or not-needed work as successful, and fall back to textual prefixes when Unicode markers are unsuitable.

## Invariants

- Markers communicate status rather than decoration.
- Exact status text and evidence boundaries remain accessible without color or emoji rendering.
- A check receives `✅` only when current evidence verifies it at the stated stage.

## Consequences

Completion receipts become faster to scan without turning skipped, informational, or limited work into false success claims.
