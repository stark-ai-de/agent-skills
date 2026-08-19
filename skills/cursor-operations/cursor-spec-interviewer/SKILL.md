---
name: cursor-spec-interviewer
description: Interview fuzzy Cursor Agent coding requests into user-verified, Cursor-ready implementation specs. Use when the user asks for a spec, implementation plan, PRD, requirements, or a plan before coding for a feature, bugfix, refactor, migration, repo-wide change, or architecture task, or needs acceptance criteria, validation commands, ADR decisions, or rollout notes. Saves the spec and a Cursor execution prompt. Do not use for fully specified tasks or direct implementation requests.
license: Apache-2.0
compatibility: Targets Cursor Agent evidence and execution output while keeping specs and ADRs repository-owned. Use the current execution host's Plan Mode and lifecycle controls when supported; use Cursor-only controls only when Cursor executes the skill. Works best with repo-local AGENTS.md, .cursor/rules, and project docs.
metadata:
  author: stark-ai-de
  category: cursor-operations
  version: "0.2.4"
---

# Cursor Spec Interviewer

## Goal

Produce a user-verified implementation spec that Cursor Agent can execute with minimal ambiguity, minimal scope creep, explicit validation, explicit assumptions, a bounded source challenge, and ADRs for durable architectural decisions when needed. Save every final spec using the repo's clear convention or a confirmed destination; save ADR files only when the ADR gate requires one.

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

## Execution-host Plan Mode preflight

Before repo inspection or substantive questions, identify the current execution host and use only its planning, structured-question, transition, and plan-exit controls. The Cursor Agent target determines evidence and output contracts, not which host controls are available.

1. Classify the current host state as `active`, `supported-inactive`, `definitely-unavailable`, or `indeterminate`. Treat `indeterminate` as `supported-inactive`; uncertainty is never fallback authority.
2. If active, continue in the main conversation and use the current host's structured-question control for material decisions when available. In Cursor, that control is `AskQuestion` when the active surface exposes it.
3. If supported but inactive and not explicitly declined, invoke the current host's Plan Mode transition control and wait for host confirmation. If the current host exposes no transition control, give accurate manual activation instructions for that host, ask the user to reply `continue`, and wait. When Cursor is the execution host, tell editor users to press Shift+Tab and Cursor CLI users to use `/plan` or start with `--mode=plan`. Do not ask the user to resend the request or claim the skill changed modes.
4. Never fork the interview. Use conversational fallback only when Plan Mode is definitely unavailable or explicitly declined, recording `Plan Mode fallback: unavailable` or `Plan Mode fallback: declined` plus the reason. An indeterminate state must transition or wait under step 3 instead.
5. Keep repository and workspace artifacts read-only in Plan Mode. Inspection and non-mutating validation are allowed; only a plan artifact created by the current host's plan-exit control is permitted.

## Workflow

1. Run the execution-host Plan Mode preflight above before any substantive interview. Do not apply it to requests outside the skill's trigger boundary.
2. Classify the requested effort as `compact`, `standard`, or `deep` using the mode table in `references/spec-rubric.md`.
3. Inspect only the minimum repo context needed to avoid low-value questions. During this pass, note spec and ADR destinations by following `references/artifact-destinations.md`; defer destination confirmation to the final checkpoint unless that reference requires earlier confirmation.
4. Ask one high-impact question at a time when the answer affects the next decision; batch up to 3 questions only when they are independent and low-friction. In Plan Mode, use the current execution host's structured-question control when available; in Cursor, that control is `AskQuestion` when exposed. Prefer answering discoverable questions from repo files, ADRs, code search, MCP tools, or web sources instead of asking the user. Use `references/question-bank.md` for question selection.
5. After each answer or evidence pass, summarize the current understanding, explicit assumptions, and remaining unknowns.
6. Continue until every material requirement, non-goal, edge case, validation path, rollout concern, and ADR implication is source-backed, answered by the user, or explicitly accepted as non-blocking.
7. Draft a spec hypothesis, then challenge it against sources using `references/source-challenge.md`. Challenge only decisions that materially affect correctness, safety, maintainability, or implementation strategy.
8. Run the ADR gate using `references/adr-gate.md`. If a durable architectural decision is required, draft the ADR, identify the required ADR path, and mark implementation blocked until acceptance when the spec depends on that decision.
9. If the challenge invalidates a requirement or prior assumption, revise the spec, mark the conflict, or propose a preceding ADR or spec step before implementation.
10. Present a final checkpoint with scope, non-goals, assumptions, open questions, risks, validation plan, ADR result, and artifact path basis. Ask whether anything material is missing or wrong, and wait for explicit verification. Continue interviewing if a material gap appears.
11. Produce the approved spec from `assets/spec-template.compact.md`, `assets/spec-template.standard.md`, or `assets/spec-template.deep.md`. Convert ambiguous requirements into testable acceptance criteria; prefer EARS-like phrasing when behavior must be testable. For compact specs, use `artifact_path` as the only persisted artifact field and report verification and persistence status in the final response unless risk requires a fuller section.
12. While Plan Mode is active, write no repository or workspace artifact and mark persistence pending. Use the current execution host's plan-exit control with a save-only plan for the approved repository-owned spec, any required ADR, and the minimal ADR index entry required by the repository's existing convention. That plan must also validate and report the saved paths, emit the Cursor-targeted execution prompt, and stop without implementing the feature. A plan artifact created by the host control is allowed. If the current host exposes no plan-exit control, give accurate manual exit instructions for that host, ask the user to reply `continue`, and wait before the same save-only handoff; do not issue a generic manual-exit command when a host control exists.
13. After the current host confirms Plan Mode exit, save only the approved repository-owned spec, any required ADR, and the convention-required minimal ADR index entry. Do not implement the feature or make other repo-facing documentation changes. Validate and report the artifact paths, produce the Cursor-targeted execution prompt using `assets/cursor-execution-prompt.md`, run the final self-check against `references/spec-rubric.md`, and stop.
14. In a recorded conversational fallback, complete the same interview and save-only finalization after checkpoint verification when writes are allowed. If persistence is declined, blocked, or unavailable, write nothing, return the save-ready artifacts with proposed repository paths, and mark the workflow incomplete.

