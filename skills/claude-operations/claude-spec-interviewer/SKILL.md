---
name: claude-spec-interviewer
description: Interview fuzzy Claude Code coding requests into user-verified implementation specs with source challenge, ADR gate, validation plan, and execution prompt. Use when the user asks for /claude-spec-interviewer, a Claude Code implementation plan, PRD, requirements, plan before coding, Plan Mode planning, persisted spec, ADR decision, CLAUDE.md evidence, or .claude/rules evidence. Do not use for direct implementation, pure brainstorming, memory cleanup, or authoring Claude instruction files only.
license: Apache-2.0
compatibility: Designed for Claude Code and Claude Code skills. Works best with repo-local AGENTS.md, CLAUDE.md, .claude/rules, Plan Mode, and project docs.
metadata:
  author: stark-ai-de
  category: claude-operations
  version: "0.1.0"
---

# Claude Spec Interviewer

## Goal

Produce a user-verified implementation spec that Claude Code can execute with minimal ambiguity, minimal scope creep, explicit validation, explicit assumptions, a bounded source challenge, and ADRs for durable architectural decisions when needed. Save every final spec using the repo's clear convention or a confirmed destination; save ADR files only when the ADR gate requires one.

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

## Workflow

1. Classify the requested effort as `compact`, `standard`, or `deep` using the mode table in `references/spec-rubric.md`.
2. Inspect only the minimum repo context needed to avoid low-value questions. During this pass, note spec and ADR destinations by following `references/artifact-destinations.md`; defer destination confirmation to the final checkpoint unless that reference requires earlier confirmation.
3. Ask one high-impact question at a time when the answer affects the next decision; batch up to 3 questions only when they are independent and low-friction. Prefer answering discoverable questions from repo files, ADRs, code search, MCP tools, or web sources instead of asking the user. Use `references/question-bank.md` for question selection.
4. After each answer or evidence pass, summarize the current understanding, explicit assumptions, and remaining unknowns.
5. Continue until every material requirement, non-goal, edge case, validation path, rollout concern, and ADR implication is source-backed, answered by the user, or explicitly accepted as non-blocking.
6. Draft a spec hypothesis, then challenge it against sources using `references/source-challenge.md`. Challenge only decisions that materially affect correctness, safety, maintainability, or implementation strategy.
7. Run the ADR gate using `references/adr-gate.md`. If a durable architectural decision is required, draft the ADR, identify the required ADR path, and mark implementation blocked until acceptance when the spec depends on that decision.
8. If the challenge invalidates a requirement or prior assumption, revise the spec, mark the conflict, or propose a preceding ADR or spec step before implementation.
9. Before saving, present a final checkpoint with scope, non-goals, assumptions, open questions, risks, validation plan, ADR result, and artifact path basis. Ask whether anything material is missing or wrong; pause for an explicit answer when a material decision, ambiguous destination, overwrite, new directory, or ADR write is involved. Continue interviewing if a material gap appears.
10. Produce the final spec from `assets/spec-template.compact.md`, `assets/spec-template.standard.md`, or `assets/spec-template.deep.md`. Convert ambiguous requirements into testable acceptance criteria; prefer EARS-like phrasing when behavior must be testable. For compact specs, use `artifact_path` as the only persisted artifact field and report verification and persistence status in the final response unless risk requires a fuller section.
11. Save the final spec unless the user explicitly declined persistence; save ADR files only when the ADR gate requires one. Report saved paths. If a write is declined, blocked, or unavailable, return the save-ready artifact and the reason.
12. Update only existing, relevant repo-facing docs when the new spec or ADR changes how the repo is operated; ask before creating missing docs or indexes.
13. Produce a companion Claude Code execution prompt using `assets/claude-execution-prompt.md`.
14. Run a final self-check against `references/spec-rubric.md`.

## Claude Code integration

- Support both direct slash invocation as `/claude-spec-interviewer` and automatic loading from the description. Keep the interaction inline by default; do not assume a forked subagent unless the user asks for one.
- The interview can run in Claude Code Plan Mode. Treat the saved spec file as the durable artifact that outlives Plan Mode's session plan, and still persist it per `references/artifact-destinations.md`.
- Treat `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/**/*.md`, `~/.claude/rules/**/*.md`, and auto memory as evidence and constraints, not as the artifact format. Save implementation specs as spec files unless the user explicitly asks for a Claude Code rule and the repo convention supports it.
- Do not save implementation specs into `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules`, or auto memory by default. Offer to distill durable Claude instructions into a separate rule or memory artifact only when the user explicitly wants that.

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

- `references/question-bank.md` for interview questions.
- `references/spec-rubric.md` for mode selection and the final self-check.
- `references/source-challenge.md` for the source-backed challenge pass.
- `references/adr-gate.md` before deciding whether the spec needs a preceding ADR.
- `references/artifact-destinations.md` before proposing or saving spec and ADR paths.
- `references/rollout-checklist.md` when writing validation, rollout, and rollback sections.
- `assets/spec-template.compact.md` for small, low-risk work.
- `assets/spec-template.standard.md` for default feature, bugfix, refactor, or migration specs.
- `assets/spec-template.deep.md` for repo-wide, architectural, or phased work.
- `assets/claude-execution-prompt.md` for the companion implementation prompt.
- `assets/example-small-task.spec.md` and `assets/example-repo-refactor.spec.md` for output shape examples.

## Scripts

No bundled scripts.

## Output format

Return in this order:

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

- The final artifact is a concrete markdown spec, not a prose brainstorm or chat-only plan.
- The spec has explicit scope, constraints, validation, and done-when criteria, and acceptance criteria are testable.
- The spec is saved in the repository with a reported path, or is ready to save when persistence is explicitly declined or blocked.
- Required ADRs are saved using the repo's ADR path and filename pattern, or implementation is explicitly blocked before ADR creation.
- Missing facts are labeled as `unspecified`, and no unresolved blocking decision is hidden as a non-blocking assumption.
- Important requirements and implementation decisions were challenged against relevant repo evidence and current sources, or the reason for skipping the challenge is stated.
- Relevant existing repo-facing docs are updated when the spec or ADR changes repo operation or contributor expectations.
- A Claude Code execution prompt is included.

## Failure modes

- If the repository context is unavailable, produce a repo-agnostic spec and mark repo-specific details as `unspecified`.
- If the user's goal is internally inconsistent, stop and surface the conflict clearly.
- If validation commands cannot be determined, include a placeholder section labeled `unspecified`.
- If the requested scope is too large for one safe spec, split it into phases and say so.
- If the user declines persistence or a save is blocked, return the spec and any ADR draft in chat with the proposed path and the blocker.
- If a proposed artifact path already exists, ask before overwriting it.
- If current external docs cannot be reached, continue with repo evidence and mark the external-source check as unavailable.
- If a prior ADR or named requirement appears stale or wrong, propose a preceding ADR, spec update, or explicit maintainer decision instead of silently overriding it.
- If the ADR gate is uncertain, produce the spec with `ADR required: unresolved` and make implementation blocked on a maintainer decision.
- If the checkpoint is not verified, keep interviewing or stop with the spec uncreated.
- If the specs or ADR folder does not exist and the user does not approve creating or selecting one, stop before creating final artifacts.
- If the user asks to store the entire implementation spec in a Claude Code rule or memory file, explain the tradeoff and ask for explicit confirmation before doing so.
