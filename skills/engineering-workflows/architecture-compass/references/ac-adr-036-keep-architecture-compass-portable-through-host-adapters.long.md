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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Preserve one Architecture Compass outcome contract and adapt only host collaboration controls.

Variants: [Short](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.short.md) · **Long, canonical** · [Guide](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.guide.md)

## Context

Codex, Cursor, Claude Code, and other hosts expose different planning modes, question controls, review surfaces, permission models, and agent-instruction conventions. Duplicating the Architecture Compass policy library for every host would drift. Treating one host's control names as universal would misreport capability and can weaken read-only or approval boundaries. The target repository still needs the same ADR mapping, architecture reconciliation, conflict handling, and evidence stages regardless of which host executes the workflow.

## Decision

Architecture Compass remains one portable skill with one setup, audit, ADR adoption, mapping, conflict-resolution, refactor, and evidence outcome contract across execution hosts.

At activation and every material transition, it detects or inspects the current host capabilities that matter to the selected route. A thin adapter translates:

- native planning or decision surfaces and their exit lifecycle;
- structured question or confirmation controls;
- review or diff-comment surfaces;
- read-only and write permission controls;
- supported agent-instruction files and precedence conventions;
- host-specific presentation metadata.

Adapters report capability and enforcement state from current evidence. Prompt text does not activate a host mode or grant permission. Planning and filesystem enforcement remain independent. When a native control is unavailable, explicitly declined, or indeterminate, the adapter uses the documented portable conversational or behavioral fallback only when that fallback preserves the same no-write, confirmation, and target outcome contract; otherwise it blocks.

The portable core owns public actions, provider routing, local ADR identity, accepted-history preservation, bounded execution, evidence staging, and final output. Adapters cannot add hidden public actions, infer a material user selection, broaden write scope, omit target evidence, or change the repository artifact. A host-specific Architecture Compass variant is justified only when trigger, target evidence, persisted output, safety boundary, or final handoff materially diverges and independent evals prove that one contract cannot represent both honestly.

## Invariants

- One canonical ADR library governs every host adapter.
- The confirmed action, profile or variant, write boundary, and expected artifacts stay host-independent.
- Host capability and permission states are observed separately and reported honestly.
- Fallback behavior preserves the same decision and no-write gates.
- Adapter failure cannot silently downgrade safety or invent a host feature.
- A future split follows the portability taxonomy and preserves migration provenance.

## Failure handling

When a required host control is unavailable or indeterminate and no equivalent safe fallback exists, stop the affected route and return a bounded handoff. When documentation and observed host behavior disagree, report the observed limitation and do not claim support. If adapter output would change the target contract, classify the divergence before adding a host-specific variant.

## Consequences

Architecture Compass remains discoverable and behaviorally comparable across hosts without maintaining policy copies. Maintainers must re-verify host controls, metadata, and fallbacks as products evolve and keep enough cross-host evidence to detect a genuinely material split trigger.
