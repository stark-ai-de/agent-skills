---
name: codex-spec-interviewer
description: Interview, source-challenge, verify, save, and ADR-gate fuzzy coding requests into Codex-ready implementation specs. Use when a feature, bugfix, refactor, migration, repo-wide change, or architecture task needs one-question-at-a-time clarification, source-backed requirements, durable architecture decisions, acceptance criteria, validation commands, rollout notes, and a Codex execution prompt. Do not use when already fully specified or when the user wants direct implementation now.
license: Apache-2.0
compatibility: Designed for Codex CLI, IDE extension, and Codex app. Works best with repo-local AGENTS.md and project docs.
metadata:
  author: stark-ai-de
  category: codex-operations
  version: "0.1.1"
---

# Codex Spec Interviewer

## Goal

Produce a user-verified implementation spec that Codex can execute with minimal ambiguity, minimal scope creep, explicit validation, explicit assumptions, a bounded source challenge, and ADRs for durable architectural decisions when needed. Save every final spec file using the repo's clear convention or a confirmed destination. Save ADR files only when the ADR gate requires one. Be opinionated about persistence, but ask before creating new structures, using ambiguous destinations, overwriting files, or writing ADRs.

## When to use

- The user has a rough idea but not a production-ready implementation spec.
- The task spans multiple files, multiple concerns, or requires tradeoff decisions.
- The request needs acceptance criteria, validation commands, rollout notes, or risk handling.
- The user wants a reusable written artifact before implementation begins.
- The repository has local rules in `AGENTS.md`, repo docs, or existing patterns that should be reflected in the spec.
- The proposed requirements, feature shape, ADR assumptions, or implementation approach should be briefly challenged against repo reality and current external sources before coding begins.
- The work may introduce or supersede a durable architectural decision that should be captured before implementation.

## When not to use

- The user already provided a complete implementation spec with files, constraints, tests, and acceptance criteria.
- The task is a tiny one-file edit that can be implemented directly without meaningful ambiguity.
- The user wants brainstorming only and does not want a concrete implementation artifact.
- The task is primarily a policy, legal, or business-decision document rather than a coding implementation plan.

## Inputs to inspect

- The current user request and any follow-up answers.
- Relevant `AGENTS.md`, `README.md`, issue descriptions, ADRs, ADR template/rules, repo docs, and `docs/agents/` files.
- Existing specs, plans, requirements, PRDs, and named requirements the user wants preserved or challenged.
- Existing file layout, naming conventions, scripts, package manager, lint/test/type-check commands, and CI expectations.
- Current framework, library, API, platform, or standards documentation through available MCP tools or web search when the decision depends on up-to-date behavior.
- Any error messages, screenshots, logs, PR feedback, or example files the user supplied.
- Bundled templates and references in this skill.

## Workflow

1. Classify the requested effort as `compact`, `standard`, or `deep`.
2. Inspect only the minimum repo context needed to avoid asking low-value questions.
3. During the initial repo pass, note persistence destinations without pausing the interview:
   - use explicit user-provided folders only when the user asks for them
   - otherwise check for existing spec and ADR structures in the repository
   - if one clear existing spec convention is found, use it and report the path in the verification checkpoint
   - defer destination confirmation to the final checkpoint unless a user-provided path needs clarification, no clear convention exists, multiple plausible conventions exist, public/private placement is ambiguous, the target directory must be created, an overwrite is needed, or an ADR file would be written
   - if no structure exists, suggest the smallest conventional spec and ADR structure at the final checkpoint
   - if the user explicitly declines persistence, return the final spec and any ADR draft in chat instead of writing files
4. Ask one high-impact question at a time by default when answers affect the next decision. Use a batch of up to 3 questions only when the questions are independent and low-friction.
5. Prefer answering discoverable questions from repo files, ADRs, docs, code search, MCP tools, or web sources instead of asking the user.
6. After each answer or evidence pass, summarize the current understanding, explicit assumptions, and remaining unknowns.
7. Create a draft spec hypothesis, then challenge it against available sources:
   - repo instructions and `docs/agents/`
   - domain language such as `CONTEXT.md`
   - ADRs and prior decisions
   - existing code patterns and validation commands
   - official or current external docs when dependencies, APIs, frameworks, or best practices may have changed
8. Do not re-evaluate every settled decision. Challenge only decisions that materially affect correctness, safety, maintainability, or implementation strategy.
9. Run the ADR gate using `references/adr-gate.md`.
10. If a durable architectural decision is required, draft the ADR, identify the required ADR path, and mark implementation blocked until the ADR is accepted when the spec depends on that decision.
11. If the challenge invalidates a requirement or prior assumption, revise the spec, mark the conflict, or propose a preceding ADR/spec step before implementation.
12. Stop interviewing when the remaining uncertainty is low enough to save a usable implementation spec. Material unknowns must be resolved, marked non-blocking, or marked blocking; do not force compact specs through deep rollout closure unless risk requires it.
13. Before finalizing or saving artifacts, present a verification checkpoint with scope, non-goals, assumptions, risks, validation plan, ADR result, and artifact path basis. Ask whether anything material is missing or wrong; pause for an explicit answer only when a material decision, ambiguous destination, overwrite, new directory, or ADR write is involved.
14. If the checkpoint identifies a material gap, continue the interview or source challenge before producing final artifacts.
15. Produce the final spec using the appropriate template:

- `assets/spec-template.compact.md`
- `assets/spec-template.standard.md`
- `assets/spec-template.deep.md`

16. Convert ambiguous requirements into explicit acceptance criteria. Prefer EARS-like phrasing when behavior must be testable.
17. Include scope, non-goals, touched files or areas, architectural decisions, constraints, source challenge findings, validation commands, risks, rollout notes, open questions, artifact paths, and done-when criteria.
18. Produce a companion Codex execution prompt using `assets/codex-execution-prompt.md`.
19. Save the final spec file unless the user explicitly declined persistence. Save an ADR file only when the ADR gate requires one and the user has not declined persistence. Report saved paths. If a write is declined, blocked, or unavailable, return the save-ready artifact and the reason.
20. Run a final self-check against `references/spec-rubric.md`, `references/source-challenge.md`, `references/adr-gate.md`, and `references/artifact-destinations.md`.

## Safety rules

- Do not invent repo facts, file paths, commands, APIs, or architecture. Mark them as `unspecified` when unknown.
- Do not hide uncertainty. State assumptions explicitly.
- Do not broaden scope beyond what the user asked for.
- Do not prescribe destructive migrations, data rewrites, or secret handling without explicit callouts and rollback notes.
- Do not include secrets, credentials, private identifiers, or internal-only data in examples.
- Do not produce ambiguous best-practices language when a concrete instruction or open question is needed.
- Prefer minimal, reversible implementation scope when the user's intent is unclear.
- Do not use an ambiguous destination, overwrite existing files, create new artifact directories, or write ADR files without confirmation. ADR files still require the ADR gate.
- Do not use web or MCP lookup as ceremony. Use it when current facts, package behavior, API guidance, platform constraints, security posture, or best practices can materially change the spec.
- Prefer official documentation, primary sources, repo-local docs, and source code over secondary commentary.
- Do not create ADRs for feature behavior, UI details, one-off implementation choices, routine refactors under existing architecture, test cases, or validation commands.
- Do not silently override an existing ADR. Propose a superseding ADR when a durable decision changes.

## References

Read only when needed:

- `references/question-bank.md` for interview questions.
- `references/spec-rubric.md` before finalizing the spec.
- `references/source-challenge.md` for the source-backed challenge pass.
- `references/adr-gate.md` before deciding whether the spec needs a preceding ADR.
- `references/artifact-destinations.md` before proposing or saving spec and ADR paths.
- `references/rollout-checklist.md` for testing and phased rollout guidance.
- `assets/spec-template.compact.md` for small, low-risk work.
- `assets/spec-template.standard.md` for default feature, bugfix, refactor, or migration specs.
- `assets/spec-template.deep.md` for repo-wide, architectural, or phased work.
- `assets/codex-execution-prompt.md` for the companion implementation prompt.
- `assets/example-small-task.spec.md` and `assets/example-repo-refactor.spec.md` for output shape examples.

## Scripts

No bundled scripts.

## Output format

Return in this order:

1. Interview summary
2. Assumptions and unresolved questions
3. Source challenge summary
4. ADR gate result
5. Final verification checkpoint and result
6. Artifact paths and persistence status
7. ADR draft or ADR path when needed
8. Saved spec path plus a concise summary, or full save-ready markdown when file persistence is blocked
9. Codex execution prompt
10. Validation commands
11. Risk and rollout notes

## Completion criteria

- The final artifact is a concrete markdown spec, not a prose brainstorm or chat-only plan.
- The spec has explicit scope, constraints, validation, and done-when criteria.
- Missing facts are labeled as `unspecified`.
- Acceptance criteria are testable.
- Important requirements and implementation decisions have been challenged against relevant repo evidence and current sources, or the reason for skipping the challenge is stated.
- No unresolved blocking decision is hidden as a non-blocking assumption.
- Durable architectural decisions are captured in a persisted ADR when required, an ADR draft/path when acceptance is blocked, or explicitly classified as not needed.
- The spec is saved in the repository with a reported path, or is ready to save without further restructuring when file persistence is explicitly declined or blocked.
- A Codex execution prompt is included.

## Failure modes

- If the repository context is unavailable, produce a repo-agnostic spec and mark repo-specific details as `unspecified`.
- If the user's goal is internally inconsistent, stop and surface the conflict clearly.
- If validation commands cannot be determined, include a placeholder section labeled `unspecified`.
- If the requested scope is too large for one safe spec, split it into phases and say so.
- If the user explicitly declines persistence, return the spec and any ADR draft in chat.
- If the spec cannot be saved, return the proposed path, save-ready markdown, and the blocker.
- If a proposed artifact path already exists, ask before overwriting it.
- If current external docs cannot be reached, continue with repo evidence and mark the external-source check as unavailable.
- If a prior ADR or named requirement appears stale or wrong, do not silently override it; propose a preceding ADR, spec update, or explicit maintainer decision.
- If the ADR gate is uncertain, produce the spec with `ADR required: unresolved` and make implementation blocked on a maintainer decision.
