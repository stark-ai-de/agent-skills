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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Preserve one semantic receipt with plain and enhanced final profiles plus a separate transient progress adapter, without requiring emoji, color, ANSI, or Clack.

Variants: [Short](internal-adr-002-select-capability-aware-receipt-renderers.short.md) · **Long, canonical** · [Guide](internal-adr-002-select-capability-aware-receipt-renderers.guide.md)

## Context

Architecture Compass reports staged evidence and bounded outcomes across Codex, Claude, Cursor, generic chat, CI, redirected logs, and interactive terminals. These environments differ in TTY state, color policy, Unicode width, cursor support, and available renderer libraries. Literal Clack calls, ANSI sequences, boxes, or emoji in model-authored text would make a report noisy or unreadable in some environments, and a style instruction large enough to enforce decoration can consume context and output tokens without improving evidence.

The public contract already owns semantic evidence and portability. [AC-ADR-004](../ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md) requires honest status and staged proof; [AC-ADR-033](../ac-adr-033-choose-portable-dependency-light-skill-helpers.long.md) discourages unnecessary runtime dependencies; [AC-ADR-036](../ac-adr-036-keep-architecture-compass-portable-through-host-adapters.long.md) keeps presentation differences in host adapters; [AC-ADR-038](../ac-adr-038-gate-optional-capabilities-and-tool-side-effects.long.md) requires safe fallback for optional capabilities; and [AC-ADR-053](../ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.long.md) defines the public final-receipt profiles and separate progress adapter this mechanic realizes. This internal record defines the implementation selection sequence only. It does not create a public output schema, machine channel, user preference store, or new workflow.

If presentation changes the public evidence contract, requires a stable machine-readable channel, or introduces a mandatory renderer dependency, stop and propose the appropriate exposed ADR or repository decision. Do not extend this internal record into a public policy by implication.

## Decision

Implement one semantic receipt, choose a final-receipt profile from observed capability, and resolve transient progress separately:

