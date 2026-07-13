---
name: cursor-spec-interviewer
description: Interview fuzzy Cursor Agent coding requests into user-verified, Cursor-ready implementation specs. Use when the user asks for a spec, implementation plan, PRD, requirements, or a plan before coding for a feature, bugfix, refactor, migration, repo-wide change, or architecture task, or needs acceptance criteria, validation commands, ADR decisions, or rollout notes. Saves the spec and a Cursor execution prompt. Do not use for fully specified tasks or direct implementation requests.
license: Apache-2.0
compatibility: Targets Cursor Agent evidence and artifacts. Use native Cursor Plan Mode only when Cursor is the execution host; from another host, use that host's equivalent planning and question controls or the recorded fallback. Works best with repo-local AGENTS.md, .cursor/rules, and project docs.
metadata:
  author: stark-ai-de
  category: cursor-operations
  version: "0.2.1"
---

# Cursor Spec Interviewer

## Goal

Produce a user-verified implementation spec that Cursor Agent can execute with minimal ambiguity, minimal scope creep, explicit validation, explicit assumptions, a bounded source challenge, and ADRs for durable architectural decisions when needed. Save every final spec using the repo's clear convention or a confirmed destination; save ADR files only when the ADR gate requires one.

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

When another Agent Skills host executes this skill, substitute that host's equivalent planning, structured-question, transition, and plan-exit controls throughout this workflow; use the recorded fallback when an equivalent is unavailable, and keep Cursor evidence and output contracts unchanged.

1. Before any substantive interview, run the current execution host's equivalent of the Plan Mode preflight under Cursor integration. Do not apply this preflight to requests that do not meet the skill's trigger boundary.
2. Classify the requested effort as `compact`, `standard`, or `deep` using the mode table in `references/spec-rubric.md`.
3. Inspect only the minimum repo context needed to avoid low-value questions. During this pass, note spec and ADR destinations by following `references/artifact-destinations.md`; defer destination confirmation to the final checkpoint unless that reference requires earlier confirmation.
4. Ask one high-impact question at a time when the answer affects the next decision; batch up to 3 questions only when they are independent and low-friction. In Plan Mode, use the current execution host's structured question tool when available; in Cursor, this is Cursor's structured question tool. Prefer answering discoverable questions from repo files, ADRs, code search, MCP tools, or web sources instead of asking the user. Use `references/question-bank.md` for question selection.
5. After each answer or evidence pass, summarize the current understanding, explicit assumptions, and remaining unknowns.
6. Continue until every material requirement, non-goal, edge case, validation path, rollout concern, and ADR implication is source-backed, answered by the user, or explicitly accepted as non-blocking.
7. Draft a spec hypothesis, then challenge it against sources using `references/source-challenge.md`. Challenge only decisions that materially affect correctness, safety, maintainability, or implementation strategy.
8. Run the ADR gate using `references/adr-gate.md`. If a durable architectural decision is required, draft the ADR, identify the required ADR path, and mark implementation blocked until acceptance when the spec depends on that decision.
9. If the challenge invalidates a requirement or prior assumption, revise the spec, mark the conflict, or propose a preceding ADR or spec step before implementation.
10. Present a final checkpoint with scope, non-goals, assumptions, open questions, risks, validation plan, ADR result, and artifact path basis. Ask whether anything material is missing or wrong, and wait for explicit verification. Continue interviewing if a material gap appears.
11. Produce the approved spec from `assets/spec-template.compact.md`, `assets/spec-template.standard.md`, or `assets/spec-template.deep.md`. Convert ambiguous requirements into testable acceptance criteria; prefer EARS-like phrasing when behavior must be testable. For compact specs, use `artifact_path` as the only persisted artifact field and report verification and persistence status in the final response unless risk requires a fuller section.
12. When the verified interview is in Plan Mode, do not write files. Give the user this save-only continuation with the confirmed paths filled in: `Exit Plan Mode, then persist the approved spec to <spec-path>, any required ADR to <adr-path>, and the minimal ADR index entry required by the repository's existing convention. Do not implement the feature or update unrelated files. Validate the saved artifacts, emit the companion Cursor execution prompt, report the persisted paths, and stop.` Mark persistence as pending and do not claim completion while the user remains in Plan Mode.
13. On that continuation outside Plan Mode, save only the approved spec, any required ADR, and the minimal ADR index entry required by the repository's existing convention. Do not implement the feature or make the other repo-facing documentation changes described by the spec. Validate and report the artifact paths, produce the companion Cursor execution prompt using `assets/cursor-execution-prompt.md`, run the final self-check against `references/spec-rubric.md`, and stop.
14. If Plan Mode is unavailable or the user explicitly declined it, complete the same interview conversationally, record the fallback reason, then save the final spec, required ADR, and convention-required minimal ADR index entry under the normal confirmation rules. If persistence is declined, blocked, or unavailable, return the save-ready artifacts and mark the workflow incomplete.

## Cursor integration

The Cursor-native controls below apply only when Cursor is the execution host. Another host follows the workflow-level substitution rule instead.

