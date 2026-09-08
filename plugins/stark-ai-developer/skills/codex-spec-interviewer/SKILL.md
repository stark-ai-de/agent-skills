---
name: codex-spec-interviewer
description: Interview, source-challenge, verify, save, and ADR-gate fuzzy coding requests into Codex-ready implementation specs. Use when a feature, bugfix, refactor, migration, repo-wide change, or architecture task needs user-verified requirements, source-backed decisions, durable architecture decisions, acceptance criteria, validation commands, rollout notes, saved spec/ADR files, and a Codex execution prompt. Do not use when already fully specified or when the user wants direct implementation now.
license: Apache-2.0
compatibility: Designed for Codex CLI, IDE extension, and Codex app. Native Plan mode is required when the current surface supports it; use the documented fallback only when Plan mode is unavailable or explicitly declined.
metadata:
  author: stark-ai-de
  category: codex-operations
  version: "0.3.3"
---

# Codex Spec Interviewer

## Goal

Produce a user-verified implementation spec that Codex can execute with minimal ambiguity, minimal scope creep, explicit validation, explicit assumptions, a bounded source challenge, and ADRs for durable architectural decisions when needed. Save every final spec using the repo's clear convention or a confirmed destination; save ADR files only when the ADR gate requires one.

This is one end-to-end outcome, not a public multi-workflow skill. Do not invent review/save variants or add a workflow-selection checkpoint.

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
- The user only wants `AGENTS.md` content or Codex memory entries authored, not an implementation spec.
- The task is primarily a policy, legal, or business-decision document.
- The user asks to audit or clean up Codex memory state; use a Codex memory skill instead.

## Inputs to inspect

- The current user request and any follow-up answers.
- Relevant `AGENTS.md`, `README.md`, issue descriptions, ADRs, repo docs, and `docs/agents/` files.
- Existing specs, plans, requirements, and PRDs the user wants preserved or challenged.
- File layout, naming conventions, scripts, package manager, lint/test/type-check commands, and CI expectations.
- Current framework, library, API, or platform documentation through available MCP tools or web search when a decision depends on up-to-date behavior.
- Error messages, screenshots, logs, PR feedback, or example files the user supplied.

## Native Plan mode preflight

Run the preflight in [workflow-details.md](references/workflow-details.md) before substantive interviewing or repository exploration. A supported-but-inactive or indeterminate Plan state stops the turn with the copy-ready `/plan` handoff; only definitely unavailable or explicitly declined Plan mode permits the documented conversational fallback. Active Plan interviewing is read-only.

## Workflow

Follow the complete numbered procedure in [workflow-details.md](references/workflow-details.md):

1. Classify the effort as `compact`, `standard`, or `deep`.
2. Inspect only the minimum context needed to answer discoverable questions and identify artifact destinations.
3. Ask only high-impact questions, summarize assumptions after each evidence pass, and continue until material requirements and risks are resolved or explicitly accepted.
4. Challenge the spec hypothesis against relevant sources and run the ADR gate.
5. Present a final checkpoint and wait for verification before preparing artifacts.
6. Persist only the approved spec and required ADR/index artifacts, respecting Plan-mode exit and save-only boundaries.
7. Run the final rubric self-check and emit the companion Codex execution prompt.

## Codex integration

- Native Plan mode is host-controlled. The skill must request a user-initiated `/plan` transition when supported and inactive; it must not claim to switch modes itself.
- Use `request_user_input` in active Plan mode when available so material choices require explicit user action.
- Treat the saved spec file as the durable artifact that outlives Plan mode and chat context. An approved in-chat plan with persistence still pending is not the final artifact.
- Treat `AGENTS.md`, `docs/agents/`, and Codex memories as repo and user evidence, not as the artifact format. Do not write spec content into memories or `AGENTS.md` unless the user explicitly asks for it after the tradeoff is stated.

## Safety rules

- Do not invent repo facts, file paths, commands, APIs, or architecture. Mark them as `unspecified` when unknown.
- Do not hide uncertainty. State assumptions explicitly.
- Do not broaden scope beyond what the user asked for; prefer minimal, reversible implementation scope when intent is unclear.
- Do not prescribe destructive migrations, data rewrites, or secret handling without explicit callouts and rollback notes.
- Do not include secrets, credentials, private identifiers, or internal-only data in examples.
- Do not write any file while native Plan mode is active.
- Do not implement the feature during the save-only persistence continuation.
- Do not use an ambiguous destination, overwrite existing files, create new artifact directories, or write ADR files without confirmation.
- Do not use web or MCP lookup as ceremony. Use it when current facts can materially change the spec, and prefer official documentation, primary sources, repo-local docs, and source code over secondary commentary.
- Follow `references/adr-gate.md` for when ADRs must and must not be created. Do not silently override an existing ADR; propose a superseding ADR when a durable decision changes.

