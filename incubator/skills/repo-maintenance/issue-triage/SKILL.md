---
name: issue-triage
description: Triage repository issues through a maintainer decision tree. Use when the user asks to classify issues, apply labels, identify missing information, mark ready-for-agent work, split vague reports, or clean up an issue inbox.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# Issue Triage

## Goal

Classify issues into actionable maintainer states, propose labels and responses, and identify what is needed before an agent or human should work on them.

## When to use

- The user asks to triage GitHub, GitLab, Linear, or markdown issues.
- An inbox needs labels, status, duplicate detection, or missing information checks.
- A vague issue needs to be split into smaller work items.

## When not to use

- The user asks for implementation rather than issue classification.
- The task is reviewing a pull request; use `pr-review`.
- The issue appears security-sensitive and should go through private reporting first.

## Inputs

- Issue title, body, comments, labels, assignees, linked PRs, and project state.
- Repository docs, contribution rules, issue templates, and label conventions.
- Live tracker data when the user asks for real issue changes.

## Inputs to inspect

- Inspect issue content, linked code/docs, existing labels, and tracker state needed to classify the issue.
- Check repository triage conventions before inventing labels.

## Process

1. Read the issue and linked context.
2. Determine category: bug, feature, docs, question, duplicate, wontfix, maintenance, or security.
3. Determine readiness: needs reporter, needs maintainer, ready for agent, ready for human, blocked, or duplicate.
4. Propose labels and a concise maintainer response.
5. Split broad issues into concrete follow-up issues when needed.
6. Ask for approval before applying labels, closing, assigning, or editing issues unless the user explicitly authorized those actions.

## Workflow

Use the process above to produce a proposed triage result first. Apply live issue changes only when the user has explicitly authorized that action.

## Decision points

- If reproduction steps are missing for a bug, mark `needs-info`.
- If expected behavior is a product decision, mark `needs-maintainer`.
- If scope and validation are clear, mark `ready-for-agent`.
- If the report may be security-sensitive, avoid public detail and escalate to the security policy.

## Safety rules

- Do not close or label live issues without approval.
- Do not expose security details in public responses.
- Do not promise timelines or maintainer commitments.

## References

Read only when needed:

- `references/triage-state-machine.md` for readiness states.
- `references/label-mapping.md` for common labels.

## Scripts

No bundled scripts.

## Output format

Return:

1. Triage decision
2. Category
3. Readiness state
4. Suggested labels
5. Missing information
6. Draft response
7. Recommended next action

## Failure modes

- If issue details are unavailable, ask for the issue body, URL, or tracker access.
- If live tracker permissions fail, return the proposed changes as a draft.
- If duplicate status is uncertain, name the suspected duplicate and evidence gap.

## Completion criteria

- Every issue has a category, readiness state, and next action.
- Proposed tracker changes are separated from actions already taken.
- Missing information is specific enough for the reporter or maintainer to answer.
