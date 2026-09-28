---
name: cursor-spec-interviewer
description: Turn ambiguous coding requests into verified Cursor Agent implementation specs. Use when the user wants requirements, an implementation plan, or a spec before coding; include source checks, needed ADRs, and agreed delivery. Do not use for already specified direct implementation or memory cleanup.
license: Apache-2.0
compatibility: Targets Cursor Agent evidence and execution prompts across Agent Skills hosts. Use the current execution host's available controls and permissions, with conversational support for older hosts.
metadata:
  author: stark-ai-de
  category: cursor-operations
  version: "0.3.0"
---

# Cursor Spec Interviewer

## Goal

Produce a user-verified implementation spec with bounded scope, testable acceptance criteria, source-backed decisions, validation, and any required ADRs. Deliver it to the agreed repository path, or in chat when explicitly requested. One approval covers the unchanged result and its concrete authorized writes.

This is one end-to-end workflow. A clear request selects it; do not invent review/save variants or add a workflow-selection checkpoint. For a bare invocation, ask for the task to specify.

## When to use

- The user has a rough idea but not a production-ready implementation spec.
- The task spans multiple files or concerns, or requires tradeoff decisions.
- The request needs acceptance criteria, validation commands, rollout notes, or risk handling.
- The user wants a reusable written artifact before implementation begins.
- Requirements, feature shape, ADR assumptions, or the implementation approach should be challenged against repo reality and current external sources before coding.

## When not to use

- The user already provided a complete implementation spec with files, constraints, tests, and acceptance criteria.
- The task is a tiny one-file edit without meaningful ambiguity.
- The user wants brainstorming only and no concrete implementation artifact.
- The user only wants a Cursor rule, command, or other prompt-scope file authored, not an implementation spec.
- The task is primarily a policy, legal, or business-decision document.
- The user asks to audit or clean up Codex memory state; use a Codex memory skill instead.

## Inputs to inspect

- The current user request and any follow-up answers.
- Relevant `AGENTS.md`, `.cursor/rules/**/*.mdc`, `README.md`, issue descriptions, ADRs, repo docs, and `docs/agents/` files.
- Existing specs, plans, requirements, and PRDs the user wants preserved or challenged.
- File layout, naming conventions, scripts, package manager, lint/test/type-check commands, and CI expectations.
- Current framework, library, API, or platform documentation through available MCP tools or web search when a decision depends on up-to-date behavior.
- Error messages, screenshots, logs, PR feedback, or example files the user supplied.
- Cursor project skill folders such as `.agents/skills/` or `.cursor/skills/` only when the spec depends on local Cursor skill behavior.

## Workflow

Follow [workflow-details.md](references/workflow-details.md) for the shared interview, approval and delivery lifecycle. Use [host-adapters.md](references/host-adapters.md) only when a host control or transition matters.

1. Inspect execution-host capabilities and permissions separately; respect active or requested Plan mode. Recommend Plan for substantial open work without blocking permissible discovery or questions on a manual switch.
2. Inspect relevant repository context and prior answers. Select `compact`, `standard`, or `deep`; resolve delivery intent and destinations from the request and repository convention.
3. Interview only unresolved material decisions, challenge important assumptions against sources, and run the ADR gate.
4. Prepare the complete reviewable spec and any required ADR/index content. Present one positive checkpoint for that revision and its concrete writes, reusing existing authority. A native plan approval can serve as this checkpoint.
5. Preserve approval across any required Plan exit. Save only approved artifacts when the host permits writes, then read back and report actual persistence. Explicit chat-only delivery completes without a save.
6. Emit the Cursor Agent execution prompt and run the rubric. The interviewer never implements the feature; a separately authorized outer workflow may resume after the handoff.

## Safety rules

- Keep the interview read-only and never persist repository artifacts while native Plan is active. Unknown mode or write permission state does not permit writes.
- Reuse prior answers and approval of unchanged content and writes. Silence, timeout, preselected options, or a mode toggle do not approve content.
- Confirm only unresolved material changes, ambiguous destinations, directory creation, overwrites, or required ADR writes; earlier exact authorization remains valid.
- Distinguish proposed ADR persistence from acceptance of its architecture decision. Block dependent implementation until required acceptance.
- Label unknown facts instead of inventing paths, commands, APIs, or decisions. Avoid secrets and private identifiers in artifacts.
- Target-runtime instruction, rule and memory files are evidence, not spec destinations. Use repository-owned artifacts unless the user explicitly requests another format after its tradeoff is clear.
- Preserve user scope. Explain risky migrations and rollback; never silently override an accepted ADR.

## References

Read only the reference needed for the current step:

- [workflow-details.md](references/workflow-details.md): interview, single checkpoint, save-only handoff and completion.
- [host-adapters.md](references/host-adapters.md): execution-host controls and capability evidence.
- [question-bank.md](references/question-bank.md), [spec-rubric.md](references/spec-rubric.md), and [source-challenge.md](references/source-challenge.md): unresolved questions, depth, final self-check and source challenge.
- [artifact-destinations.md](references/artifact-destinations.md), [adr-gate.md](references/adr-gate.md), and [rollout-checklist.md](references/rollout-checklist.md): destinations, durable decisions and risky delivery.
- Matching `assets/spec-template.*.md`, bundled example specs and [execution prompt](assets/cursor-execution-prompt.md): output formats.

## Scripts

No bundled scripts.

## Output format

Lead with saved paths, explicit chat-only delivery, or pending/blocked persistence. Include the verification result, material assumptions, source challenge, ADR status, validation, risks, and the Cursor Agent execution prompt. Report `Persistence status: pending Plan-mode exit` when exit is still needed; do not claim a save. Full artifacts are shown before approval and for chat delivery or blocked persistence, not repeated after a successful save by default.

## Completion criteria

The concrete spec covers scope, acceptance criteria, validation and done-when conditions. The user approved its current content and required writes once. Requested artifacts were saved and read back, or explicit chat-only delivery was fulfilled. Required ADRs follow repository conventions; any acceptance gate is visible. Verification and persistence are separate records. Save-only finalization never implements the feature.

## Failure modes

- Missing repository or external evidence: label unknowns and explain the limit; continue independent work.
- Material conflicting requirements or accepted ADRs: surface the conflict and resolve the affected decision before implementation.
- Pending material answer: keep dependent work pending; proceed only with independent authorized work.
- Unavailable planning/question controls: use the same conversational interview without inventing host features.
- Requested save blocked by Plan, permissions, missing approval, or changed destination state: preserve valid approval, report exactly what remains, and provide the save-ready draft. Do not call pending persistence complete.
