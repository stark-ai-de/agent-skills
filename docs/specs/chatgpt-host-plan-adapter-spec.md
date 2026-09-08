---
title: "ChatGPT host Plan-mode adapter"
slug: "chatgpt-host-plan-adapter"
artifact_path: "docs/specs/chatgpt-host-plan-adapter-spec.md"
mode: "deep"
status: "accepted"
created: "2026-08-21"
updated: "2026-09-08"
phases: ["host-adapters", "evaluation", "component-impact"]
---

# ChatGPT host Plan-mode adapter

## Goal

Make Architecture Compass and Codex Spec Interviewer use current host evidence
for native Plan transitions, conversational fallback, and independent read-only
enforcement. Keep the four CHAT+CODEX starter prompts product-neutral.

An installed skill supplies instructions; it does not activate a client mode.
The user selects an available native control, and the next turn confirms the
actual mode. A documented control is a discovery hint, not proof of this
account's current composer or permission state.

## Scope

- Keep one portable skill per workflow, with the full Architecture Compass
  adapter in its AC-ADR-036 Guide and a small local adapter in Codex Spec
  Interviewer's `references/workflow-details.md`.
- Cover ChatGPT Chat/Work on web, desktop, and mobile, and the distinct Codex
  web lane. Preserve Codex CLI/IDE/desktop, Cursor, and Claude lifecycle rules.
- Fix positive-absence precedence, explicit-refusal precedence, and independent
  read-only enforcement reporting.
- Refresh handoffs from official documentation and cover temporary command
  unavailability while a turn is running.
- Retain product-neutral starter prompts for Architecture Compass, Codex Spec
  Interviewer, Draw.io Diagrams, and Animated README Logo, together with the
  complete-known-skill-token guard and its currency/prefix regression cases.
- Integrate current canonical icons and release contracts, update affected
  skill and plugin versions, and regenerate projections and listing artifacts.

No new repository ADR, shared runtime gateway, ChatGPT-specific skill fork,
CLI configuration mutation, or automatic mode-switching tool is introduced.
CODEX-only skill product policies and unrelated skills remain outside scope.
Live client trials, Git publication, portal upload, deployment, tags, and GitHub
Releases require their own evidence and applicable authority.

## Governing decisions

- [ADR-0024](../adrs/0024-keep-architecture-compass-portable-with-host-mode-adapters.short.md) ([Long, canonical](../adrs/0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md) · [Guide](../adrs/0024-keep-architecture-compass-portable-with-host-mode-adapters.guide.md))
  and AC-ADR-035/036 preserve portable outcomes through host adapters.
- [ADR-0028](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.short.md) ([Long, canonical](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md) · [Guide](../adrs/0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.guide.md))
  keeps the small local matrices independent.
- [ADR-0030](../adrs/0030-separate-public-contracts-from-private-provenance.short.md) ([Long, canonical](../adrs/0030-separate-public-contracts-from-private-provenance.long.md) · [Guide](../adrs/0030-separate-public-contracts-from-private-provenance.guide.md))
  keeps public contracts separate from private provenance.
- [ADR-0038](../adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.short.md) ([Long, canonical](../adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md) · [Guide](../adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.guide.md))
  preserves workflow selection and bounded authority.
- [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md))
  selects validation by changed contracts and evidence stage.
- [ADR-0043](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md))
  preserves canonical skill metadata and generated package boundaries.
- [ADR-0050](../adrs/0050-generate-release-prs-and-protect-publication.short.md) ([Long, canonical](../adrs/0050-generate-release-prs-and-protect-publication.long.md) · [Guide](../adrs/0050-generate-release-prs-and-protect-publication.guide.md))
  supersedes the original feature-PR root release preparation. This change
  updates component impact only; Release Please owns the root release manifest,
  package version, and changelog. No root release number is selected here.
- AC-ADR-048/052 retain approved repository-native artifacts and Plan-mode exit
  before persistence. A chat without repository access reports persistence
  blocked and returns the save-ready artifact rather than inventing storage.

Accepted Short/Long decisions and locks remain unchanged. Adapter guidance and
this working spec are updated under those decisions; no successor is required.

## Official source challenge

Reviewed on 2026-09-08:

| Source                                                                                | Established behavior                                                                                                                                                                          | Adapter consequence                                                                                                                            |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [Developer commands](https://learn.chatgpt.com/docs/developer-commands)               | ChatGPT web uses its current composer menu; the desktop/CLI command set does not apply to it. Codex CLI accepts `/plan` with optional inline text, and temporarily disables it while working. | Observe each composer; wait for a busy CLI turn to finish before judging absence. Do not generate a ChatGPT web `/plan` command.               |
| [Desktop slash commands](https://learn.chatgpt.com/docs/reference/slash-commands)     | Users select commands in the composer; `/plan` toggles Plan and availability varies by environment/access.                                                                                    | Select the native control and confirm the next turn's mode. Do not infer that a toggle accepts CLI inline arguments.                           |
| [Skills & Plugins](https://learn.chatgpt.com/docs/skills-and-plugins)                 | ChatGPT supports `@` skill mentions; Codex supports `$` skill mentions.                                                                                                                       | Keep skill selection separate from native mode selection and keep shared starter prompts neutral.                                              |
| [Plugins](https://learn.chatgpt.com/docs/plugins)                                     | Bundled skills become available in a new chat/session after installation; the IDE extension does not support plugin installation.                                                             | Do not mistake stale discovery or plugin availability for Plan capability; standalone IDE skills remain a distinct installation path.          |
| [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security) | Sandbox mode enforces command access; approval policy governs consent. Codex supports a separate read-only permission setting.                                                                | Report enforcement independently from Plan. Filesystem restrictions do not establish restrictions on connector or other external side effects. |

These pages do not prove Plan availability or inline-command parsing in every
Codex web, ChatGPT web, mobile, or desktop account. Use observed controls and a
separate continuation prompt where inline parsing is unverified. Documentation
alone cannot establish `Active`, `Unavailable`, or enforced read-only access.

## Observation and decision contract

For ChatGPT and Codex web, keep these existing observation fields:

| Field             | Values                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `surface`         | `web`, `desktop`, `mobile`, `unknown`                                                                  |
| `experience`      | `chat`, `work`, `codex`, `unknown`                                                                     |
| `plan_control`    | `slash_plan_command`, `host_mode_toggle`, `structured_tool`, `user_reported`, `none_proven`, `unknown` |
| `plan_state`      | `active`, `inactive`, `unknown`                                                                        |
| `evidence_source` | `host_runtime_context`, `user_report`, `official_docs_for_this_surface`, `none`                        |
| `host_version`    | string or `unknown`                                                                                    |
| `confidence`      | `observed`, `inferred`, `absent`                                                                       |

Resolve outcomes in this order:

1. Identify surface and experience. Missing, unknown, or contradictory routing
   evidence is `Planning capability: Indeterminate`; ask for the missing
   distinction and wait before any active, fallback, or handoff branch.
2. In Codex Spec Interviewer, honor an explicit refusal after Plan was
   recommended as `Planning capability: Explicitly declined`. Record the user
   statement separately from native-control evidence, continue conversationally,
   and do not request Plan again. Missing control/state evidence must not mask
   a refusal after the routing fields are known. A refusal does not switch off
   an active host mode or authorize persistence while Plan remains active.
3. Unless current evidence already proves Plan active, a running turn or
   temporarily disabled composer requires waiting for a usable native control
   and re-observing it. Temporary absence is not `none_proven` and does not
   permit fallback. An observed active mode still passes the evidence gate
   below and does not need another transition.
4. For capability classification, require the complete observation record.
   Missing fields, contradictory evidence, documentation-only sources,
   `evidence_source: none`, or inferred/absent control/state evidence mean
   `Indeterminate`. `host_version: unknown` alone is valid.
5. A positive current enumeration proving `plan_control: none_proven` yields
   `Unavailable` and permits the behavioral conversational fallback.
   `plan_state: unknown` is valid when no native Plan control exists; it must
   not be caught by an unknown-state stop. An active state with `none_proven`
   is contradictory and fails the preceding evidence gate.
6. Current host mode evidence proving Plan active yields `Active`; continue
   read-only without toggling the mode again.
7. An observed native control with unknown state yields `Indeterminate`;
   ask how to confirm the state and wait without a transition handoff.
8. An observed inactive control yields `Available but inactive`; request that
   specific control, wait, and confirm active state on the next turn.
9. Any remaining unknown control/state yields `Indeterminate` without fallback.

Only definitive unavailability or the workflow's documented refusal route
permits fallback. `/goal`, a skill named `plan`, and prompt text requesting Plan
are not native mode evidence. Do not weaken the existing Codex CLI/IDE/desktop
indeterminate transition contract.

## Handoffs and enforcement

- ChatGPT web Chat/Work: select the observed composer item or named non-slash
  control. Never generate a copy-ready `/plan` line for this route.
- ChatGPT desktop/mobile: when `/plan` is observed and inactive, select it or
  provide standalone `/plan`; use a separate continuation prompt unless the
  current host explicitly proves inline prompt support. If needed, separately
  select the individual skill through the `@` menu.
- Codex CLI: the documented combined form is `/plan Use $<skill> to continue
this request: <original request>`. Wait for the running turn to finish before
  requesting the transition; the next turn must confirm Plan active.
- Codex web: an observed slash control permits selection/standalone `/plan`,
  followed by `Use $<skill> to continue this request: <original request>` in
  Plan mode. Combine the command and prompt only when this composer's inline
  argument support is also observed. Other observed controls are named directly.
- Existing Codex IDE/desktop transition contracts remain in their native lane;
  never infer their capability from ChatGPT web or use ChatGPT `@` syntax there.

Every preflight return reports both `Planning capability: <state> - <evidence>`
and `Read-only enforcement: <state> - <scope and evidence>`.
Use the existing enforcement states: `enforced`, `available but inactive`,
`unavailable`, `explicitly declined`, `indeterminate`, or `not applicable`.
`not applicable` is invalid for a read-only interview or planning inspection.

Report `enforced` only from current permission/runtime evidence covering the
relevant filesystem or tool scope. If writable permissions are known, report
`available but inactive` only when a read-only control is observed; otherwise
use `unavailable` or `indeterminate` according to evidence. Unknown enforcement
may still allow conversation and proven non-mutating reads under an explicit
behavioral no-write gate; stop before potentially mutating checks. Connector
and other external mutations remain prohibited by the workflow regardless of
filesystem enforcement. Do not probe enforcement by attempting a write or
silently edit the host's permissions/configuration.

## Metadata and component impact

- All four CHAT+CODEX `default_prompt` values remain useful after selection,
  contain neither a leading `/plan` nor a complete known `$<skill>` invocation,
  and preserve their finite workflow options and product policies.
- Known public/incubator invocations are rejected; currency, unknown tokens,
  embedded text, and known-name prefixes remain valid prompt prose.
- Increase affected skill patch versions from the current base; advance plugin
  `1.1.0` to `1.1.1`, update listing/badge/current archive guidance, and regenerate
  the worksheet and portable projection from canonical inputs.
- Preserve current icons, historical release evidence, and root release files.
  OpenAI archives remain ignored build artifacts, not committed adapters.

## Validation and completion

Add full-record cases for ChatGPT proven absence with unknown state, refusal
without control evidence, the unknown-surface/experience refusal stop, active
Plan with independently unknown/enforced/writable filesystem permissions, busy
composer handling (including an already-active mode), and Codex web slash
selection without assumed inline parsing.
Retain the existing desktop, web, mobile, docs-only, `/goal`, `$plan`, and native
Codex fallback cases for both skills.

Run the changed-contract checks and local aggregate required for component
release impact:

```bash
npm run sync:agent-plugin
npm run generate:openai-worksheet
npm run validate:skills
npm run validate:architecture-compass
npm run validate:projections
npm run validate:plugin-evals
npm run validate:openai
npm run release:intent -- --base-ref main
npm run validate
npm run package:openai-plugin
npm run validate:release-proof
pnpm format:check
git diff --check
```

Static fixture/inventory validation proves contract structure and artifact
coherence, not repeated live ChatGPT behavior. Hosted CI applies only to the
published revision; local results do not establish portal or client success.

Done when the ordered gates and independent enforcement outputs are consistent
in canonical skills and projections, regression cases capture the three review
findings and researched command constraints, current-base release checks pass,
and review reports no remaining actionable gap in this scope. If live client
access is unavailable, report that limit and the exact documented/manual
transition to verify without claiming live success.

## Rollout and rollback

Review the component change under ADR-0050. Root release preparation remains a
separate generated PR. Reverting this feature requires a reviewed forward change
with component version increments; do not rewrite published release history.
