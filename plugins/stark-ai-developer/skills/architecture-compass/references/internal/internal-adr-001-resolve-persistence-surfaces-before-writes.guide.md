# AC-INTERNAL-001: Resolve Persistence Surfaces Before Writes

> Internal implementation record. This Guide is non-normative, is excluded from the public Architecture Compass catalog, and cannot override the canonical Long decision or any accepted public ADR.

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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Resolve the repository-native persistence path and its evidence before writing, treating host instruction files as adapters rather than implicit authority.

Variants: [Short](internal-adr-001-resolve-persistence-surfaces-before-writes.short.md) · [Long, canonical](internal-adr-001-resolve-persistence-surfaces-before-writes.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls. Current public authority remains with [AC-ADR-051](../ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces.long.md), [AC-ADR-036](../ac-adr-036-keep-architecture-compass-portable-through-host-adapters.long.md), [AC-ADR-038](../ac-adr-038-gate-optional-capabilities-and-tool-side-effects.long.md), [AC-ADR-048](../ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.long.md), and [AC-ADR-052](../ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.long.md). [AC-ADR-001](../ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.long.md) is retained only as superseded historical context and is not a current routing authority.

## Pre-write record

Capture this small record before invoking a write tool:

| Field                  | Required value                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Artifact               | `spec` · `adr-triplet` · `index` · `receipt` · `instruction-binding` · other named artifact |
| Workflow and authority | selected public workflow plus the user-approved write boundary                              |
| Repository convention  | path and evidence that make it canonical                                                    |
| Host surface           | host file or metadata used as an adapter, or `none`                                         |
| Surface state          | `canonical` · `host-adapter` · `unavailable` · `mismatched` · `indeterminate`               |
| Exact write allowlist  | repository-relative paths only                                                              |
| Protected state        | staged, unstaged, untracked, ignored, and external work to preserve                         |
| Validation             | focused check and resulting evidence stage                                                  |
| Limitation/next action | missing authority, unsupported host, or follow-up handoff if applicable                     |

## Resolution procedure

1. Inspect the target's instructions, sibling artifacts, indexes, and accepted ADR metadata without changing them.
2. Locate the repository-native path for the named artifact. Confirm naming, ownership, triplet linkage, and index rules where applicable.
3. Record host-specific instruction files separately. They translate execution behavior and do not become durable targets by default.
4. If a candidate belongs to another host, mark it `mismatched`; if support or precedence cannot be observed, mark it `indeterminate`.
5. Write the durable artifact only when one `canonical` path is confirmed and within the approved allowlist.
6. Resolve any active-host adapter binding as a separate second-stage write. Require current adapter capability, target precedence, applicable public authority, and the exact adapter path in the approved allowlist; otherwise skip it or stop if it is required for the approved outcome.
7. Recheck protected state immediately before each write and report canonical and adapter paths separately alongside the resulting artifact receipt.

## Common cases

| Observation                                                                            | Safe handling                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository documents `docs/specs/` and `docs/adrs/`; active host has optional metadata | Use the repository paths; bind or mirror through host metadata only when its capability, precedence, and separate path authority are confirmed. |
| A Codex run finds a rule that says “persist under `.claude/rules/`”                    | Mark the rule `mismatched`; do not create the Claude surface unless the target explicitly confirms it and the current host can author it.       |
| A target has several plausible ADR directories with no precedence                      | Stop before the write and return candidate paths plus the missing authority.                                                                    |
| A previous receipt says a path was canonical but current files disagree                | Mark the old evidence stale and refresh read-only evidence before deciding.                                                                     |

## Receipt fragment

Use a compact, text-readable report such as:

```text
Persistence: canonical
Artifact: <spec | ADR triplet | index | receipt>
Path: <repository-relative path(s)>
Authority: <repository convention or accepted decision>
Host adapter: <none | observed surface>
Scope: <exact allowlist>
Validation: <focused check and evidence stage>
Limitation: <none or explicit limitation>
Next action: <none or bounded handoff>
```

Do not call a host adapter “canonical” merely because it was available. Do not claim a write succeeded when the path was skipped, unavailable, mismatched, or indeterminate.

## Validation

Use the owning repository's focused checks for the artifact type after the write. At minimum verify:

- the selected path is inside the approved allowlist;
- no wrong-host file was created or modified;
- linked triplet members and indexes remain coherent; and
- the receipt states the observed evidence stage and any limitation.

If these checks cannot establish canonical ownership, stop and report rather than broadening the write.
