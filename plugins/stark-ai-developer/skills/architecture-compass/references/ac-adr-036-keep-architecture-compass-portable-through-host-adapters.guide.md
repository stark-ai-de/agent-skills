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

| Planning state           | Action for a Plan workflow                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `Active`                 | Continue planning without repository mutation; do not request another Plan transition.                                             |
| `Available but inactive` | Recommend native Plan for substantial ambiguous work; continue safe discovery/conversation. Honor an explicit native-mode request. |
| `Unavailable`            | Use the documented conversational checkpoint with the same approval and no-write contract.                                         |
| `Explicitly declined`    | Honor the refusal without repeating it; continue the same safe conversational planning contract.                                   |
| `Indeterminate`          | Report uncertainty; continue no-write conversation and proven reads. Resolve actual mode and permission before any write.          |
| `Not applicable`         | Continue only on a workflow that does not require planning.                                                                        |

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

- **Codex CLI, IDE, and Codex in ChatGPT desktop:** when exposed, `/plan` selects native planning, `/permissions` selects a separate read-only control, and `/review` is preferred for PR, branch, or diff findings. When needed, request and confirm planning and read-only transitions independently; if Read Only cannot be activated, record the enforcement limitation. The skill does not claim to perform host transitions. Do not require the ChatGPT observation record. Missing slash-menu dump is not proof that `/plan` is absent on this lane.
- **Codex web:** fill the observation record with `surface: web`, `experience: codex`, then use the ordered gates and handoff below. A visible control does not prove CLI-style inline parsing. Keep this lane distinct from ChatGPT web.
- **Cursor:** use the current surface's visible Plan and read-only controls when exposed. `--plan` or a Plan system reminder proves planning capability only, not read-only enforcement. A requested `--sandbox enabled` flag or helper preflight is not enforcement proof when command-level runtime evidence reports the sandbox unavailable or disabled; record that limitation and preserve the behavioral gate. Do not assume a particular command, shortcut, or mode exists across all Cursor versions.
- **Claude Code:** use the current surface's exposed Plan permission mode or transition control. Do not assume a particular command or flag. Host-managed plan artifacts are not target-repository writes.
- **ChatGPT Chat, Work, or mobile:** never report `Planning capability: Unavailable` from ChatGPT identity, missing Codex Plan state, or a missing `/plan` slash. Fill the ChatGPT observation record below, then apply its handoff. `/goal` does not satisfy Plan preflight. The bundled plan skill does not satisfy Plan preflight.
- **Unknown host:** report `Planning capability: Indeterminate`. Use the no-write conversational lane. Ask about a host/control only when it is necessary for an actual transition or write boundary. Do not emit a Codex `/plan` handoff. Do not claim ChatGPT has no Plan.

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
Use the record only to resolve a material capability or an actual transition. Do not turn seven fields into mandatory interview questions before safe discovery. An unknown host version is valid.

- Current observed active Plan yields `Active`; a busy composer does not invalidate it.
- An observed inactive control yields `Available but inactive`. Recommend a transition when helpful; safe planning conversation can continue. If the user explicitly requested native Plan, retain that pending request until activation is observed.
- A positive current enumeration proving no control yields `Unavailable`. Product identity, missing `/plan`, documentation alone, or a temporarily busy composer do not prove absence.
- Missing or contradictory evidence, unknown routing fields, or an observed control whose state is unknown yields `Indeterminate`. Keep the same no-write conversation, without inventing a control or transition command. Resolve only facts needed for a requested transition or later write.
- An explicit refusal yields `Explicitly declined`, without implying mode exit or write permission. Do not ask the same unchanged recommendation again.

`/goal` does not satisfy Plan preflight. The bundled plan skill does not satisfy Plan preflight. Neither activates native Plan; permissible read-only discovery and conversation can still continue. A transition is not needed merely to improve the evidence record. A busy composer may require waiting for the turn to finish before a chosen transition, not before independent no-write work.

Do not apply this ChatGPT/Codex-web observation record to Codex CLI, IDE, or Codex in ChatGPT desktop. Keep capability classification distinct from permission and actual execution state.

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

When material, a preflight result reports `Planning capability: <state> - <evidence>` and
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

Host mechanism sources reviewed 2026-09-08; the following lifecycle-specific sources were rechecked on 2026-09-21:

- [Developer commands](https://learn.chatgpt.com/docs/developer-commands)
  distinguishes ChatGPT web's composer menu from desktop/CLI commands. Codex CLI
  supports `/plan` with an optional inline prompt; it is temporarily unavailable
  while Codex works, so wait for the running turn to end before transitioning.
- [Claude permission modes](https://code.claude.com/docs/en/permission-modes) distinguishes leaving Plan via a mode switch from accepting a plan; approval can also transition permissions. Reuse its content approval only for the scope actually confirmed.
- [Cursor Plan Mode](https://cursor.com/docs/agent/plan-mode) recommends planning for complex or unclear work and separates host-managed plans from saving to the workspace. A host plan artifact alone does not prove repository-spec persistence.

The following adapter references retain their 2026-09-08 review date:

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

## Questions and approval reuse

Ask only unresolved material questions after inspecting discoverable facts and existing answers. Prefer exposed structured question controls where suitable; missing tools use a concise conversational checkpoint. An asynchronous question permits only independent authorized work while its required answer is pending. Silence, timeout, and preselected options never establish consent.

Prepare the complete reviewable result and named persistence scope before the final checkpoint. If the native approval confirms both, use it as the same approval. If it changes only mode, preserve any existing content approval and wait solely for the transition. Do not request approval again after mode exit for the same unchanged result. Recheck target state and permissions before writing; material drift requires resolving only the affected change. Proposed ADR persistence remains distinct from decision acceptance. Record what was approved separately from what was actually persisted.

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

| Workflow            | Portable continuation boundary                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup`             | Persist only the selected repository-native governance artifacts, validate them, report mappings and dispositions, then stop.                                                 |
| `audit`             | Inspect read-only, return prioritized findings and evidence limits, and do not repair them.                                                                                   |
| `refactor`          | Recheck state and authority, edit only the governed paths, validate the bounded slice, then report.                                                                           |
| `plan-refactor`     | Approve in native or conversational planning; after any required exit, persist only the approved spec plus required ADR/index artifacts, validate and report them, then stop. |
| `plan-run-refactor` | Persist the same approved governance slice, recheck state, then implement only the unchanged approved plan.                                                                   |

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
- [AC-ADR-064 workflow routing Guide](ac-adr-064-preserve-approved-scope-through-capability-aware-planning.guide.md)

## Revisit

Create a successor if Architecture Compass gains a materially different host outcome contract. Refresh adapter evidence whenever a host changes its collaboration or permission surface.