| Route         | Kind             | Select when                                                                                               | Allowed presentation                                                                    | Required behavior                                                                                                                      |
| ------------- | ---------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plain`       | Receipt profile  | Chat, CI, redirect, non-TTY, unknown host, `NO_COLOR`, Unicode/width uncertainty, or any renderer failure | Compact Markdown/ASCII and textual labels                                               | Default and complete; no decoration is required for comprehension.                                                                     |
| `enhanced`    | Receipt profile  | Human-facing TTY with confirmed Unicode/color/framing capability and no explicit plain-output request     | The same text plus bounded symbols, optional color, and optional box/framing            | Symbols and color are redundant; do not repeat legends, duplicate status, or hide limitations.                                         |
| `interactive` | Progress adapter | Actual in-progress TTY work where a spinner/task log improves progress feedback                           | Host-side spinner/task rendering, including a Clack-like adapter when already available | Never replace the final receipt, staged evidence, or failure explanation. Fall back to `plain` when progress controls are unavailable. |

The semantic receipt contains the fields selected by the owning public workflow—at minimum status, evidence stage, subject, result, limitation, and next action. Each status must be written in text even when an enhanced marker is present. A marker such as `✅`, `ℹ️`, `⏭️`, or `⚠️` may reinforce the text when the host supports it, but it is never the sole carrier of meaning and its absence does not change the claim.

Capability resolution observes the current output surface rather than trusting prompt text. Consider TTY state, CI or redirect signals, explicit color policy such as `NO_COLOR`, Unicode/width reliability, host renderer availability, and whether the output is final or progress-only. Unknown or conflicting signals select `plain`. A renderer may decorate a semantic buffer at the host boundary, but model-authored final text must not require ANSI escape sequences, cursor controls, a specific terminal width, a specific emoji font, or the presence of `@clack/prompts`.

Keep the format compact. Do not add a large style manifesto to the runtime instructions, emit a legend for a one-line receipt, repeat borders for every row, or restate the same status in marker, heading, and prose. Measure model-token cost separately from renderer-generated terminal/log bytes: concise instructions and semantic receipts protect model context, while host decoration remains an optional byte-level presentation concern.

Machine-oriented JSON/JSONL output, persisted user-defined style preferences, and a mandatory shared renderer package are deferred. Any of those changes requires a new public decision and compatibility evidence.

## Invariants

- The semantic receipt is authoritative; presentation adapters cannot change status, evidence stage, result, limitation, next action, artifact identity, or write authority.
- Every enhanced or interactive representation has a complete plain equivalent that is safe for chat, CI, redirects, logs, and copy/paste.
- Color and symbols are never the only evidence of success, failure, skipped work, staleness, or limitation.
- `NO_COLOR`, non-TTY, CI, redirected output, uncertain width, unknown host, and renderer failure select `plain` or a text-only equivalent.
- Interactive progress is ephemeral and subordinate to the final receipt; a spinner completion state is not validation evidence.
- Optional renderer packages remain host adapters. A missing package cannot block a semantic final report and cannot justify a new dependency without the public dependency decision.
- Internal profile names are implementation labels, not user-selectable public workflows or a hidden permission surface.
- If this record conflicts with an accepted public Long decision, the public decision wins and the affected route stops until a successor is accepted.

## Failure handling

- **Non-TTY, CI, redirect, or unknown host:** emit `plain`; do not force color, cursor control, box borders, or a spinner.
- **`NO_COLOR` or explicit plain-output request:** remove color and enhanced styling while retaining textual status and evidence.
- **Unicode or width uncertainty:** use ASCII/text labels and avoid alignment that depends on emoji width.
- **Renderer unavailable or throws:** preserve the semantic buffer and emit it through the plain path; report the presentation limitation only when it helps the user understand the receipt.
- **Conflicting capability signals:** choose the safer plain profile and record the observed uncertainty for evaluation; never infer `enhanced` from an instruction alone.
- **Semantic rendering error:** stop the affected final report if status, evidence stage, limitation, or next action would be lost. Do not replace an unknown result with a success marker.
- **Output overhead regression:** remove duplicated decoration or shorten instructions before adding a hard numeric budget; if a stable budget becomes necessary, propose it as a separate public decision.

## Alternatives

- **Chosen: semantic-first, capability-aware profiles.** It provides a polished TTY path while preserving a compact, host-neutral receipt everywhere else.
- **Rejected: require literal Clack, ANSI, boxes, or emoji in every final report.** Model-authored output is consumed outside capable terminals and would become fragile, inaccessible, and expensive in context.
- **Rejected: install one shared renderer for every host.** The public dependency and portability contracts favor thin adapters and safe fallback; hosts may already provide different renderers.
- **Rejected: make formatting a new public workflow or mandatory user choice.** Presentation is an internal capability route unless it changes the outcome or authority.

## Consequences

- **Benefit:** Human terminals can receive concise, recognizable receipts while the same semantic content remains reliable in chat, CI, logs, and unknown hosts.
- **Tradeoff:** Maintainers must test profile selection and plain fallbacks across representative output surfaces.
- **Risk:** Overly enthusiastic decoration can increase context or output size and distract from evidence. Keep runtime instructions small, avoid repeated decoration, and compare plain/enhanced fixtures during evaluation.

## Acceptance

- The same mixed receipt (verified, informational, skipped, and limited results) has identical status and evidence in `plain` and `enhanced` profiles.
- Removing symbols, color, borders, or ANSI sequences leaves a complete readable report with explicit textual status and limitations.
- Non-TTY, CI, redirect, unknown-host, `NO_COLOR`, width-uncertain, and renderer-failure fixtures select the plain path.
- Interactive progress output never substitutes for the final staged-evidence receipt.
- A renderer package is optional; its absence does not block final text or trigger installation without separate approval.
- A comparison fixture records model instruction/output size separately from rendered terminal/log bytes and flags duplicated legends or decorative bloat.