## Cursor integration

Cursor-native controls apply only when Cursor executes the skill; other hosts follow the preflight and workflow above. If Cursor exposes no plan-exit control, tell editor users to toggle out of Plan Mode with Shift+Tab and wait for `continue`; on other Cursor surfaces, use only a documented client-visible mode switch. Treat `.cursor/rules/**/*.mdc` as target evidence, not the artifact format. Specs, ADRs, and index entries remain repository-owned; emit a Cursor-targeted execution prompt after persistence.

## Safety rules

- Do not invent repo facts, file paths, commands, APIs, or architecture. Mark them as `unspecified` when unknown.
- Do not hide uncertainty. State assumptions explicitly.
- Do not broaden scope beyond what the user asked for; prefer minimal, reversible implementation scope when intent is unclear.
- Do not prescribe destructive migrations, data rewrites, or secret handling without explicit callouts and rollback notes.
- Do not include secrets, credentials, private identifiers, or internal-only data in examples.
- Do not use an ambiguous destination, overwrite existing files, create new artifact directories, or write ADR files without confirmation.
- Do not use web or MCP lookup as ceremony. Use it when current facts can materially change the spec, and prefer official documentation, primary sources, repo-local docs, and source code over secondary commentary.
- Follow `references/adr-gate.md` for when ADRs must and must not be created. Do not silently override an existing ADR; propose a superseding ADR when a durable decision changes.

## References

Read only when needed:

- Interview: `references/question-bank.md`, `references/spec-rubric.md`, and `references/source-challenge.md`.
- Persistence and architecture: `references/adr-gate.md`, `references/artifact-destinations.md`, and `references/rollout-checklist.md`.
- Output: the matching `assets/spec-template.*.md`, `assets/cursor-execution-prompt.md`, and the bundled example specs.

## Scripts

No bundled scripts.

## Output format

While the verified interview is still in Plan Mode, return the approved repository artifact paths and `Persistence: pending`; invoke the current execution host's plan-exit control with the save-only plan or give the host-accurate manual handoff from step 12. Do not report persisted paths or include the Cursor-targeted execution prompt as though persistence already happened.

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

- The final artifact is a saved, concrete markdown spec with explicit scope, constraints, testable acceptance criteria, validation, and done-when criteria; report its repository path.
- Required ADRs follow repo conventions or block implementation; missing facts remain `unspecified`, and no blocking decision is hidden.
- Important decisions were challenged against relevant repo evidence and current sources, or the reason for skipping the challenge is stated.
- A required ADR is indexed during save-only persistence when the repository convention requires it; all other repo-facing documentation changes are captured in the spec for the later implementation task.
- Include the Cursor execution prompt. The Plan Mode interview changes no repository or workspace artifact apart from a plan artifact created by the host's plan-exit control; save-only finalization changes only the approved spec, required ADR, and minimal convention-required ADR index entry and never implements the feature.

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
- If transition, fallback, or exit cannot proceed, follow the preflight and step 12 exactly; keep persistence pending and write nothing until the host confirms exit.
