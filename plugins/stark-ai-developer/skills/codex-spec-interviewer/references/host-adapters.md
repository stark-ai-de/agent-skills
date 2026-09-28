# Execution-host adapters

Load this reference only when a native control or transition matters. The skill's target runtime does not determine the execution host. A Claude Code-ready spec can be interviewed in Codex without Claude-only controls, and vice versa.

## Capability evidence

Use current runtime context and exposed tools first. A product label, model name, documentation page, `/goal`, installed plan skill, or user text requesting “plan” does not prove native Plan is active. Documentation describes possible controls; it is not live-client evidence. When useful, record `surface`, `experience`, `plan_control`, `plan_state`, `evidence_source`, `host_version`, and `confidence`; unknown values remain unknown. Do not stop a read-only interview merely to complete this record.

Keep `Planning capability:` and `Read-only enforcement:` independent. Available but inactive and indeterminate planning both permit non-mutating discovery and conversation under the behavioral no-write gate. Do not call missing controls “unavailable” without evidence, nor treat an explicit refusal as technical absence. A busy composer cannot prove the control is absent; continue independent reads while any requested transition remains pending.

## Codex execution host

Use `request_user_input` when exposed and allowed by its current mode contract; use an asynchronous question control only when actually available and appropriate. Otherwise ask conversationally. Native mode is host-controlled: use an exposed transition or exit control according to its contract, or request the observed manual action only when that action is needed. Do not claim that sending text changed modes.

For a CLI that documents and exposes `/plan`, a standalone command is a valid manual option. Combining it with `$codex-spec-interviewer` and an inline prompt requires evidence that this client supports inline arguments; do not transfer CLI parsing assumptions to a different surface. Preserve the original request in conversation rather than making the user retype it.

## ChatGPT and Codex web execution hosts

Distinguish ChatGPT Chat/Work from Codex web only as needed to choose a real control. If the surface or experience is unknown, continue conversationally without inventing a handoff. Unknown planning or permission state blocks persistence, not the requirements conversation.

- Use the currently observed or user-reported native control. For ChatGPT web, select the observed composer item instead of generating a CLI-style combined command.
- ChatGPT skill selection uses its available UI (such as `@`); Codex skill invocation uses `$`. Do not inject `@skill` into a mode command or infer one product's syntax for the other.
- A standalone observed `/plan` on Codex web or a non-web ChatGPT client does not prove inline prompt support. Keep the continuation separate unless this same composer demonstrates that support.
- Active Plan requires no new transition even when the composer is busy. Inactive, disabled, missing, or unknown controls do not require another requirements-question interruption.
- After approval, request only the actual exit action needed for persistence; preserve the approved draft and write scope across that transition.

## Claude Code execution host

When actually exposed, `AskUserQuestion`, `EnterPlanMode`, and `ExitPlanMode` are Claude Code controls. They do not become available merely because the output targets Claude Code. Use them according to the running host's contract. If a required transition has no tool, use its observed/documented mode selector or shortcut; do not presume every surface has the same shortcut.

A native `ExitPlanMode` approval can be the single final checkpoint when it presents the full reviewed draft and exact save-only writes. If content was already approved, invoke exit only as the remaining host action and do not ask content approval again. The host's own unavoidable permission UI is distinct from a skill-generated duplicate question.

## Cursor execution host

Use `AskQuestion` only when exposed. For a native transition that is actually needed, Cursor editor and CLI may expose different controls (for example an editor mode selector or CLI `/plan`); use current documented/client-visible controls. Do not invoke Claude tools or assume a native plan-exit tool exists. Preserve existing approval across a manual exit and complete the same save-only handoff.

## Older hosts and unavailable controls

A missing structured question, async question, native plan, or exit tool is not a reason to omit the interview or repeat approved content. Use ordinary conversation and actual permissions. While a required answer is pending, only independent authorized work continues. Silence and timeouts do not select defaults. If write state cannot be established, return the reviewed draft with persistence pending rather than attempting a write.

## Documentation pointers

Consult current primary documentation only when the relevant mechanism is unclear:

- [Codex CLI commands](https://developers.openai.com/codex/cli/slash-commands)
- [ChatGPT developer commands](https://learn.chatgpt.com/docs/developer-commands)
- [ChatGPT skills](https://learn.chatgpt.com/docs/skills-and-plugins)
- [Claude Code tools](https://code.claude.com/docs/en/tools-reference)
- [Claude Code permission modes](https://code.claude.com/docs/en/permission-modes)
- [Cursor Plan mode](https://cursor.com/docs/agent/plan-mode)
- [Cursor CLI](https://cursor.com/docs/cli/using)

These references establish documented behavior, not live proof for another client or version.
