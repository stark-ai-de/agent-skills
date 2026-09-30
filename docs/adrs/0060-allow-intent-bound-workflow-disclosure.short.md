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
Variant: Short
Canonical variant: Long
Supersedes: ADR-0038
Superseded by: None
Guide verified: 2026-09-30
Gist: Keep the complete workflow inventory while showing only the selected route for clear authorized intent.

Variants: **Short** · [Long, canonical](0060-allow-intent-bound-workflow-disclosure.long.md) · [Guide](0060-allow-intent-bound-workflow-disclosure.guide.md)

## Decision

Every stable public skill with two or more material workflows must retain its complete finite workflow inventory in its public instructions. When the requested outcome, scope, and authority are clear, the agent announces the selected workflow and rationale and may proceed without enumerating unselected workflows or asking for a second selection. For a bare invocation, conflicting cues, or material ambiguity about outcome, scope, delivery, or mutation authority, the agent shows the complete inventory in documented order and asks the user to choose. An explicit request for options also shows the complete inventory but does not by itself authorize execution. Agent-initiated selection stays within the already-authorized outcome and scope; absent mutation authority, the agent selects a relevant read-only route or asks. No recursive `auto` workflow is added. Destructive, paid, external, deployment, publication, production, irreversible, and scope-expanding actions retain separate approval and safety boundaries.

## Context

ADR-0038 required the full workflow set to be shown at activation even for a clear request. This successor keeps the complete skill-local inventory and changes only when the agent must display all options.

## Consequences

- Good: clear authorized work starts with a concise selected-route announcement.
- Tradeoff: skills need focused clear, ambiguous, and options-only routing checks.
- Risk: ambiguous intent can be misclassified; the agent must ask when a material boundary is unclear.
