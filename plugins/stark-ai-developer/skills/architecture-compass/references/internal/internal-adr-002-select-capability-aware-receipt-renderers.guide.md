# AC-INTERNAL-002: Select Capability-Aware Receipt Renderers

> Internal implementation record. This Guide is non-normative, is excluded from the public Architecture Compass catalog, and cannot override the canonical Long decision or any accepted public ADR.

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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Preserve one semantic receipt with plain and enhanced final profiles plus a separate transient progress adapter, without requiring emoji, color, ANSI, or Clack.

Variants: [Short](internal-adr-002-select-capability-aware-receipt-renderers.short.md) · [Long, canonical](internal-adr-002-select-capability-aware-receipt-renderers.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls. Public authority remains with [AC-ADR-004](../ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md), [AC-ADR-033](../ac-adr-033-choose-portable-dependency-light-skill-helpers.long.md), [AC-ADR-036](../ac-adr-036-keep-architecture-compass-portable-through-host-adapters.long.md), [AC-ADR-038](../ac-adr-038-gate-optional-capabilities-and-tool-side-effects.long.md), and [AC-ADR-053](../ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.long.md).

## Receipt profile and progress-adapter selection

Resolve presentation at the output boundary. Keep the semantic receipt unchanged:

| Observation                                                                | Route         | Kind             | Notes                                                                              |
| -------------------------------------------------------------------------- | ------------- | ---------------- | ---------------------------------------------------------------------------------- |
| Chat response, CI, redirect, pipe, unknown host, or non-TTY                | `plain`       | Receipt profile  | Compact Markdown/ASCII and textual status are the default.                         |
| Human TTY with confirmed Unicode/color support and no plain-output request | `enhanced`    | Receipt profile  | Add bounded markers, optional color, or framing only when they improve scanning.   |
| Actual in-progress TTY work                                                | `interactive` | Progress adapter | A spinner/task adapter may show progress; always finish with the semantic receipt. |
| `NO_COLOR`, uncertain width, renderer failure, or conflicting signals      | `plain`       | Receipt profile  | Prefer readable text over a guessed capability.                                    |

Do not choose `enhanced` because a prompt says “use boxes” or because an agent knows the host name. Use current observed capability. Do not choose `interactive` for a final report.

## Semantic receipt shape

Keep the owning workflow's fields visible in text. A compact receipt can use:

```text
<text status>: <subject>
Evidence: <stage and proof>
Result: <what changed or was observed>
Limitation: <none or explicit limitation>
Next: <none or bounded next action>
```

An enhanced marker may prefix the status, but never replaces its text. Avoid a legend for a small receipt, repeated status wording, full-width borders, and emoji-dependent column alignment.

## Adapter boundaries

- Model-authored content supplies the semantic buffer and plain fallback.
- A host adapter may add color, symbols, framing, or a spinner after capability detection.
- A missing Clack-like library or unsupported terminal feature selects the plain adapter; it does not authorize installation or a new dependency.
- ANSI and cursor controls are renderer output only. They do not belong in persisted receipts, raw logs, commands, filenames, or machine data.

## Cost and accessibility checks

Compare a fixed plain fixture with its enhanced rendering. Record model instruction/output tokens when the host reports them, and record rendered characters, bytes, and lines as deterministic terminal/log overhead. Treat repeated legends, duplicated status text, and decorative blocks as bloat to remove. Keep textual status and limitations so color or symbols are never the only carrier of evidence.

Honor `NO_COLOR` and plain-output requests. Test narrow terminals and copy/paste into a log or issue. Emoji width is not stable enough to be a required alignment primitive.

## Failure matrix

| Failure                   | Required response                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Capability unknown        | Plain profile; include any meaningful limitation in text.                                      |
| Color disabled            | Plain text or no-color enhanced text; retain status labels.                                    |
| Unicode width unavailable | ASCII/text labels and non-aligned layout.                                                      |
| Renderer throws           | Emit the semantic buffer through plain output.                                                 |
| Spinner interrupted       | Stop progress UI, preserve failure/limitation, emit final receipt.                             |
| Public decision conflict  | Follow the accepted public Long decision and stop the affected route until a successor exists. |

## Validation

Use the owning repository's focused checks and representative fixtures. At minimum prove:

- plain and enhanced receipts carry identical status, evidence, result, limitation, and next action;
- non-TTY, CI, redirect, unknown, `NO_COLOR`, width-uncertain, and renderer-failure cases produce readable plain output;
- interactive output is not treated as final evidence;
- no ANSI, cursor control, emoji, or optional package is required for semantic correctness; and
- instruction/output cost is compared separately from renderer-generated terminal/log bytes.
