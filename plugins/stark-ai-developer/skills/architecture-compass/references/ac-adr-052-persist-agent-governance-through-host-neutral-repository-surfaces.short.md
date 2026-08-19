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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Keep repository-native artifacts canonical and resolve host instruction surfaces from observed capability without silently writing the wrong host's file.

Variants: **Short** · [Long, canonical](ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.long.md) · [Guide](ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.guide.md)

## Decision summary

Architecture Compass resolves a durable artifact's repository-native path before considering host-specific instruction adapters. `AGENTS.md`, `CLAUDE.md` or `.claude/rules`, `.cursor/rules`, Codex metadata, and similar files are host-scoped adapters, not interchangeable canonical storage. Missing, stale, contradictory, or wrong-host instructions are reported as indeterminate; the skill uses a confirmed repository convention or stops the affected write rather than silently creating a foreign host file.

## Invariants

- Accepted local ADRs and repository-native conventions govern durable artifact paths.
- Host capability, instruction presence, and filesystem write authority are observed separately.
- A prompt cannot activate an unsupported host mode or authorize a global configuration write.
- Persistence does not change rendering profile, execution permission, or external-action approval.

## Consequences

- Specs, ADRs, and receipts remain portable across Codex, Claude, Cursor, and generic hosts.
- Host adapters require current capability evidence and may stop when the repository's persistence authority is ambiguous.