- Native Cursor Plan Mode is required when the active Cursor surface supports it. If Plan Mode is already active, continue and use Cursor's structured question tool (AskQuestion) for material user decisions when it is available.
- If Plan Mode is supported but inactive and Cursor exposes a mode-transition request, request the transition and pause for the user's approval. Never claim that this skill switched modes; continue only after Cursor confirms Plan Mode is active.
- If a transition request is not exposed, tell editor users to switch with Shift+Tab and Cursor CLI users to use `/plan` or start with `--mode=plan`, then wait for them to continue. Do not substitute the conversational fallback merely because an automatic transition request is absent.
- Use the conversational fallback only when Plan Mode is unavailable in the active client or the user explicitly declines it. Record that fact and reason in the interview summary and final spec assumptions.
- Keep repo exploration and the entire interview read-only in Plan Mode. Treat the persisted spec file as the durable artifact that outlives the session plan.
- Treat `.cursor/rules/**/*.mdc` as repo evidence and constraints, not as the artifact format. Save implementation specs as spec files unless the user explicitly asks for a Cursor rule and the repo convention supports it.

## Safety rules

- Do not invent repo facts, file paths, commands, APIs, or architecture. Mark them as `unspecified` when unknown.
- Do not hide uncertainty. State assumptions explicitly.
- Do not broaden scope beyond what the user asked for; prefer minimal, reversible implementation scope when intent is unclear.
- Do not prescribe destructive migrations, data rewrites, or secret handling without explicit callouts and rollback notes.
- Do not include secrets, credentials, private identifiers, or internal-only data in examples.
- Do not use an ambiguous destination, overwrite existing files, create new artifact directories, or write ADR files without confirmation.
- Do not write files during a Plan Mode interview. After verification, leave Plan Mode and perform only the approved spec, required ADR, and convention-required minimal ADR index persistence; never implement the underlying feature as part of this workflow.
- Do not use web or MCP lookup as ceremony. Use it when current facts can materially change the spec, and prefer official documentation, primary sources, repo-local docs, and source code over secondary commentary.
- Follow `references/adr-gate.md` for when ADRs must and must not be created. Do not silently override an existing ADR; propose a superseding ADR when a durable decision changes.

## References

Read only when needed:

- `references/question-bank.md` for interview questions.
- `references/spec-rubric.md` for mode selection and the final self-check.
- `references/source-challenge.md` for the source-backed challenge pass.
- `references/adr-gate.md` before deciding whether the spec needs a preceding ADR.
- `references/artifact-destinations.md` before proposing or saving spec and ADR paths.
- `references/rollout-checklist.md` when writing validation, rollout, and rollback sections.
- `assets/spec-template.compact.md` for small, low-risk work.
- `assets/spec-template.standard.md` for default feature, bugfix, refactor, or migration specs.
- `assets/spec-template.deep.md` for repo-wide, architectural, or phased work.
- `assets/cursor-execution-prompt.md` for the companion implementation prompt.
- `assets/example-small-task.spec.md` and `assets/example-repo-refactor.spec.md` for output shape examples.

## Scripts

No bundled scripts.

## Output format

While the verified interview is still in Plan Mode, return the approved artifact paths, `Persistence: pending`, and the save-only continuation from the workflow. Do not report persisted paths or include the execution prompt as though persistence already happened.

After successful persistence, return in this order:

1. Persisted artifact paths
2. Interview summary and verification result
3. Assumptions and unresolved questions
4. Source challenge summary
5. ADR gate result
6. ADR draft or path when needed
7. Saved spec path plus a concise summary, or full save-ready markdown when file persistence is blocked
8. Cursor execution prompt
9. Validation commands
10. Risk and rollout notes

Do not paste the full final spec or ADR by default after they are saved. Print full artifact contents only when the user asks, when the environment cannot write files, or when the user needs a review before approval.

## Completion criteria

- The final artifact is a concrete markdown spec, not a prose brainstorm or chat-only plan.
- The spec has explicit scope, constraints, validation, and done-when criteria, and acceptance criteria are testable.
- The spec is saved in the repository with a reported path. A save-ready artifact that is still in Plan Mode, explicitly declined, or blocked is useful output but does not complete the workflow.
- Required ADRs are saved using the repo's ADR path and filename pattern, or implementation is explicitly blocked before ADR creation.
- Missing facts are labeled as `unspecified`, and no unresolved blocking decision is hidden as a non-blocking assumption.
- Important requirements and implementation decisions were challenged against relevant repo evidence and current sources, or the reason for skipping the challenge is stated.
- A required ADR is indexed during save-only persistence when the repository convention requires it; all other repo-facing documentation changes are captured in the spec for the later implementation task.
- A Cursor execution prompt is included.
- The Plan Mode interview made no file changes, and the persistence continuation did not implement the underlying feature or modify unrelated files; a minimal convention-required ADR index entry is related ADR persistence.

## Failure modes

- If the repository context is unavailable, produce a repo-agnostic spec and mark repo-specific details as `unspecified`.
- If the user's goal is internally inconsistent, stop and surface the conflict clearly.
- If validation commands cannot be determined, include a placeholder section labeled `unspecified`.
- If the requested scope is too large for one safe spec, split it into phases and say so.
- If persistence is declined or blocked, return the spec and any ADR draft with the proposed path and reason; mark the workflow incomplete.
- If a proposed artifact path already exists, ask before overwriting it.
- If current external docs cannot be reached, continue with repo evidence and mark the external-source check as unavailable.
- If a prior ADR or named requirement appears stale or wrong, propose a preceding ADR, spec update, or explicit maintainer decision instead of silently overriding it.
- If the ADR gate is uncertain, produce the spec with `ADR required: unresolved` and make implementation blocked on a maintainer decision.
- If the checkpoint is not verified, keep interviewing or stop with the spec uncreated.
- If the specs or ADR folder does not exist and the user does not approve creating or selecting one, stop before creating final artifacts.
- If the user does not leave Plan Mode after verification, repeat the save-only continuation as needed and keep persistence pending; do not write files or claim completion.
