# AC-ADR-036: Keep Architecture Compass Portable Through Host Adapters

ID: AC-ADR-036
Title: Keep Architecture Compass Portable Through Host Adapters
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: agent-lifecycle
Tags: architecture-compass, portability, host-adapters, capabilities
Applies when: Architecture Compass translates planning, questions, review, permissions, or instruction conventions across execution hosts.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Preserve one Architecture Compass outcome contract and adapt only host collaboration controls.

Variants: [Short](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.short.md) · [Long, canonical](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls Architecture Compass portability.

## Adapter record

| Capability            | Observed host surface | State/evidence | Portable fallback               | Blocks when |
| --------------------- | --------------------- | -------------- | ------------------------------- | ----------- |
| Planning/decision     |                       |                | conversational checkpoint       |             |
| Structured question   |                       |                | explicit textual confirmation   |             |
| Review                |                       |                | read-only findings              |             |
| Read-only enforcement |                       |                | behavioral no-write gate        |             |
| Write permission      |                       |                | explicit permission handoff     |             |
| Agent instructions    |                       |                | repository-supported convention |             |

Keep host product names and exact transition commands in a verified adapter table or eval, not in the portable outcome contract. Test both native and fallback lanes. A prompt that says “enter Plan mode” is only a request; use the host control and wait for observed confirmation when the route requires it.

## Capability state handling

Planning capability and read-only enforcement are independent. Resolve each from observed host state:

| Planning state           | Action for a Plan workflow                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `Active`                 | Continue planning without repository mutation; do not request another Plan transition.         |
| `Available but inactive` | Request the native transition and wait for observed activation.                                |
| `Unavailable`            | Use the documented conversational checkpoint with the same approval and no-write contract.     |
| `Explicitly declined`    | Honor the refusal; use a compatible non-Plan workflow or stop, and do not ask again unchanged. |
| `Indeterminate`          | Stop and verify capability; do not assume the fallback lane.                                   |
| `Not applicable`         | Continue only on a workflow that does not require planning.                                    |

| Read-only state          | Action for `audit` or planning inspection                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `enforced`               | Use the enforced lane and keep mutation outside the turn.                                          |
| `available but inactive` | Activate it before a check that may otherwise write.                                               |
| `unavailable`            | Use a behavioral no-write gate only for commands proven non-mutating.                              |
| `explicitly declined`    | Honor the refusal; proceed only if the same no-write contract remains enforceable, otherwise stop. |
| `indeterminate`          | Stop before any potentially mutating check.                                                        |
| `not applicable`         | Valid only when the selected route does not promise read-only operation.                           |

## Index-safe state evidence

Inspect Git state without intentionally refreshing or changing the index:

Use `git --no-optional-locks status --short --untracked-files=all` as the visible index-safe status snapshot command.

```bash
git rev-parse HEAD
git --no-optional-locks status --short --untracked-files=all
git ls-files --stage | sha256sum
git diff --cached --binary | sha256sum
git diff --binary | sha256sum
```

Record staged, unstaged, untracked, ignored, and external state separately. A new index digest or staged-diff digest is material drift: stop and report it rather than staging, unstaging, resetting, or reconstructing concurrent work.

## Bounded continuation examples

| Workflow            | Portable continuation boundary                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `setup`             | Persist only the selected repository-native governance artifacts, validate them, report mappings and dispositions, then stop.            |
| `audit`             | Inspect read-only, return prioritized findings and evidence limits, and do not repair them.                                              |
| `refactor`          | Recheck state and authority, edit only the governed paths, validate the bounded slice, then report.                                      |
| `plan-refactor`     | Approve in Plan mode; after exit, persist only the approved spec plus required ADR/index artifacts, validate and report them, then stop. |
| `plan-run-refactor` | Persist the same approved governance slice, recheck state, then implement only the unchanged approved plan.                              |

## Split check

Compare the candidate host lane against [AC-ADR-035](ac-adr-035-classify-skill-portability-before-choosing-host-variants.short.md). Different button names, metadata files, or question APIs normally remain adapter concerns. Different target state, required evidence, persisted artifact, safety contract, or final execution output can justify a variant.

Use [AC-ADR-037](ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction.short.md) when execution-host routing could change the target contract or when shared gateway extraction is proposed; host adaptation and gateway isolation remain separate decisions.

## Decision lineage

- `adapts`: [ADR-0024](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md).

## Current references

- [Agent Skills specification](https://agentskills.io/specification)
- [AC-ADR-048 workflow routing Guide](ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.guide.md)

## Revisit

Create a successor if Architecture Compass gains a materially different host outcome contract. Refresh adapter evidence whenever a host changes its collaboration or permission surface.
