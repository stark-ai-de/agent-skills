---
name: claude-spec-interviewer
description: Interview fuzzy Claude Code coding requests into user-verified implementation specs with source challenge, ADR gate, validation plan, and execution prompt. Use when the user asks for /claude-spec-interviewer, a Claude Code implementation plan, PRD, requirements, plan before coding, Plan Mode planning, persisted spec, ADR decision, CLAUDE.md evidence, or .claude/rules evidence. Do not use for direct implementation, pure brainstorming, memory cleanup, or authoring Claude instruction files only.
license: Apache-2.0
compatibility: Designed for Claude Code-targeted planning across Agent Skills hosts. Use the current execution host's Plan mode and lifecycle controls when supported unless the user explicitly declines them; otherwise use a recorded conversational fallback. Use Claude-only controls only when Claude Code executes the skill. Works best with repo-local AGENTS.md, CLAUDE.md, .claude/rules, and project docs.
metadata:
  author: stark-ai-de
  category: claude-operations
  version: "0.2.3"
---

# Claude Spec Interviewer

## Goal

Produce a user-verified implementation spec with bounded scope, explicit assumptions and validation, a source challenge, and ADRs for durable decisions when needed. Save it using the repo's confirmed convention; save ADRs only when the ADR gate requires them.

This is one end-to-end outcome, not a public multi-workflow skill. Do not invent review/save variants or add a workflow-selection checkpoint.

## When to use

- The user has a rough idea but not a production-ready implementation spec.
- The task spans multiple files or concerns, or requires tradeoff decisions.
- The request needs acceptance criteria, validation commands, rollout notes, or risk handling.
- The user wants a reusable written artifact before implementation begins.
- The user invokes `/claude-spec-interviewer` or asks Claude Code to plan before coding.
- Requirements, feature shape, ADR assumptions, or the implementation approach should be challenged against repo reality and current external sources before coding.

## When not to use

- The user already provided a complete implementation spec with files, constraints, tests, and acceptance criteria.
- The task is a tiny one-file edit without meaningful ambiguity.
- The user wants brainstorming only and no concrete implementation artifact.
- The user only wants a Claude Code rule, command, or other prompt-scope file authored, not an implementation spec.
- The task is primarily a policy, legal, or business-decision document.
- The user asks to audit or clean up Claude Code memory, Codex memory, or Cursor rules state; use the matching memory or rules skill instead.

## Inputs to inspect

- The current user request and any follow-up answers.
- Relevant `AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md`, `.claude/rules/**/*.md`, `~/.claude/rules/**/*.md`, `README.md`, issue descriptions, ADRs, repo docs, and `docs/agents/` files.
- Existing specs, plans, requirements, and PRDs the user wants preserved or challenged.
- File layout, naming conventions, scripts, package manager, lint/test/type-check commands, and CI expectations.
- Current framework, library, API, or platform documentation through available MCP tools or web search when a decision depends on up-to-date behavior.
- Error messages, screenshots, logs, PR feedback, or example files the user supplied.
- Claude Code project or personal skill folders such as `.claude/skills/` and `~/.claude/skills/` only when the spec depends on local Claude Code skill behavior.
- Claude Code auto-memory evidence only when it is surfaced by the user, available through `/memory`, or materially relevant to the requested implementation plan.

## Execution-host Plan mode preflight

Before repo inspection or substantive questions, identify the current execution host and use only its planning, structured-question, transition, and plan-exit controls. The Claude Code target determines evidence and output contracts, not which host controls are available.

1. Classify the current host state as `active`, `supported-inactive`, `definitely-unavailable`, or `indeterminate`. Treat `indeterminate` as `supported-inactive`; uncertainty is never fallback authority.
2. If active, continue in the main conversation and use the current host's structured-question control for material decisions when available. In Claude Code, that control is `AskUserQuestion`.
3. If supported but inactive and not explicitly declined, invoke the current host's Plan-mode transition control and wait for host confirmation. In Claude Code, that control is `EnterPlanMode`. If the current host exposes no transition control, give accurate manual activation instructions for that host, ask the user to reply `continue`, and wait. When Claude Code is the execution host, say: `Switch to Plan mode with Shift+Tab, the mode selector, or /plan, then reply continue.` Do not ask the user to resend the request or claim prompt text changed the mode. An explicit decline skips transition and enters the recorded fallback in step 4.
4. Never fork the interview. Use conversational fallback only when Plan mode is definitely unavailable or explicitly declined, recording `Plan mode fallback: unavailable` or `Plan mode fallback: declined`. An indeterminate state must transition or wait under step 3 instead.
5. Keep repository and workspace artifacts read-only in Plan mode. Inspection and non-mutating validation are allowed; only a plan artifact created by the current host's plan-exit control is permitted. In Claude Code, that control is `ExitPlanMode`.

## Workflow

