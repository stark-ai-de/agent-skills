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
- **Codex web:** treat the current Codex web composer as an observation-gated lane. The official client documentation establishes that Codex web exists, but does not establish the current composer’s Plan control or state. Fill the web observation record below with `experience: codex`. An observed inactive `/plan` supports `Available but inactive` and a copy-ready `/plan Use $<skill> to continue this request: <original>` handoff; an observed non-slash control is described and awaited; positive enumeration proving no Plan control supports `Unavailable` and the portable fallback; missing or contradictory evidence is `Indeterminate` with no fallback or handoff. Do not apply the ChatGPT web no-generated-slash rule to Codex web.
- **Cursor:** use the current surface's visible Plan and read-only controls when exposed. `--plan` or a Plan system reminder proves planning capability only, not read-only enforcement. A requested `--sandbox enabled` flag or helper preflight is not enforcement proof when command-level runtime evidence reports the sandbox unavailable or disabled; record that limitation and preserve the behavioral gate. Do not assume a particular command, shortcut, or mode exists across all Cursor versions.
- **Claude Code:** use the current surface's exposed Plan permission mode or transition control. Do not assume a particular command or flag. Host-managed plan artifacts are not target-repository writes.
- **ChatGPT Chat, Work, or mobile:** never report `Planning capability: Unavailable` from ChatGPT identity, missing Codex Plan state, or a missing `/plan` slash. Fill the ChatGPT observation record below, then apply its handoff. `/goal` does not satisfy Plan preflight. The bundled plan skill does not satisfy Plan preflight.
- **Unknown host:** report `Planning capability: Indeterminate`. Ask which host and which Plan control exist, then wait. Do not emit a Codex `/plan` handoff. Do not claim ChatGPT has no Plan.

Preserve the target repository's existing agent-instruction convention. For a new repository with no selected runtime or convention, default to `AGENTS.md`; create Cursor- or Claude-specific instruction files only when the user selects that target.

Plugin availability is a separate capability from Plan detection. The current official [Plugins reference](https://learn.chatgpt.com/docs/plugins) says the Codex IDE extension does not support plugins; this adapter does not promise a plugin browser or plugin installation flow in an IDE. A host may still expose an already-selected skill, but do not infer plugin support from the presence of an IDE.

## ChatGPT and Codex web Plan observation

A skill cannot scrape the ChatGPT composer. Use only `host_runtime_context`, `user_report`, or `official_docs_for_this_surface`. Official docs may raise that a control can exist, but they cannot establish the current composer, Plan state, or `none_proven` result. Documentation-only evidence is context, not current-turn capability evidence.

Fill this record before classifying Planning capability on the ChatGPT or Codex web lane:

| Field             | Values                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `surface`         | `web` \| `desktop` \| `mobile` \| `unknown`                                                                      |
| `experience`      | `chat` \| `work` \| `codex` \| `unknown`                                                                         |
| `plan_control`    | `slash_plan_command` \| `host_mode_toggle` \| `structured_tool` \| `user_reported` \| `none_proven` \| `unknown` |
| `plan_state`      | `active` \| `inactive` \| `unknown`                                                                              |
| `evidence_source` | `host_runtime_context` \| `user_report` \| `official_docs_for_this_surface` \| `none`                            |
| `host_version`    | string or `unknown`                                                                                              |
| `confidence`      | `observed` \| `inferred` \| `absent`                                                                             |

`slash_plan_command` is one evidence field, not the definition of native Plan. Missing `/plan` does not set `plan_control` to `none_proven`. ChatGPT Work on web or desktop may expose a non-slash Plan control. Codex web is a separate experience even though it uses the web surface; an official client listing does not prove a current Plan control. Mobile stays in this matrix; an incomplete record is `Indeterminate`, not fallback.

On this lane only, missing required fields, `evidence_source: official_docs_for_this_surface`, `evidence_source: none`, contradictory fields, or `confidence: inferred` for `plan_control` or `plan_state` means `Planning capability: Indeterminate`: ask whether Plan is available and how to enter it, then wait. Do not fall back. Do not say Plan is unavailable. A current `host_runtime_context` or `user_report` may establish observed control/state evidence.

`none_proven` requires a positive current enumeration from `host_runtime_context` or `user_report` (the host listed tools/commands without a Plan control, or the user answered that no Plan control is present). Silence and official documentation are not proof.

When reporting Planning capability on this lane, include `host_version` in the evidence. Do not use `host_version` or official docs to prove `Active`, `Available but inactive`, or `Unavailable`.

Handoff targets the individual skill (display name Architecture Compass), not the plugin bundle:

- If Plan is observed active: report `Planning capability: Active` and continue read-only.
- If a native Plan control is observed but `plan_state` is `unknown`: report `Planning capability: Indeterminate`, ask whether Plan is active and how to confirm it, then wait. Do not fall back or emit a handoff from an unknown state.
- If `surface` is `web`, `experience` is `chat` or `work`, and `/plan` is observed but inactive: report `Planning capability: Available but inactive`, tell the user to select the observed `/plan` item in the current composer, and wait. Do not generate or copy a `/plan` line for ChatGPT web Chat or Work.
- If `surface` is `web`, `experience` is `codex`, and `/plan` is observed but inactive: report `Planning capability: Available but inactive`, emit copy-ready `/plan Use $<skill> to continue this request: <original>`, and wait. This handoff is permitted only because the current Codex web composer exposed `/plan`; do not substitute ChatGPT `@` syntax.
- If `surface` is `web`, `experience` is `codex`, and a non-slash Plan control is observed and inactive: report `Planning capability: Available but inactive`, describe that observed control, and wait. Do not emit a generated slash command.
- If `surface` is `web`, `experience` is `codex`, and the current composer positively enumerates controls without Plan: report `Planning capability: Unavailable` and use the portable in-chat planning fallback.
- If `/plan` is observed and inactive on a non-web ChatGPT surface: report `Planning capability: Available but inactive`, emit copy-ready `/plan` with optional inline continuation text of the original request, and wait. Do not insert `@skill` into that command. If the skill is not already loaded, add a separate UI instruction: Open the `@` menu and select Architecture Compass.
- If a non-slash Plan control is observed and inactive: report `Planning capability: Available but inactive`, describe that control by the observed or user-reported name, and wait. Do not emit a slash Plan command.
- If `plan_control` is `none_proven` from a positive enumeration: report `Planning capability: Unavailable` and use the portable in-chat planning fallback.
- If `/plan` is not observed, no other Plan control is proven, and `none_proven` is not established: report `Planning capability: Indeterminate`, ask whether Plan is available and how to enter it, then wait. Do not emit a slash Plan command.
- Do not claim `/plan Use @architecture-compass` is official ChatGPT syntax.

Do not apply this observation-completeness rule to Codex CLI, Codex IDE, or Codex in the ChatGPT desktop app. Do apply it to Codex web, and do not infer Codex web behavior from the desktop, CLI, or IDE lane.

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
