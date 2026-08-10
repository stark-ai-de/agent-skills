# AC-ADR-052: Persist Agent Governance Through Host-Neutral Repository Surfaces

ID: AC-ADR-052
Title: Persist Agent Governance Through Host-Neutral Repository Surfaces
Status: Accepted
Date: 2026-08-05
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: persistence, host-adapters, instructions, portability, authority
Applies when: Architecture Compass establishes or repairs durable governance, persists an approved plan, or selects an instruction surface across agent hosts.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Keep repository-native artifacts canonical and resolve host instruction surfaces from observed capability without silently writing the wrong host's file.

Variants: [Short](ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.short.md) · **Long, canonical** · [Guide](ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.guide.md)

## Context

AC-ADR-048 defines the bounded post-Plan persistence slice: after approval, Architecture Compass may save the approved specification and the minimum ADR, catalog, lineage, lock, or validator artifacts required by repository convention. AC-ADR-036 requires host adapters to observe instruction conventions and preserve one portable outcome contract. Neither decision alone determines how a skill should behave when it encounters a Codex, Claude, Cursor, or generic agent instruction surface that is absent, stale, unsupported, or from another host.

A host instruction file can affect future routing, but it is not automatically the canonical home for repository governance. Treating all files with similar names as interchangeable can write a Claude-only rule during a Codex task, put durable policy in an ignored global location, or mistake a prompt's mention of a path for evidence that the host will load it. Conversely, refusing every host adapter would make the skill unable to bind accepted repository rules where the active host actually supports them.

## Decision

Architecture Compass resolves persistence in two distinct stages.

First, it identifies the canonical repository-native artifact path from accepted local ADRs, repository instructions, established folder conventions, and the explicit approved write scope. Specs, ADRs, catalogs, lineage records, receipts, and other durable governance artifacts are written there. A host-specific file is not a substitute merely because it is easier to discover or is available globally.

Second, it resolves whether an active host instruction adapter may bind or mirror the already-authorized repository rule. The adapter inspects current host evidence, supported file names and scopes, precedence conventions, repository state, and write authority. Supported examples include `AGENTS.md`, `CLAUDE.md` or `.claude/rules`, `.cursor/rules`, Codex-specific metadata, or a generic repository instruction surface, but names alone do not establish support. A global host configuration is in scope only when the user explicitly authorizes that scope and the host's behavior is confirmed.

The precedence and boundaries are:

1. Accepted repository-local ADRs and repository-native instruction rules define the durable outcome and artifact path.
2. The active host adapter translates that outcome into a supported instruction surface only when current capability and scope evidence exists.
3. A host-global configuration is considered only with explicit global-scope authority, never by default.
4. The current prompt and transient session context can select the requested route but cannot create durable authority, activate an unsupported host mode, or override accepted repository policy.

When an expected surface is missing, stale, contradictory, ignored unexpectedly, outside the approved scope, or associated with another host, classify the adapter state as `unavailable` or `indeterminate` with the reason. Use a confirmed repository-native fallback when it preserves the approved outcome. If no honest fallback exists, stop the affected persistence operation and report the exact missing decision; do not silently create a foreign host file, rewrite accepted policy, or claim that the host will load an unverified path.

Persistence, presentation, and execution are separate contracts. Choosing `plain` or `enhanced` output does not select a persistence surface. Finding a supported instruction file does not grant permission to edit source, install tools, publish, deploy, or alter global configuration. User-defined output-style preferences and their cross-host precedence are deferred to a later decision; this ADR only governs how an already-approved artifact or instruction rule is persisted safely.

## Invariants

- Repository-native specs, ADRs, and evidence receipts remain the durable source of truth.
- Host capability, instruction precedence, filesystem existence, and write authority are reported as separate evidence facts.
- A host adapter cannot add a workflow, broaden approved paths, weaken a no-write boundary, or infer consent from a filename or prompt.
- No foreign-host instruction file is created solely because it resembles the active host's convention.
- Missing or indeterminate host evidence never upgrades a persistence claim to `verified`.
- Global and repository scopes remain distinct; a repository task cannot silently mutate a user's global configuration.

## Alternatives

- Chosen: repository-native canonical persistence with evidence-driven host adapters and a safe fallback or stop. This preserves portability while allowing supported instruction binding.
- Rejected: always write the active host's conventional file. Host detection and precedence can be wrong, and durable governance would become host-dependent.
- Rejected: always write every known host file. This expands scope, creates conflicting instructions, and violates separate host authority.
- Rejected: treat prompt text as persistence authority. A prompt cannot prove loader behavior, precedence, or filesystem scope.

## Consequences

- Benefit: one durable governance artifact can be used by multiple hosts without silent cross-host writes.
- Tradeoff: setup and Plan workflows perform a small capability and precedence check before persistence.
- Risk: an unusual host or repository convention may remain indeterminate. Reporting the limitation and stopping the affected write is safer than inventing a path.

## Acceptance

- A fixture with `AGENTS.md`, Claude, Cursor, and Codex surfaces identifies the active supported adapter without treating the other files as canonical replacements.
- A wrong-host-only fixture never writes the foreign surface and reports an unavailable or indeterminate adapter.
- A repository with an accepted native `docs/specs/` and `docs/adrs/` convention persists there even when a host-global directory exists.
- A global-scope write requires explicit authority and a separate receipt from repository-local persistence.
- A missing or contradictory surface preserves the approved no-write boundary and records the limitation in the final receipt.
