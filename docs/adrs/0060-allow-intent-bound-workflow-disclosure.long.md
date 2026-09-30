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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0038
Superseded by: None
Guide verified: 2026-09-30
Gist: Keep the complete workflow inventory while showing only the selected route for clear authorized intent.

Variants: [Short](0060-allow-intent-bound-workflow-disclosure.short.md) · **Long, canonical** · [Guide](0060-allow-intent-bound-workflow-disclosure.guide.md)

## Decision

Every stable public skill with two or more material workflows must retain its complete finite workflow inventory in its public instructions. When the requested outcome, scope, and authority are clear, the agent announces the selected workflow and rationale and may proceed without enumerating unselected workflows or asking for a second selection. For a bare invocation, conflicting cues, or material ambiguity about outcome, scope, delivery, or mutation authority, the agent shows the complete inventory in documented order and asks the user to choose. An explicit request for options also shows the complete inventory but does not by itself authorize execution. Agent-initiated selection stays within the already-authorized outcome and scope; absent mutation authority, the agent selects a relevant read-only route or asks. No recursive `auto` workflow is added. Destructive, paid, external, deployment, publication, production, irreversible, and scope-expanding actions retain separate approval and safety boundaries.

## Why

- A clear request already identifies the user's intended outcome. Repeating unrelated options before acting adds noise without improving the authority check.
- The complete inventory remains available in the skill and must be shown when the user asks for options or the request needs a choice.
- Selection and action authority remain separate, so concise disclosure does not permit an installation or other mutation that the user did not request.

## Options

- Chosen: Conditional disclosure with a complete skill-local inventory, intent-bound selection, and explicit options handling.
- Rejected: Always enumerate every workflow at activation, because clear requests need only the selected route and its boundaries.
- Rejected: Hide the inventory entirely or introduce an `auto` workflow, because ambiguity and options requests need a stable, reviewable choice surface.
- Rejected: Infer mutation from a likely user goal, because likelihood is not authority.

## Consequences

- Good: Clear authorized requests can proceed with a concise, auditable route announcement.
- Good: Bare, ambiguous, and options-only requests expose all choices before any dependent work.
- Tradeoff: Skills need focused checks for clear intent, ambiguity, options-only disclosure, and unauthorized mutation.
- Risk: Incorrect intent classification could hide a relevant option or select a wrong route; the explicit-options path and fail-closed ambiguity rule limit that risk.

## Follow-up

- Update repository guidance and affected skill contracts without rewriting the historical decision text of ADR-0038.
- Keep public workflow inventories, scenario catalogs, and owning validators aligned with this decision.
