# ADR-0038: Expose finite skill workflows and permit intent-bound agent selection

ID: ADR-0038
Title: Expose finite skill workflows and permit intent-bound agent selection
Status: Accepted
Date: 2026-07-29
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: agent-skills, intent-routing, workflow-selection
Applies when: A stable public skill exposes multiple material user-selectable outcomes, workflow variants, or mutation scopes.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0037
Superseded by: None
Guide verified: 2026-07-29
Gist: Multi-workflow skills disclose finite choices while agents may route from clear intent and existing authority.

Variants: [Short](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.short.md) · [Long, canonical](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md) · **Guide**

This guide is non-normative. [Long](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

At activation, keep the public workflow set visible and classify the request before substantive work:

| Invocation evidence                                                                 | Route behavior                                                                            |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Direct invocation with one clear workflow, outcome, scope, and sufficient authority | Show the finite workflow set, announce the selected workflow and rationale, then proceed. |
| Agent-initiated activation for an already-authorized task                           | Show the finite workflow set, announce the matching workflow and rationale, then proceed. |
| Bare invocation, conflicting cues, or material ambiguity                            | Show the finite workflow set and ask the user to select or clarify.                       |
| Mutation implied but not requested                                                  | Use a relevant read-only route when one exists; otherwise ask.                            |

Use stable workflow names that describe user-visible outcomes. Do not expose `auto`, provider fallback, tool discovery, effort sizing, or host mechanics as public workflows unless they independently change the requested outcome or authority boundary.

An announcement should be compact and auditable:

```text
Available workflows: <complete finite set>
Selected: <workflow>
Reason: <task evidence>
Write scope: <read-only or exact authorized scope>
Expected artifacts: <chat and durable outputs>
Separate approvals: <remaining paid, external, destructive, deployment, or publication boundaries>
```

## Focused eval shape

For each multi-workflow skill, cover at least:

- clear direct intent selects and proceeds after an announcement;
- agent-initiated activation selects only within existing task authority;
- bare or conflicting intent exposes options and asks;
- mutation without authority does not select a mutating route; and
- later destructive, paid, external, deployment, publication, or scope-expanding work still asks separately.

Keep those evals beside the skill-specific contract. Do not maintain a central migration/disposition manifest.

## Verification

- Confirm the skill exposes one complete finite workflow inventory and no `auto` workflow.
- Confirm clear intent, ambiguity, and mutation-authority cases are deterministic.
- Confirm metadata and prompts name the same workflows.
- Run `npm run validate:skills` and every affected focused validator.

## Current references

- [Agent Skills specification](https://agentskills.io/specification) defines skill discovery and activation; this repository ADR defines workflow-selection authority.

## Revisit

Create a reciprocal successor if workflow-selection authority or ambiguity handling changes materially. A skill-specific workflow rename or implementation detail normally belongs in that skill's contract and focused evals.