## References

Read only when needed:

- [workflow-details.md](references/workflow-details.md) for the full preflight, workflow, persistence, output, completion, and failure contracts.
- `references/question-bank.md` for interview questions.
- `references/spec-rubric.md` for mode selection and the final self-check.
- `references/source-challenge.md` for the source-backed challenge pass.
- `references/adr-gate.md` before deciding whether the spec needs a preceding ADR.
- `references/artifact-destinations.md` before proposing or saving spec and ADR paths.
- `references/rollout-checklist.md` when writing validation, rollout, and rollback sections.
- `assets/spec-template.compact.md` for small, low-risk work.
- `assets/spec-template.standard.md` for default feature, bugfix, refactor, or migration specs.
- `assets/spec-template.deep.md` for repo-wide, architectural, or phased work.
- `assets/codex-execution-prompt.md` for the companion implementation prompt.
- `assets/example-small-task.spec.md` and `assets/example-repo-refactor.spec.md` for output shape examples.

## Scripts

No bundled scripts.

## Output format

Use the detailed output contract in [workflow-details.md](references/workflow-details.md). In Plan mode, report the interview result, assumptions, source challenge, ADR result, approved path, `Persistence status: pending Plan-mode exit`, and save-only continuation. After persistence or in fallback, report persisted paths, verification, assumptions, source challenge, ADR result, saved spec, execution prompt, validation, and risk/rollout notes. Do not claim persistence or completion before its gate is satisfied.

## Completion criteria

- The final artifact is a concrete markdown spec, not a prose brainstorm or chat-only plan.
- The spec has explicit scope, constraints, validation, and done-when criteria, and acceptance criteria are testable.
- The spec is saved in the repository with a reported path. An approved spec that is still pending Plan-mode exit is not complete.
- Required ADRs are saved using the repo's ADR path and filename pattern, or implementation is explicitly blocked before ADR creation.
- Missing facts are labeled as `unspecified`, and no unresolved blocking decision is hidden as a non-blocking assumption.
- Important requirements and implementation decisions were challenged against relevant repo evidence and current sources, or the reason for skipping the challenge is stated.
- A required ADR is indexed during save-only persistence when the repository convention requires it; all other repo-facing documentation changes are captured in the implementation spec for later work.
- A Codex execution prompt is included.
- The save-only continuation performs no feature implementation or unrelated repository changes; a minimal convention-required ADR index entry is related ADR persistence.

## Failure modes

- If the repository context is unavailable, produce a repo-agnostic spec and mark repo-specific details as `unspecified`.
- If native Plan mode is supported but inactive, stop with the preflight's copy-ready `/plan` command; do not silently fall back.
- If native Plan mode is unavailable or explicitly declined, record the fallback reason and continue conversationally.
- If the user remains in Plan mode after approving the checkpoint, keep persistence marked pending, repeat the save-only handoff if useful, and do not claim completion.
- If a save-only continuation lacks enough conversation context to reproduce the approved artifact exactly, stop and ask the user to resume the original conversation or provide the approved artifact; do not invent missing content.
- If the user's goal is internally inconsistent, stop and surface the conflict clearly.
- If validation commands cannot be determined, include a placeholder section labeled `unspecified`.
- If the requested scope is too large for one safe spec, split it into phases and say so.
- If the user declines persistence or a save is blocked, return the spec and any ADR draft in chat with the proposed path and the blocker, and report that normal persistence completion was not met.
- If a proposed artifact path already exists, ask before overwriting it.
- If current external docs cannot be reached, continue with repo evidence and mark the external-source check as unavailable.
- If a prior ADR or named requirement appears stale or wrong, propose a preceding ADR, spec update, or explicit maintainer decision instead of silently overriding it.
- If the ADR gate is uncertain, produce the spec with `ADR required: unresolved` and make implementation blocked on a maintainer decision.
- If the checkpoint is not verified, keep interviewing or stop with the spec uncreated.
- If the specs or ADR folder does not exist and the user does not approve creating or selecting one, stop before creating final artifacts.
