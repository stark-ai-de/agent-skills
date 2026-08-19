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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Keep repository-native artifacts canonical and resolve host instruction surfaces from observed capability without silently writing the wrong host's file.

Variants: [Short](ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.short.md) · [Long, canonical](ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Resolution checklist

1. Inspect the repository's accepted ADRs, instruction files, specs/ADR folders, ignore rules, and current dirty state without writing.
2. Record the repository-native destination for each approved artifact before inspecting host adapters.
3. Identify the active host and inspect only its documented instruction names, scopes, precedence, and loader behavior. Treat other host files as evidence, not as a write target.
4. Separate adapter capability (`supported`, `unavailable`, or `indeterminate`) from filesystem and write authority.
5. Persist the approved repository artifact first. Add a host adapter only when its scope is explicitly authorized and its behavior is confirmed.
6. Report the selected path, host surface, authority, evidence stage, and any fallback or limitation.

## Surface matrix

| Surface type                        | Typical purpose                             | Default treatment                                    |
| ----------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Repository ADR/spec/catalog/receipt | Durable governance and evidence             | Canonical when repository convention confirms it     |
| Repository instruction file         | Local routing or accepted guardrail binding | Use only under repository authority and target scope |
| Host-specific repository file       | Adapter for an active host                  | Use only after capability and precedence inspection  |
| Host-global configuration           | User-wide behavior                          | Separate explicit scope and approval; never implicit |
| Prompt/session context              | Current route selection                     | Transient; cannot create durable authority           |

## Evidence receipt pattern

Record a compact statement such as:

```text
Persistence: repository-native docs/specs/ and docs/adrs/ (confirmed)
Host adapter: Codex repository instruction surface (supported and in scope)
Global configuration: not inspected / not authorized
Fallback: plain repository artifacts; no foreign-host file written
Limit: Claude and Cursor surfaces were not used for this run
```

Do not claim that a file will be loaded merely because its name is conventional. Preserve `unavailable`, `indeterminate`, and `not run` states in the final receipt.

## Validation

Use focused fixtures for active-host selection, wrong-host handling, repository-native persistence, global-scope separation, and no-write behavior on indeterminate capability. Reconcile any delegated result against the current worktree before claiming persistence is verified.

## Sources

- [Agent Skills specification](https://agentskills.io/specification), verified 2026-08-05.
- [AC-ADR-036: Keep Architecture Compass Portable Through Host Adapters](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.long.md), verified 2026-08-05.
- [AC-ADR-048: Persist Approved Governance Before Planned Architecture Refactors](ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.long.md), verified 2026-08-05.
- [AC-ADR-004: Report Staged Evidence and Protect Public Outputs](ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md), verified 2026-08-05.

## Revisit

Create a successor when a host's persistence precedence, repository artifact contract, or user-configurable cross-host preference policy changes materially.
