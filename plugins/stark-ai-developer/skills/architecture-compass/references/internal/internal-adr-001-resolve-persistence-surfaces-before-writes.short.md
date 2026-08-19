# AC-INTERNAL-001: Resolve Persistence Surfaces Before Writes

> Internal implementation record. This triplet is not a public Architecture Compass ADR, is excluded from the public catalog, and cannot override an accepted public Long decision.

ID: AC-INTERNAL-001
Title: Resolve Persistence Surfaces Before Writes
Status: Accepted
Date: 2026-08-05
Owner: stark-ai-de
Scope: skill-runtime-internal
Category: implementation-policy
Tags: architecture-compass, persistence, host-adapters, write-boundary
Applies when: Architecture Compass must persist a specification, ADR, index, receipt, or other durable artifact before or during a governed write.
Adoptable: false
Visibility: Internal
Public catalog: Excluded
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Resolve the repository-native persistence path and its evidence before writing, treating host instruction files as adapters rather than implicit authority.

Variants: **Short** · [Long, canonical](internal-adr-001-resolve-persistence-surfaces-before-writes.long.md) · [Guide](internal-adr-001-resolve-persistence-surfaces-before-writes.guide.md)

## Decision summary

Before a write, inspect the target repository's confirmed artifact conventions and classify every candidate persistence surface as canonical, host-adapter, unavailable, mismatched, or indeterminate. Write the durable artifact only to a confirmed canonical path within the approved scope. After that path is resolved, a supported active-host adapter may separately bind or mirror the already-authorized rule only when the applicable public decision, current host evidence, target precedence, and exact write authority all permit it. Host-specific files never silently replace the canonical artifact or grant authority. Missing or conflicting evidence falls back to a confirmed repository convention or stops with a bounded handoff.

## Invariants

- Accepted public Architecture Compass Long decisions remain authoritative; this record only routes implementation mechanics.
- A prompt, host label, or adapter capability never grants write permission or changes the target artifact contract.
- The selected path, evidence, scope, and limitation are reported with the write receipt.

## Consequences

- Cross-host runs avoid writing an unrecognized or wrong-host instruction file.
- Path discovery adds a small inspection step and can stop a run when repository authority is genuinely indeterminate.
