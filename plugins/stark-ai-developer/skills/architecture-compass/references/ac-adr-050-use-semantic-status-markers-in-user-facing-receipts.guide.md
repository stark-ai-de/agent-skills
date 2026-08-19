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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-04
Gist: Use redundant semantic markers for verified, informational, skipped, and attention-required receipt items.

Variants: [Short](ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.short.md) · [Long, canonical](ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls marker meaning and evidence accuracy.

## Marker legend

| Marker | Text fallback | Use for                                                                                         |
| ------ | ------------- | ----------------------------------------------------------------------------------------------- |
| `✅`   | `Verified:`   | Current verified evidence or a completed authorized slice at the stated stages                  |
| `ℹ️`   | `Info:`       | Context, unchanged state, or evidence-backed work that was not needed                           |
| `⏭️`   | `Not run:`    | Intentionally skipped or not-run work, with its reason and evidence limit                       |
| `⚠️`   | `Attention:`  | Failed, unavailable, or stale proof; limitations, blockers, residual risks, or remaining issues |

## Writing pattern

Keep CommonMark bullets and place the marker after the bullet:

```markdown
- ✅ The focused source check is verified against the current working tree.
- ℹ️ No additional configuration file was needed.
- ⏭️ Application tests were not run because application code and dependencies did not change.
- ⚠️ CI evidence is unavailable; the result proves only the inspected local stages.
```

Split mixed outcomes. For example, do not write `✅ Local checks passed, but CI failed.` Use one `✅` local item and one `⚠️` CI item with their separate stages.

## Accessibility and portability

- Keep the exact status in words; do not rely on glyph shape, color, or screen position.
- Use the textual fallbacks when Unicode rendering is unreliable or repository conventions require plain text.
- Keep machine-readable status fields emoji-free unless their schema explicitly defines markers.
- Preserve skipped and limited items even when a shorter success-only summary would look cleaner.

## Current sources

- [WCAG 2.2 Understanding Success Criterion 1.4.1: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), verified 2026-08-04.
- [CommonMark specification: list items](https://spec.commonmark.org/0.31.2/#list-items), verified 2026-08-04.
- [Unicode Technical Standard #51: Unicode Emoji](https://unicode.org/reports/tr51/), verified 2026-08-04.

## Revisit

Create a successor if Architecture Compass changes the semantic categories, makes markers machine-readable contract values, or adopts a different accessible status vocabulary.
