---
name: issue-plan-slicer
description: Convert a spec, roadmap item, or rough plan into independently implementable issue slices with scope, dependencies, acceptance criteria, and validation. Use when the user asks to split work into GitHub issues, local markdown tasks, or agent-ready implementation chunks.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  internal: true
  version: "0.1.0"
---

# Issue Plan Slicer

## Goal

Turn a broad plan into small, ordered, independently reviewable work items that an agent or maintainer can execute safely.

## When to use

- The user asks to split a spec, roadmap item, issue, PRD, or migration into tasks.
- Work needs GitHub issue drafts, local markdown tasks, or agent-ready implementation slices.
- Dependencies, acceptance criteria, and validation need to be made explicit.

## When not to use

- The user wants immediate implementation of a narrow task.
- The plan is still too ambiguous to slice and needs product discovery first.
- The user asks for live issue creation but has not authorized tracker mutations.

## Inputs to inspect

- The source spec, issue, PRD, roadmap item, or conversation context.
- Existing `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/validation.md` when present.
- Existing issue templates and labels under `.github/`.
- Relevant ADRs and domain docs for boundaries and terminology.

## Workflow

1. Identify the desired outcome and non-goals.
2. Extract dependencies, risky assumptions, validation commands, and docs impact.
3. Split work into vertical slices that can be reviewed independently.
4. Mark blockers and sequencing; avoid slices that require hidden context from prior tasks.
5. Draft each issue with title, scope, acceptance criteria, validation, and out-of-scope notes.
6. If the issue tracker is unknown, produce local markdown drafts instead of tracker-specific commands.
7. Ask before creating, labeling, assigning, or closing live issues.

## Safety rules

- Do not mutate issue trackers without explicit user authorization.
- Do not create vague tasks such as "clean up code" without acceptance criteria.
- Do not hide critical dependencies in prose; make them part of the slice.
- Do not assume labels or project boards that are not documented.

## References

Use downstream `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` as hard dependencies for tracker-specific output. If they are missing, default to local markdown issue drafts.

## Scripts

No bundled scripts.

## Output format

Return:

1. Source plan summary
2. Proposed issue order
3. Issue drafts with title, scope, acceptance criteria, validation, and dependencies
4. Tracker assumptions
5. Open questions

## Completion criteria

- Each slice can be implemented and reviewed independently.
- Dependencies and sequencing are explicit.
- Validation is attached to each slice.
- Live tracker mutation is either authorized and reported or not performed.

## Failure modes

- If the plan is too ambiguous, ask targeted questions before slicing.
- If one slice grows too large, split it by observable behavior or ownership boundary.
- If tracker docs are missing, avoid tracker-specific labels and commands.
