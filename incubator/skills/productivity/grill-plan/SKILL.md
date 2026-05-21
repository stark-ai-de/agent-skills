---
name: grill-plan
description: Relentlessly question a plan, design, migration, release, or repo maintenance proposal until assumptions, risks, constraints, and decision branches are clear. Use when the user wants to be grilled before implementation or wants a plan challenged.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: productivity
  internal: true
  version: "0.1.0"
---

# Grill Plan

## Goal

Pressure-test a plan before execution so hidden assumptions, risky branches, missing approvals, and validation gaps become explicit decisions.

## When to use

- The user asks to be grilled, challenged, or questioned before implementation.
- A migration, release, architecture change, or repo maintenance plan has unclear constraints.
- The user wants decision branches clarified before work starts.

## When not to use

- Do not use when the user has already asked for implementation and the plan is clear.
- Do not use for passive code review; use the relevant review skill.
- Do not use to delay an urgent fix when the blocking decision is already known.

## Inputs to inspect

- Inspect the plan, issue, PR, design doc, repo constraints, validation commands, and approval boundaries.
- Explore code or docs directly when a question can be answered from local evidence.

## Inputs

- The proposed plan, design, checklist, issue, PR, or release notes.
- Repo constraints, workflow docs, validation commands, and known risks.
- User goals, deadlines, approval boundaries, and rollback expectations.

## Process

1. Restate the objective and the riskiest assumption.
2. Ask focused questions that change the plan if answered differently.
3. Group questions by decision branch, not by curiosity.
4. Identify missing evidence, approvals, rollback plans, and validation.
5. Convert answers into a tightened plan or explicit blockers.
6. Stop when the next action is clear enough to execute or reject.

## Workflow

Use the process above, asking one high-leverage question at a time. End with a tightened plan, explicit blockers, or a decision that implementation should not proceed.

## Decision points

- If a question does not change the plan, omit it.
- If the plan can fail irreversibly, require an approval and rollback answer.
- If uncertainty is acceptable, mark it as a conscious risk instead of blocking.

## Safety rules

- Do not perform implementation while grilling unless the user switches modes.
- Do not overwhelm the user with a long questionnaire; ask the highest-leverage questions first.
- Do not treat assumptions as decisions.

## References

Read `references/questioning-rubric.md` when deciding which questions to ask first.

## Scripts

No bundled scripts.

## Output format

Return:

1. Restated objective
2. Highest-risk assumption
3. Focused questions
4. Decision branches
5. Tightened plan or blockers

## Completion criteria

- Key assumptions are explicit.
- The next execution step is clear.
- Remaining risks are accepted, mitigated, or blocked.

## Failure modes

- If the user wants implementation instead, stop grilling and switch to execution.
- If a question can be answered from the repo, inspect the repo instead of asking.
- If the plan is too broad, recommend splitting it before continuing.
