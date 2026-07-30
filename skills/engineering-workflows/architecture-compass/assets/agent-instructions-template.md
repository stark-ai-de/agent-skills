# Agent Instructions

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this template conflicts or drifts.

## Accepted ADRs are binding

Within an implementation, refactoring, architecture review, dependency change, migration, or validation-policy scope already authorized by the user and repository/host controls:

1. Discover the canonical repository ADR index and Architecture Compass mapping.
2. Select applicable accepted ADRs by scope and trigger; record the task-specific Short, canonical Long, and optional Guide paths rather than loading the whole library.
3. Treat proposed decisions as pending and superseded decisions as history whose accepted successor governs.
4. Mention the ADRs that materially influence plans, reviews, changes, and final claims.
5. Implement only an approved scope that conforms to those decisions.

Applicable accepted ADRs bind the intended architecture only inside the authorized task. They never grant read, write, deployment, publication, production, destructive, or external-action authority. A conflicting architecture request remains blocked until it is resolved through the repository's accepted successor or adaptation process. Current code, examples, prompt wording, and general framework advice do not silently override an accepted ADR.

## Task-specific ADR paths

- ADR index or provider-to-local mapping used: `<repo-relative path>`
- Applicable local Short paths: `<repo-relative paths>`
- Applicable canonical Long paths: `<repo-relative paths>`
- Guides or approved examples needed for mechanics: `<repo-relative paths or none>`
- Selection evidence and excluded nearby ADRs: `<scope/trigger evidence>`

## Authority axes

- Host/repository instructions, permissions, protected paths, and safety constraints determine what the agent may do.
- Applicable accepted or superseding ADRs determine intended architecture.
- Architecture authority ranks independently: accepted target ADRs; specific canonical target documentation; ADR-linked approved target examples; consistent current implementation; adoptable provider decisions; then framework defaults.
- Current code and tests prove current state, not intended policy.
- A user request defines scope and may request a successor; it does not silently replace an accepted ADR.

## Required conflict warning and stop

If a requested change would violate an accepted ADR, stop the affected implementation and show:

```text
ADR conflict: the requested change would violate <ADR ID and title>.
Affected scope: <paths or boundary>.
Impact: <concrete architectural consequence>.
Required resolution: keep the accepted decision, accept a successor/adaptation, or withdraw the conflicting scope.
Execution status: blocked for the affected scope.
```

Continue only after the user or named decision owner resolves the conflict through the repository's documented ADR process. Never weaken, overwrite, split, or supersede an accepted ADR silently.

## Required workflow

1. Identify the affected boundary and protected state.
2. Read applicable ADRs and linked approved examples.
3. State constraints, permission boundary, exact paths, and validation.
4. Implement only approved reversible slices.
5. Verify behavior and ADR conformance at the owning boundary.
6. Update architecture documentation only when the accepted decision or public contract intentionally changes.

## Intent-bound workflows for stable public skills

Apply this section only when this repository publishes a stable public skill with two or more material user-selectable outcomes, workflow variants, or mutation scopes.

- Show the complete finite public workflows and their write or artifact scope on direct invocation.
- When task intent and authority are clear, state the selected workflow and rationale, then proceed within the already-authorized outcome and scope.
- When activation is bare or outcome, scope, persistence, or mutation authority is ambiguous, show the workflows and ask.
- Agent-initiated activation may select a relevant read-only route; it may select mutation only when the user's task already requests that outcome and scope.
- Do not add a recursive `auto` workflow.
- Keep deterministic capability detection, safety fallbacks, effort sizing, and host translation internal unless they change the user-visible outcome or authority boundary.
- Obtain separate approval for later destructive, paid, external, deployment, publication, or production actions when required.

## Validation evidence and check ownership

Apply this section when the repository has accepted the local decision mapped from AC-ADR-049.

- Repository-native validation receipt location: `<confirmed Spec, status, or evidence path>`.
- Before running checks, record the highest applicable risk, distinct proof obligations, cadence, one owner per obligation, reusable or invalidated receipts, and final aggregate gate.
- Reuse a receipt only when subject or artifact, relevant inputs, command/scenario, harness/config/fixtures/lockfile/toolchain, evidence stage, environment, status/result, and governing contract still match and no newer evidence contradicts it.
- Sub-agents run only assigned checks and return receipt fields, limitations, and invalidators. The lead reconciles them against the integrated candidate.
- Required local and pre-deployment gates precede environment proof. Prefer an exact-artifact representative Preview; use production only through an already-authorized low-risk fallback with safe data, observability, stop threshold, and rollback.
- A validation plan, Preview choice, or accepted ADR never grants deployment, publication, traffic, migration, or production authority.
- Do not create a permanent one-off smoke harness solely to imitate an otherwise sufficient one-time Preview or eligible production observation.

## Host convention note

Place this content into existing supported instruction surfaces such as `AGENTS.md`, `CLAUDE.md` or `.claude/rules`, and `.cursor/rules`. Do not classify `CONTEXT.md` as a Claude instruction file automatically.
