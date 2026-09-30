# ADR-0060: Allow intent bound workflow disclosure

ID: ADR-0060
Title: Allow intent bound workflow disclosure
Status: Accepted
Date: 2026-09-30
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: agent-skills, intent-routing, workflow-selection
Applies when: A stable public skill exposes two or more material workflows or a user explicitly asks to see its workflow options.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0038
Superseded by: None
Guide verified: 2026-09-30
Gist: Keep the complete workflow inventory while showing only the selected route for clear authorized intent.

Variants: [Short](0060-allow-intent-bound-workflow-disclosure.short.md) · [Long, canonical](0060-allow-intent-bound-workflow-disclosure.long.md) · **Guide**

This guide is non-normative. [Long](0060-allow-intent-bound-workflow-disclosure.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Keep one complete, ordered inventory of material workflows in the public skill instructions. Classify intent and authority before starting substantive work:

| Request                                                               | Response                                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Clear setup, update, or diagnosis with sufficient scope and authority | Announce only the selected workflow, reason, target, expected effects, and protected state; proceed.              |
| Bare invocation, conflicting cues, or material ambiguity              | Show the complete inventory in order and ask for the missing choice.                                              |
| Explicit request to see options                                       | Show the complete inventory in order; do not select or execute merely because options were requested.             |
| Agent-initiated activation                                            | Select only an already-authorized outcome; use a relevant read-only route or ask when mutation was not requested. |

The inventory remains part of the public contract even when a clear request receives a shorter response. Keep separate approval boundaries for privileged, destructive, paid, external, deployment, publication, production, irreversible, and scope-expanding actions.

## Verification

- Check the public inventory is complete, finite, ordered, and has no recursive `auto` mode.
- Check clear intent announces the selected route and its authority boundary without a mandatory full menu.
- Check bare and ambiguous invocations expose every option and ask.
- Check an options-only request exposes every option without selecting or executing a workflow.
- Check mutation remains limited to the user's authorized outcome and scope.
- Run `pnpm run validate:adrs` and each affected skill's owning validator; distinguish source-contract checks from behavioral capture.

## Current references

- [ADR-0038](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.short.md) ([Long, canonical](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md) · [Guide](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.guide.md)) is historical after this successor.
- [Agent Skills specification](https://agentskills.io/specification) defines skill discovery and activation; this repository decision defines workflow disclosure and authority.

## Revisit

Create a reciprocal successor if disclosure triggers, workflow-selection authority, or the options-only boundary changes materially. Preserve this decision text.
