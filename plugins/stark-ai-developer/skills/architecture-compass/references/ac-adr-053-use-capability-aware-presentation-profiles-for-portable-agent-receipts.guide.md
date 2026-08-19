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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Preserve one evidence-first receipt contract with plain and enhanced final profiles plus a separate transient progress adapter.

Variants: [Short](ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.short.md) · [Long, canonical](ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Receipt profile and progress-adapter selection

Inspect capability before writing the final receipt:

| Observation                                                                                         | Route         | Kind             | Notes                                                                           |
| --------------------------------------------------------------------------------------------------- | ------------- | ---------------- | ------------------------------------------------------------------------------- |
| Chat, CI, redirect, non-TTY, unknown host, `NO_COLOR`, unreliable Unicode/width, or any uncertainty | `plain`       | Receipt profile  | Explicit status words; no required decoration                                   |
| Human interactive TTY with reliable Unicode/width and permitted color                               | `enhanced`    | Receipt profile  | Bounded markers, optional color, optional small grouping; text remains complete |
| Actual interactive progress while work is running                                                   | `interactive` | Progress adapter | Spinner/task updates only; normalize to a stable final receipt                  |

Treat `interactive` as a rendering phase, not a final output mode. If a TTY disappears, output is redirected, or a renderer fails, stop transient updates and continue with `plain`.

## Receipt shape

Keep the semantic fields visible:

```text
Result: <verified | informational | skipped | failed | unavailable | stale>
Evidence: <stage and subject>
Outcome: <what the check or authorized slice established>
Limit: <reason, missing stage, or none>
Next: <follow-up or none>
```

AC-ADR-050 markers may prefix each concise list item in `enhanced`; textual prefixes remain the fallback. Split mixed outcomes so one success marker never covers a limitation.

Avoid a legend on every receipt. Add framing only when it reduces scanning cost and does not hide the limitation or duplicate the heading and status.

## Renderer boundary

The model or skill writes semantic text. A host adapter may apply color, box drawing, spinner, or task-log behavior after capability and approval checks. Do not place raw ANSI or cursor controls in the model-authored text, persisted evidence, commands, filenames, raw logs, or machine fields. Do not add a Clack or similar runtime dependency solely to satisfy this ADR.

## Overhead check

Compare matched `plain` and `enhanced` fixtures:

- model input/output token counts when the host reports them;
- UTF-8 byte, character, and line counts as deterministic fallbacks;
- repeated heading, legend, border, and status text;
- semantic fields lost when decoration is removed.

Investigate avoidable growth rather than applying a universal hard token threshold. Renderer-only bytes should not be described as model-token cost.

## Validation

Run focused receipt fixtures for mixed statuses, marker stripping, `NO_COLOR`, non-TTY/CI/redirect, Unicode width, renderer failure, and interactive-to-final normalization. Verify that JSON/JSONL and persistent style preferences remain untouched until separately specified.

## Sources

- [AC-ADR-050: Use Semantic Status Markers in User-Facing Receipts](ac-adr-050-use-semantic-status-markers-in-user-facing-receipts.long.md), verified 2026-08-05.
- [AC-ADR-004: Report Staged Evidence and Protect Public Outputs](ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md), verified 2026-08-05.
- [Node.js terminal styling and capability utilities](https://nodejs.org/api/util.html), verified 2026-08-05.
- [NO_COLOR convention](https://no-color.org/), verified 2026-08-05.
- [WCAG 2.2 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), verified 2026-08-05.

## Revisit

Create a successor when Architecture Compass adds a machine-readable receipt schema, persistent user-selected presentation preferences, a mandatory renderer, or new semantic status categories.