1. Run the execution-host Plan mode preflight above. Do not begin the substantive interview until Plan mode is active or a permitted fallback is recorded.
2. Classify the requested effort as `compact`, `standard`, or `deep` using the mode table in `references/spec-rubric.md`.
3. Inspect only the minimum repo context needed to avoid low-value questions. During this pass, note spec and ADR destinations by following `references/artifact-destinations.md`; defer destination confirmation to the final checkpoint unless that reference requires earlier confirmation.
4. Ask one high-impact question at a time; batch up to 3 only when independent. Resolve discoverable facts from repo evidence or current primary sources. Use the current execution host's structured-question tool when available; in Claude Code, this is `AskUserQuestion`. Use `references/question-bank.md` for question selection.
5. After each answer or evidence pass, summarize understanding, assumptions, and unknowns. Continue until material requirements, non-goals, edge cases, validation, rollout, and ADR implications are resolved or explicitly non-blocking.
6. Draft a spec hypothesis, then challenge it against `references/source-challenge.md` where decisions affect correctness, safety, maintainability, or strategy.
7. Run `references/adr-gate.md`. If a durable decision is required, draft the ADR and path; block dependent implementation until acceptance.
8. If the challenge invalidates a requirement or assumption, revise it, mark the conflict, or propose a preceding ADR or spec step.
9. Present a checkpoint covering scope, non-goals, assumptions, open questions, risks, validation, ADR result, and path basis. Wait for explicit verification; continue interviewing if a material gap appears.
10. Prepare the approved spec from the matching template in `assets/`. Convert ambiguity into testable acceptance criteria; for compact specs, use `artifact_path` as the only persisted artifact field.
11. While Plan mode is active, write no repository or workspace artifact and mark persistence pending. Use the current execution host's plan-exit control with a save-only plan to persist the approved spec, required ADR, and the minimal ADR index entry required by the repository's existing convention; in Claude Code, that control is `ExitPlanMode`. Emit the Claude execution prompt, validate and report paths, then stop. A plan artifact created by that host control is allowed. If the current host exposes no plan-exit control, give accurate manual exit instructions for that host and wait for `continue` before the save-only handoff. When Claude Code is the execution host, say: `Exit Plan mode with Shift+Tab or the mode selector, then reply continue. Continue in save-only mode: persist the approved spec to <path>, any required ADR, and the minimal ADR index entry required by the repository's existing convention; emit the Claude Code execution prompt, validate and report the artifact paths, then stop. Do not implement the feature.`
12. After approved exit, perform only that handoff using `assets/claude-execution-prompt.md`; make no implementation or unrelated documentation edits. A minimal convention-required ADR index entry is related ADR persistence. If persistence is declined or blocked, write nothing and return save-ready artifacts, proposed paths, and the reason.
13. In a recorded conversational fallback, perform the same save-only finalization after the verified checkpoint when writes are allowed; do not implement the feature.
14. Run a final self-check against `references/spec-rubric.md`.

## Claude Code integration

Claude-native controls apply only when Claude Code executes the skill; other hosts follow the preflight and workflow above. Support `/claude-spec-interviewer` and automatic loading in the main conversation. Treat `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/**/*.md`, `~/.claude/rules/**/*.md`, and auto memory as target evidence, not the spec format. Save repository-owned spec and ADR artifacts; create a Claude rule or memory artifact only when explicitly requested and supported by repo convention.

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
- Output: the matching `assets/spec-template.*.md`, `assets/claude-execution-prompt.md`, and the bundled example specs.

## Scripts

No bundled scripts.

## Output format

While Plan mode is active, report the checkpoint, proposed paths, and `Persistence status: pending`; invoke the current execution host's plan-exit control with the save-only plan or give the step 11 fallback. In Claude Code, that control is `ExitPlanMode`. Do not claim a save.

After the save-only continuation, or when using a recorded fallback, return in this order:

1. Persisted artifact paths
2. Interview summary and verification result
3. Assumptions and unresolved questions
4. Source challenge summary
5. ADR gate result
6. ADR draft or path when needed
7. Saved spec path plus a concise summary, or full save-ready markdown when file persistence is blocked
8. Claude Code execution prompt
9. Validation commands
10. Risk and rollout notes

Do not paste the full final spec or ADR by default after they are saved. Print full artifact contents only when the user asks, when the environment cannot write files, or when the user needs a review before approval.

## Completion criteria

- The final artifact is a saved, concrete markdown spec with explicit scope, constraints, testable acceptance criteria, validation, and done-when criteria; report its repository path.
- `Persistence status: pending` because Plan mode is still active is not completion. Continue only after the current execution host confirms plan exit or the user manually exits Plan mode for the save-only handoff. In Claude Code, approval of `ExitPlanMode` provides that confirmation.
- Required ADRs follow repo conventions or block implementation; missing facts remain `unspecified`, and no blocking decision is hidden.
- Important decisions were challenged against relevant repo evidence and current sources, or the reason for skipping the challenge is stated.
- A required ADR is indexed during save-only persistence when the repository convention requires it; all other repo-facing documentation changes are captured as implementation work in the spec.
- Include the Claude Code execution prompt. Save-only finalization changes only the approved spec, required ADR, and minimal convention-required ADR index entry; it never implements the feature.

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
- If Plan mode transition, fallback, or exit cannot proceed, follow the preflight and step 11 exactly; keep persistence pending and write nothing until the host confirms exit.
- If the specs or ADR folder does not exist and the user does not approve creating or selecting one, stop before creating final artifacts.
- If the user asks to store the entire implementation spec in a Claude Code rule or memory file, explain the tradeoff and ask for explicit confirmation before doing so.
