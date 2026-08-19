# AC-ADR-026: Route Architecture Compass Through Explicit Setup and Apply Pipelines

ID: AC-ADR-026
Title: Route Architecture Compass Through Explicit Setup and Apply Pipelines
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, explicit-selection, setup, apply
Applies when: Architecture Compass is activated, classifies setup or apply work, persists provider ADRs, or starts ADR-guided refactoring.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-002
Superseded by: AC-ADR-043
Guide verified: 2026-07-28
Gist: Require a confirmed finite Setup or Apply selection before Architecture Compass begins substantive work.

Variants: [Short](ac-adr-026-route-architecture-compass-through-explicit-setup-and-apply-pipelines.short.md) · [Long, canonical](ac-adr-026-route-architecture-compass-through-explicit-setup-and-apply-pipelines.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls action selection, write boundaries, ADR identity, conflict handling, and failure behavior.

## Suggested start checkpoint

```text
Architecture Compass selection required

Action: setup | apply
Setup profile: all | repo-relevant | base | none
Apply variant: audit | audit-and-adr-apply | audit-and-apply-refactor | none
Write scope: read-only | ADR governance only | ADR governance and approved refactor paths
Planning capability: <state and evidence>
Read-only enforcement: <state and evidence>
Expected artifacts: <paths or none>
Protected paths/state: <paths and current status>
Compatibility normalization: <alias/context or none>

Confirm this selection or change any field. No substantive work starts before confirmation.
```

Use a structured choice control when the host provides one. Otherwise ask for an explicit reply that names or confirms the action and profile/variant. Do not treat “use setup”, “audit this”, or another phrase in the activation prompt as the confirmation itself.

## Setup procedure

1. After confirmation, inspect existing ADR, agent-instruction, validation, and Git conventions.
2. For `all`, route every target-repository Short to its Long. For `repo-relevant`, select by `Applies when` and target evidence. For `base`, select 005, 006, 018, 019, 021, and 022.
3. Allocate repository-native IDs without renumbering accepted records.
4. Create an explicit mapping table in the target ADR index, setup report, or another canonical repository-owned governance file.
5. Record deferred candidates and triggers instead of hiding them.
6. Update existing supported instruction surfaces and validate links and conflict wording.

## Apply procedure

- `audit`: inspect and report; offer end, spec, or refactor; write nothing.
- `audit-and-adr-apply`: audit, bootstrap missing governance, persist mapping and local ADRs, validate, and stop before source refactoring.
- `audit-and-apply-refactor`: perform ADR Apply, build the bounded refactoring specification, obtain its architecture checkpoint, then execute approved slices until a stop condition.

Use the host-matched spec interviewer only for unresolved decisions or the refactoring specification. Its own lifecycle and persistence contract still applies.

## Host instruction surfaces

| Host or convention | Inspect/update when present                                  | Do not infer                                                       |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Portable/Codex     | `AGENTS.md`, scoped `AGENTS.md`                              | `CONTEXT.md` as agent instructions                                 |
| Claude Code        | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules`              | A new Claude file when the repo uses another supported convention  |
| Cursor             | `.cursor/rules`, legacy `.cursorrules` as migration evidence | Directly editable User or Team Rules without a documented artifact |

## Mapping and split example

```text
AC-ADR-005 -> ADR-0012 (adopted, Accepted)
AC-ADR-006 -> ADR-0013 (adapted, Accepted; local package names added)
Local ADR-0004 -> superseded by ADR-0012 and ADR-0014
ADR-0014 -> repository-only deployment ownership extracted from former ADR-0004
```

Keep the provider decision independently visible. The local companion can add repository-specific content, but neither a copy nor a split is permission to rewrite accepted history.

## Deviation warning shape

```text
ADR conflict: the requested change would violate <ADR ID and title>.
Affected scope: <paths or boundary>.
Impact: <concrete architectural consequence>.
Required resolution: keep the accepted decision, accept a successor/adaptation, or withdraw the conflicting scope.
Execution status: blocked for the affected scope.
```

## Verification

- Confirm the start checkpoint appears before substantive work in every action/profile/variant eval.
- Confirm audit fixtures leave tracked, untracked, index, generated, and external state unchanged.
- Confirm writing variants bootstrap missing setup and produce a repository-native mapping.
- Confirm accepted overlap uses split/successor handling and conflict fixtures stop rather than overwrite.
- Confirm agent-instruction fixtures cover `AGENTS.md`, Claude conventions, Cursor conventions, and the `CONTEXT.md` negative boundary.

## Decision lineage

- `adapts`: [ADR-0037](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0037-require-explicit-skill-option-selection.long.md).

## Current references

- [Agent Skills specification](https://agentskills.io/specification) for portable skill packaging and metadata.
- Use the current host's documented structured-question, planning, and permission controls; the skill does not claim those controls are portable or activated by prompt text.

## Revisit

Create a successor if the public action inventory, confirmation boundary, or ADR identity model changes. Keep `refactor` compatibility until usage evidence and a separately reviewed deprecation decision justify removal.
