---
name: codex-spec-interviewer
description: Interview, challenge, ADR-gate, and persist fuzzy coding requests into Codex-ready implementation specs. Use when a feature, bugfix, refactor, migration, repo-wide change, or architecture task needs user-verified requirements, source-backed decisions, durable architecture decisions, acceptance criteria, validation commands, rollout notes, saved spec/ADR files, and a Codex execution prompt. Do not use when already fully specified or when the user wants direct implementation now.
license: Apache-2.0
compatibility: Designed for Codex CLI, IDE extension, and Codex app. Works best with repo-local AGENTS.md and project docs.
metadata:
  author: stark-ai-de
  category: codex-operations
  version: "0.1.0"
---

# Codex Spec Interviewer

## Goal

Produce and persist a concrete implementation spec that Codex can execute with minimal ambiguity, minimal scope creep, explicit validation, explicit assumptions, a bounded source challenge, and ADRs for durable architectural decisions when needed. Do not finalize the spec until the user has verified the covered scope, assumptions, non-goals, risks, and artifact paths.

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
2. Identify artifact destinations before drafting:
   - Specs default to `docs/specs/<kebab-slug>-spec.md`.
   - ADRs default to `docs/adrs/NNNN-kebab-title.md`.
   - If a dedicated specs or ADR folder is missing, ask the user whether to create the default folder or use a different path. Suggest `docs/specs/` and `docs/adrs/` by default.
   - If the repo defines an ignored private specs subfolder, use it only for local-only drafts; use the tracked specs folder for shared implementation contracts.
   - Do not overwrite an existing spec or ADR without explicit user approval.
3. Inspect only the minimum repo context needed to avoid asking low-value questions.
4. Ask one high-impact question at a time by default when answers affect the next decision. Use a batch of up to 3 questions only when the questions are independent and low-friction.
5. Prefer answering discoverable questions from repo files, ADRs, docs, code search, MCP tools, or web sources instead of asking the user.
6. After each answer or evidence pass, summarize the current understanding, explicit assumptions, and remaining unknowns.
7. Continue interviewing until every material requirement, non-goal, edge case, validation path, rollout concern, and ADR implication is either source-backed, answered by the user, or explicitly accepted by the user as non-blocking follow-up.
8. Create a draft spec hypothesis, then challenge it against available sources:
   - repo instructions and `docs/agents/`
   - domain language such as `CONTEXT.md`
   - ADRs and prior decisions
   - existing code patterns and validation commands
   - official or current external docs when dependencies, APIs, frameworks, or best practices may have changed
9. Do not re-evaluate every settled decision. Challenge only decisions that materially affect correctness, safety, maintainability, or implementation strategy.
10. Run the ADR gate using `references/adr-gate.md`.
11. If a durable architectural decision is required, draft and persist a proposed ADR before or with the spec. Mark implementation blocked when the ADR is unresolved and materially affects implementation.
12. If the challenge invalidates a requirement or prior assumption, revise the spec, mark the conflict, or propose a preceding ADR/spec step before implementation.
13. Run a finalization checkpoint with the user. Present the scope, non-goals, assumptions, open questions, ADR result, validation plan, and exact spec/ADR paths. Ask whether anything material is missing or wrong.
14. Do not create the final spec until the user verifies the checkpoint as complete. Treat "100% confident" operationally: every material aspect is either verified by the user, backed by inspected sources, or explicitly recorded as non-blocking by the user.
15. Produce the final spec using the appropriate template:

- `assets/spec-template.compact.md`
- `assets/spec-template.standard.md`
- `assets/spec-template.deep.md`

16. Convert ambiguous requirements into explicit acceptance criteria. Prefer EARS-like phrasing when behavior must be testable.
17. Include scope, non-goals, touched files or areas, architectural decisions, constraints, source challenge findings, validation commands, risks, rollout notes, user verification, open questions, and done-when criteria.
18. Persist the spec to the selected spec path and persist any required ADR to the selected ADR path. If the target repo has an ADR index or spec index, update it.
19. Update only existing, relevant repo-facing docs when the new spec or ADR changes how the repo is operated. Put duplicated policy in one canonical file and add concise links from other documentation candidates. If a needed docs file or index is missing, ask before creating it and suggest the smallest useful location.
20. Produce a companion Codex execution prompt using `assets/codex-execution-prompt.md`.
21. Run a final self-check against `references/spec-rubric.md`, `references/source-challenge.md`, and `references/adr-gate.md`.

