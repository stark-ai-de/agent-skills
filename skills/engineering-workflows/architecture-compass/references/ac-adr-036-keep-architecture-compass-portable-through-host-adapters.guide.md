# AC-ADR-036: Keep Architecture Compass Portable Through Host Adapters

ID: AC-ADR-036
Title: Keep Architecture Compass Portable Through Host Adapters
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: agent-lifecycle
Tags: architecture-compass, portability, host-adapters, capabilities
Applies when: Architecture Compass translates planning, questions, review, permissions, or instruction conventions across execution hosts.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Preserve one Architecture Compass outcome contract and adapt only host collaboration controls.

Variants: [Short](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.short.md) · [Long, canonical](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls Architecture Compass portability.

## Adapter record

| Capability            | Observed host surface | State/evidence | Portable fallback               | Blocks when |
| --------------------- | --------------------- | -------------- | ------------------------------- | ----------- |
| Planning/decision     |                       |                | conversational checkpoint       |             |
| Structured question   |                       |                | explicit textual confirmation   |             |
| Review                |                       |                | read-only findings              |             |
| Read-only enforcement |                       |                | behavioral no-write gate        |             |
| Write permission      |                       |                | explicit permission handoff     |             |
| Agent instructions    |                       |                | repository-supported convention |             |

Keep host product names and exact transition commands in a verified adapter table or eval, not in the portable outcome contract. Test both native and fallback lanes. A prompt that says “enter Plan mode” is only a request; use the host control and wait for observed confirmation when the route requires it.

## Capability state handling

Planning capability and read-only enforcement are independent. Resolve each from observed host state:

| Planning state           | Action for a Plan workflow                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `Active`                 | Continue planning without repository mutation; do not request another Plan transition.         |
| `Available but inactive` | Request the native transition and wait for observed activation.                                |
| `Unavailable`            | Use the documented conversational checkpoint with the same approval and no-write contract.     |
| `Explicitly declined`    | Honor the refusal; use a compatible non-Plan workflow or stop, and do not ask again unchanged. |
| `Indeterminate`          | Stop and verify capability; do not assume the fallback lane.                                   |
| `Not applicable`         | Continue only on a workflow that does not require planning.                                    |

| Read-only state          | Action for `audit` or planning inspection                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `enforced`               | Use the enforced lane and keep mutation outside the turn.                                          |
| `available but inactive` | Activate it before a check that may otherwise write.                                               |
| `unavailable`            | Use a behavioral no-write gate only for commands proven non-mutating.                              |
| `explicitly declined`    | Honor the refusal; proceed only if the same no-write contract remains enforceable, otherwise stop. |
| `indeterminate`          | Stop before any potentially mutating check.                                                        |
| `not applicable`         | Valid only when the selected route does not promise read-only operation.                           |

## Verified host lanes

Select the lane from host_runtime_context before classifying Planning capability. This Guide is the verified adapter table for host product names and exact transition commands; keep them out of the portable Long contract.

- **Codex CLI, IDE, and Codex in ChatGPT desktop:** when exposed, `/plan` selects native planning, `/permissions` selects a separate read-only control, and `/review` is preferred for PR, branch, or diff findings. Request and confirm planning and read-only transitions independently; if Read Only cannot be activated, record the enforcement limitation. The skill does not claim to perform host transitions. Do not require the ChatGPT observation record. Missing slash-menu dump is not proof that `/plan` is absent on this lane.
- **Codex web:** fill the observation record with `surface: web`, `experience: codex`, then use the ordered gates and handoff below. A visible control does not prove CLI-style inline parsing. Keep this lane distinct from ChatGPT web.
- **Cursor:** use the current surface's visible Plan and read-only controls when exposed. `--plan` or a Plan system reminder proves planning capability only, not read-only enforcement. A requested `--sandbox enabled` flag or helper preflight is not enforcement proof when command-level runtime evidence reports the sandbox unavailable or disabled; record that limitation and preserve the behavioral gate. Do not assume a particular command, shortcut, or mode exists across all Cursor versions.
- **Claude Code:** use the current surface's exposed Plan permission mode or transition control. Do not assume a particular command or flag. Host-managed plan artifacts are not target-repository writes.
- **ChatGPT Chat, Work, or mobile:** never report `Planning capability: Unavailable` from ChatGPT identity, missing Codex Plan state, or a missing `/plan` slash. Fill the ChatGPT observation record below, then apply its handoff. `/goal` does not satisfy Plan preflight. The bundled plan skill does not satisfy Plan preflight.
- **Unknown host:** report `Planning capability: Indeterminate`. Ask which host and which Plan control exist, then wait. Do not emit a Codex `/plan` handoff. Do not claim ChatGPT has no Plan.

Preserve the target repository's existing agent-instruction convention. For a new repository with no selected runtime or convention, default to `AGENTS.md`; create Cursor- or Claude-specific instruction files only when the user selects that target.

Plugin availability is a separate capability from Plan detection. The current official [Plugins reference](https://learn.chatgpt.com/docs/plugins) says the Codex IDE extension does not support plugins; this adapter does not promise a plugin browser or plugin installation flow in an IDE. A host may still expose an already-selected skill, but do not infer plugin support from the presence of an IDE.

## ChatGPT and Codex web Plan observation

Use current `host_runtime_context` or `user_report` for composer/control evidence;
this skill does not scrape the composer. Official documentation is discovery
context, never proof of this turn's control, state, or positive absence.

| Field             | Values                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `surface`         | `web`, `desktop`, `mobile`, `unknown`                                                                  |
| `experience`      | `chat`, `work`, `codex`, `unknown`                                                                     |
| `plan_control`    | `slash_plan_command`, `host_mode_toggle`, `structured_tool`, `user_reported`, `none_proven`, `unknown` |
| `plan_state`      | `active`, `inactive`, `unknown`                                                                        |
| `evidence_source` | `host_runtime_context`, `user_report`, `official_docs_for_this_surface`, `none`                        |
| `host_version`    | string or `unknown`                                                                                    |
| `confidence`      | `observed`, `inferred`, `absent`                                                                       |

Use `experience: chat|work` for ChatGPT and `experience: codex` for Codex web.
Include `host_version` in the evidence; `unknown` is valid for that field.
Evaluate the following in order:

1. Before every active, web, non-web, refusal, fallback, or handoff branch,
   missing/contradictory routing fields, `surface: unknown`, or
   `experience: unknown` mean `Planning capability: Indeterminate`. Ask for the
   distinguishable value and wait without a transition handoff.
2. If the user explicitly declines Plan, apply the `Explicitly declined` row
   above before demanding native-control evidence. Preserve the refusal and
   use a compatible non-Plan workflow or stop; do not invent a workflow choice,
   claim Plan technically unavailable, or ask again unchanged. A refusal does
   not exit an active host mode or grant persistence/execution authority.
3. Unless current evidence already proves Plan active, a running turn or
   temporarily disabled composer means `Planning capability: Indeterminate`:
   explain the temporary condition, wait for the turn to finish, and re-observe.
   A busy-turn menu cannot establish `none_proven`. An observed active mode
   still passes the evidence gate below and does not need another transition.
4. Before capability classification, require all seven fields. Missing fields,
   contradictions, `evidence_source: official_docs_for_this_surface`,
   `evidence_source: none`, or `confidence: inferred` or `confidence: absent` mean
   `Planning capability: Indeterminate`. Ask for current-composer evidence and
   wait without fallback or a transition handoff. `none_proven` plus an active
   state is contradictory; `none_proven` plus an unknown state is valid.
5. A positive current enumeration by the host or user establishing
   `plan_control: none_proven` yields `Planning capability: Unavailable` and
   permits the portable in-chat planning fallback, even with
   `plan_state: unknown`. Missing `/plan` alone is not positive enumeration.
6. Observed active Plan yields `Planning capability: Active`: continue read-only
   and do not toggle Plan again.
7. An observed native control with `plan_state: unknown` yields `Planning
capability: Indeterminate`: ask how to confirm its state and wait without
   fallback or a transition handoff.
8. An observed inactive control yields `Planning capability: Available but
inactive`: use its handoff below and wait for confirmed activation on the
   next turn.
9. Remaining uncertainty yields `Planning capability: Indeterminate`, a bounded
   question, and a wait without fallback or a generated transition command.

`/goal`, a bundled plan skill, and prompt text do not activate native Plan.
Do not apply the observation-completeness rule to Codex CLI, IDE, or Codex in
ChatGPT desktop; do apply it to Codex web and every ChatGPT/mobile lane.

### Native transition and skill continuation

- **ChatGPT web Chat/Work:** select the observed `/plan` item or named non-slash
  control in the current composer. Do not generate or copy a `/plan` line.
- **Non-web ChatGPT:** select the observed control. For `slash_plan_command`,
  standalone `/plan` is a copy-ready option. Put the original request in a
  separate continuation prompt unless this composer also proves inline prompt
  support. If the individual skill is not loaded, separately instruct: Open the
  `@` menu and select Architecture Compass. Do not insert `@skill` into the mode
  command or claim `/plan Use @architecture-compass` is official syntax.
- **Codex web:** for an observed inactive `/plan`, select the item or provide
  standalone `/plan`, then continue in Plan mode with `Use $architecture-compass
to continue this request: <original request>`. Combine these into `/plan Use
$architecture-compass to continue this request: <original request>` only if
  this same composer also proves inline argument support. A visible `/plan`
  alone does not establish that parser behavior. Never substitute ChatGPT `@`.
- **Any observed non-slash control:** name that control, request selection, and
  wait; do not invent a slash command.

Every preflight result reports `Planning capability: <state> - <evidence>` and
`Read-only enforcement: <state> - <scope and permission evidence>` separately,
including uncertainty/refusal/transition stops. Use the read-only state table
above. With known writable permissions, report `available but inactive` only
when a read-only control is observed; otherwise use proven `unavailable` or
`indeterminate`. If enforcement is absent/unknown, explicitly retain a
behavioral no-write gate for conversation and proven non-mutating reads; stop
before potentially mutating checks. Never probe enforcement by trying a write
or silently change host permissions. A filesystem sandbox does not prove
restrictions on connector or other external side effects; preserve the selected
workflow's no-mutation contract for those tools as well.

### Official mechanism and evidence boundary

Reviewed 2026-09-08:

- [Developer commands](https://learn.chatgpt.com/docs/developer-commands)
  distinguishes ChatGPT web's composer menu from desktop/CLI commands. Codex CLI
  supports `/plan` with an optional inline prompt; it is temporarily unavailable
  while Codex works, so wait for the running turn to end before transitioning.
- [Desktop slash commands](https://learn.chatgpt.com/docs/reference/slash-commands)
  documents selecting `/plan` to toggle Plan, with availability varying by
  environment/access. It does not establish inline parsing in every composer.
- [Skills & Plugins](https://learn.chatgpt.com/docs/skills-and-plugins)
  distinguishes ChatGPT `@` selection from Codex `$` selection.
- [Plugins](https://learn.chatgpt.com/docs/plugins) requires a new chat/session
  for newly installed bundled skills and excludes plugin installation in the
  IDE extension; standalone skills and Plan availability are separate concerns.
- [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)
  separates sandbox enforcement from approval policy and documents Codex's
  `/permissions` read-only selection. Verify the effective permission state;
  a Plan banner alone proves neither read-only access nor connector restrictions.

These sources do not prove a live account's web/mobile controls. Report
unverified client behavior honestly and recheck actual mode after a transition.

## Index-safe state evidence

Inspect Git state without intentionally refreshing or changing the index:

Use `git --no-optional-locks status --short --untracked-files=all` as the visible index-safe status snapshot command.

```bash
git rev-parse HEAD
git --no-optional-locks status --short --untracked-files=all
git ls-files --stage | sha256sum
git diff --cached --binary | sha256sum
git diff --binary | sha256sum
```

Record staged, unstaged, untracked, ignored, and external state separately. A new index digest or staged-diff digest is material drift: stop and report it rather than staging, unstaging, resetting, or reconstructing concurrent work.

## Bounded continuation examples

| Workflow            | Portable continuation boundary                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `setup`             | Persist only the selected repository-native governance artifacts, validate them, report mappings and dispositions, then stop.            |
| `audit`             | Inspect read-only, return prioritized findings and evidence limits, and do not repair them.                                              |
| `refactor`          | Recheck state and authority, edit only the governed paths, validate the bounded slice, then report.                                      |
| `plan-refactor`     | Approve in Plan mode; after exit, persist only the approved spec plus required ADR/index artifacts, validate and report them, then stop. |
| `plan-run-refactor` | Persist the same approved governance slice, recheck state, then implement only the unchanged approved plan.                              |

## Split check

Compare the candidate host lane against [AC-ADR-035](ac-adr-035-classify-skill-portability-before-choosing-host-variants.short.md). Different button names, metadata files, or question APIs normally remain adapter concerns. Different target state, required evidence, persisted artifact, safety contract, or final execution output can justify a variant.

Use [AC-ADR-037](ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction.short.md) when execution-host routing could change the target contract or when shared gateway extraction is proposed; host adaptation and gateway isolation remain separate decisions.

## Decision lineage

- `adapts`: [ADR-0024](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md).

## Current references

- [Agent Skills specification](https://agentskills.io/specification)
- [ChatGPT and Codex developer commands](https://learn.chatgpt.com/docs/developer-commands)
- [ChatGPT Plugins](https://learn.chatgpt.com/docs/plugins)
- [ChatGPT Skills and Plugins](https://learn.chatgpt.com/docs/skills-and-plugins)
- [AC-ADR-048 workflow routing Guide](ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.guide.md)

## Revisit

Create a successor if Architecture Compass gains a materially different host outcome contract. Refresh adapter evidence whenever a host changes its collaboration or permission surface.
