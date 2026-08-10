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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Preserve one evidence-first receipt contract with plain and enhanced final profiles plus a separate transient progress adapter.

Variants: [Short](ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.short.md) · **Long, canonical** · [Guide](ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts.guide.md)

## Context

AC-ADR-004 makes evidence stage and status the basis of every completion claim, and AC-ADR-050 adds redundant semantic markers for concise human receipts. A rich terminal display can improve scanability, but literal ANSI, emoji, boxes, or a Clack-specific API are not portable model output: chat renderers, CI logs, redirects, accessibility tools, and machine consumers may strip or misinterpret them. Putting a large renderer instruction block in a skill also increases context and output length, while repeated borders and legends can make a short evidence receipt feel expensive.

The useful distinction is between semantic content and presentation capability. The receipt must always say what was checked, at which evidence stage, with what status, result, limitation, and next action. A host adapter may choose how that content is displayed only after observing TTY, CI, redirect, Unicode, color, and renderer capabilities. This decision covers final concise receipts; it does not define a machine schema or a cross-host user preference store.

## Decision

Architecture Compass uses one portable final-receipt contract with two capability-aware receipt profiles and one separate progress adapter:

- `plain` is the universal profile. It uses compact CommonMark or ASCII text, explicit status words, and no required color, emoji, ANSI escape, cursor control, box, or third-party renderer. It is the default for chat, CI, redirects, non-TTY output, unknown hosts, unsupported Unicode width, `NO_COLOR`, and any capability uncertainty.
- `enhanced` is an optional human-terminal profile. On a capable interactive TTY, the adapter may add the semantic markers from AC-ADR-050, restrained color that is never the only status signal, or small framing that improves grouping. The same status, evidence stage, subject, result, limitation, and next action must remain present in text. Decoration is bounded: no repeated legend, duplicated claim, large banner, or decorative block that hides a limitation.
- `interactive` is a transient progress adapter for actual task execution in an interactive TTY, not a receipt profile. It may use a spinner, task log, or cursor updates while work is running, but it never substitutes for the final `plain` or `enhanced` evidence summary. Persisted reports and raw logs contain stable text, not transient cursor control sequences.

The adapter determines the profile from current capability evidence rather than from prompt wording. It considers whether output is a human TTY, CI or redirected stream, whether Unicode and terminal width are reliable, whether color is disabled by `NO_COLOR` or host policy, and whether a host renderer is available and approved. Unknown or contradictory capability falls back to `plain`. A Clack-style package or any other renderer may be used by a host adapter only when already available or separately approved; skills do not require a renderer dependency and model-authored text never needs to imitate a library's API.

The initial skill activation and workflow announcement remain compact and host-neutral. This decision applies to final concise receipts in v1, not every intermediate message. Machine-readable JSON/JSONL output, structured schema fields, and persistent user-defined output-style preferences are deferred until separate decisions define their contract and precedence.

Formatting guidance is deliberately compact. Renderer-generated borders or color add terminal/log bytes, not model tokens, when applied outside the model response; longer skill instructions and repeated verbose formatting requests can add model context and output tokens. Maintainers evaluate plain versus enhanced fixtures using available token counts and deterministic character, byte, line, and duplication measurements. There is no universal numeric token cap in this decision; avoidable bloat, repeated decoration, and unexplained semantic duplication are failures to investigate.

## Invariants

- The portable semantic receipt is authoritative; a profile cannot add, remove, or reinterpret evidence.
- Every material receipt remains understandable when emoji, color, framing, or terminal controls are stripped.
- `plain` is safe for non-TTY, CI, redirects, unknown hosts, `NO_COLOR`, and uncertain Unicode/width support.
- Color never carries the only meaning, and accessibility or repository-native conventions may require `plain` even on a TTY.
- `interactive` progress is ephemeral and never represents final verification; final reports use stable text.
- ANSI escapes, cursor controls, emojis, and decorative framing are absent from machine data, commands, filenames, raw logs, persisted receipts, and dense tables unless a separate explicit schema permits them.
- A renderer cannot grant execution, network, installation, publication, deployment, or persistence authority.
- Formatting instructions remain short enough that the semantic receipt, not style prose, dominates the model context.
- Capability uncertainty is a safe fallback condition, not permission to guess `enhanced` support.

## Alternatives

- Chosen: capability-aware `plain` and `enhanced` receipt profiles plus a separate `interactive` progress adapter over one evidence-first semantic receipt. This creates a recognizable, polished experience where it is safe while preserving portable fallback and low context cost.
- Rejected: require literal Clack, ANSI, boxes, or emoji in every final response. This breaks chat, CI, accessibility, machine, and unknown-host surfaces and makes a library API part of the skill contract.
- Rejected: use one rich terminal style everywhere. Non-TTY and redirected output become noisy or misleading, and style cannot be validated independently from evidence.
- Rejected: add a mandatory shared renderer package in v1. Dependency and availability cost are not justified before the portable contract and host adapters prove need.
- Rejected: enforce a universal hard token budget now. Model/tokenizer and host behavior vary; comparative overhead and compact guidance expose bloat without freezing a misleading number.

## Consequences

- Benefit: Architecture Compass offers adaptive, evidence-first receipts that feel polished on capable terminals and remain honest in plain logs and chat.
- Tradeoff: Host adapters must inspect capability and maintain plain fallbacks, and evaluation needs paired fixtures rather than one screenshot.
- Risk: Decoration can slowly expand. Compact instruction text, bounded profiles, byte/line/token comparisons, and explicit no-legend rules keep the differentiator from becoming context or log bloat.
- Risk: A symbol or color can be rendered incorrectly. Redundant text and automatic plain fallback preserve meaning.

## Acceptance

- Paired fixtures produce semantically identical `plain` and `enhanced` receipts for verified, informational, skipped, unavailable, stale, and limited evidence.
- Removing markers, color, framing, and ANSI controls leaves a complete textual receipt with explicit status and evidence boundaries.
- Non-TTY, CI, redirect, unknown-host, `NO_COLOR`, and Unicode-width uncertainty select `plain`.
- `interactive` progress never appears as final persisted evidence and leaves a stable final receipt.
- A renderer-unavailable path works without installing a package or changing the core receipt contract.
- Machine data, commands, filenames, raw logs, and persisted receipts remain decoration-free.
- Comparative evaluation records model-token overhead when measurable and byte/character/line/duplication overhead otherwise; no unexplained repeated decoration remains.
- Initial activation remains compact, and no user preference or JSON/JSONL behavior is inferred from this ADR.