## Interview discipline

- Ask one high-leverage question at a time when the answer affects the next decision branch.
- Walk each material decision branch until it is resolved, source-backed, or explicitly accepted as non-blocking.
- Prefer inspecting repo files, docs, ADRs, code, issues, logs, or current sources over asking the user for discoverable facts.
- Do not finalize the spec until the user confirms shared understanding of scope, non-goals, assumptions, risks, validation, ADR result, and artifact paths.

## Artifact and documentation rules

- Spec filenames must be lowercase kebab-case and end with `-spec.md`. Examples: `admin-users-csv-export-spec.md`, `typed-api-client-migration-spec.md`, `queue-backed-worker-rollout-spec.md`.
- ADR filenames must follow the target repo's ADR pattern. If no pattern exists, use `NNNN-kebab-title.md` with the next sequential number.
- Specs are implementation contracts. ADRs are durable architecture or repo-policy decisions. Do not bury durable decisions only inside specs.
- Final artifacts must be saved to the repository. Do not only print final specs or ADRs in chat unless the filesystem is unavailable.
- If persistence is unavailable, explain the blocker and provide the exact path and content that still needs to be saved.
- If the selected specs folder is ignored by version control and the user expects a shared repo artifact, ask whether to keep it local-only, unignore that path, or choose a tracked docs path.
- For promotion-related work, update existing files that make the promoted state true for users and maintainers. Do this only when the requested work changes promotion, public catalog status, install behavior, or trigger behavior. Ask before creating missing docs, eval, changelog, install, or release-note files.
- For this skill itself, handle promotion/docs updates when changing its public contract, but do not add self-promotional copy unrelated to the requested change.

## Safety rules

- Do not invent repo facts, file paths, commands, APIs, or architecture. Mark them as `unspecified` when unknown.
- Do not hide uncertainty. State assumptions explicitly.
- Do not broaden scope beyond what the user asked for.
- Do not prescribe destructive migrations, data rewrites, or secret handling without explicit callouts and rollback notes.
- Do not include secrets, credentials, private identifiers, or internal-only data in examples.
- Do not produce ambiguous best-practices language when a concrete instruction or open question is needed.
- Prefer minimal, reversible implementation scope when the user's intent is unclear.
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

1. Persisted artifact paths
2. Interview summary and user verification result
3. Assumptions and unresolved questions
4. Source challenge summary
5. ADR gate result
6. ADR path when needed
7. Spec path and concise contents summary
8. Codex execution prompt
9. Validation commands
10. Risk and rollout notes

Do not paste the full final spec or ADR by default after they are saved. Print full artifact contents only when the user asks, when the environment cannot write files, or when the user needs a review before approval.

## Completion criteria

- The final artifact is a concrete markdown spec, not a prose brainstorm.
- The spec is saved in the repository using the selected spec path and filename pattern.
- Required ADRs are saved in the repository using the selected ADR path and filename pattern.
- The user verified the final checkpoint, or the run is explicitly blocked before spec creation.
- The spec has explicit scope, constraints, validation, and done-when criteria.
- Missing facts are labeled as `unspecified`.
- Acceptance criteria are testable.
- Important requirements and implementation decisions have been challenged against relevant repo evidence and current sources, or the reason for skipping the challenge is stated.
- Durable architectural decisions are captured in an ADR draft/path or explicitly classified as not needed.
- Relevant repo-facing docs are updated when the spec or ADR changes repo operation, promotion state, install behavior, or contributor expectations.
- A Codex execution prompt is included.

## Failure modes

- If the repository context is unavailable, produce a repo-agnostic spec and mark repo-specific details as `unspecified`.
- If the user's goal is internally inconsistent, stop and surface the conflict clearly.
- If validation commands cannot be determined, include a placeholder section labeled `unspecified`.
- If the requested scope is too large for one safe spec, split it into phases and say so.
- If current external docs cannot be reached, continue with repo evidence and mark the external-source check as unavailable.
- If a prior ADR or named requirement appears stale or wrong, do not silently override it; propose a preceding ADR, spec update, or explicit maintainer decision.
- If the ADR gate is uncertain, produce the spec with `ADR required: unresolved` and make implementation blocked on a maintainer decision.
- If the user does not verify the final checkpoint, keep interviewing or stop with the spec uncreated.
- If the specs or ADR folder does not exist and the user does not approve creating or selecting one, stop before creating final artifacts.
