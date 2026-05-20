---
name: prd-writer
description: Write a concise PRD or implementation brief from current context, separating problem, solution, user stories, decisions, testing, rollout, and out of scope. Use when the user asks for a PRD, product brief, implementation brief, or spec handoff.
license: MIT
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# PRD Writer

## Goal

Create a clear product or implementation brief that preserves decisions, unresolved questions, scope, validation, and non-goals.

## When to use

- The user asks for a PRD, implementation brief, product spec, or handoff spec.
- Current conversation context needs to become a durable planning artifact.
- Engineering, product, validation, and rollout expectations need one shared document.

## When not to use

- The user only needs an ADR for a narrow repo-level decision.
- The task is ready for implementation and does not need a planning artifact.
- The user asks for a marketing document rather than product or engineering scope.

## Inputs to inspect

- Current conversation, existing specs, issues, roadmap items, ADRs, and domain docs.
- User goals, constraints, target users, non-goals, and known decisions.
- Existing validation commands and release process when relevant.

## Workflow

1. Identify the audience and artifact type: PRD, implementation brief, or handoff spec.
2. Separate problem, goals, non-goals, proposed solution, decisions, and open questions.
3. Write user stories or use cases only when they clarify behavior.
4. Include acceptance criteria and validation commands.
5. Add rollout, migration, observability, docs, or support notes only when relevant.
6. Keep unresolved questions explicit instead of pretending decisions are final.
7. Ask before writing files unless the user requested a file update.

## Safety rules

- Do not invent product decisions to make the brief look complete.
- Do not bury out-of-scope items in footnotes.
- Do not include private customer data, internal hostnames, or secrets.
- Do not turn implementation details into requirements unless the user decided them.

## References

No bundled references. Use local domain docs and ADRs when present so terminology and decisions match the repository.

## Scripts

No bundled scripts.

## Output format

Return or write:

1. Problem
2. Goals
3. Non-goals
4. Users or stakeholders
5. Proposed solution
6. User stories or workflows
7. Decisions
8. Open questions
9. Acceptance criteria
10. Validation and rollout

## Completion criteria

- The document distinguishes facts, decisions, and open questions.
- Scope and out-of-scope items are visible.
- Acceptance criteria are testable.
- The artifact is short enough for future agents to use.

## Failure modes

- If the problem is unclear, ask for the target user and failed current workflow.
- If solution and requirements are mixed, separate them before drafting.
- If decisions conflict with ADRs or domain docs, surface the conflict.
