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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-05
Gist: Resolve the repository-native persistence path and its evidence before writing, treating host instruction files as adapters rather than implicit authority.

Variants: [Short](internal-adr-001-resolve-persistence-surfaces-before-writes.short.md) · **Long, canonical** · [Guide](internal-adr-001-resolve-persistence-surfaces-before-writes.guide.md)

## Context

Architecture Compass can run under hosts that expose different instruction files, metadata, planning controls, and permission surfaces. A repository may also define its own canonical locations for specifications, ADR triplets, indexes, generated receipts, or other governance artifacts. Writing to the first path named by a host-specific instruction can produce a file that the target does not load, put policy in the wrong host's surface, or make a durable change without evidence that the path is authoritative.

The portable public contract already requires canonical ADR triplets and staged evidence, while host differences remain adapter concerns. Approved post-Plan governance persistence is also a bounded workflow slice. This internal record supplies the implementation sequence that resolves those boundaries before a tool writes; it does not add a public artifact type, workflow, or authority.

Current public authority for this record is provided by:

- [AC-ADR-051](../ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces.long.md), which governs public and internal decision namespaces, promotion, and exclusion from public routing.
- [AC-ADR-004](../ac-adr-004-report-staged-evidence-and-protect-public-outputs.long.md), which keeps evidence stages and public-output limits explicit.
- [AC-ADR-036](../ac-adr-036-keep-architecture-compass-portable-through-host-adapters.long.md), which keeps host translation inside adapters and preserves one portable outcome contract.
- [AC-ADR-038](../ac-adr-038-gate-optional-capabilities-and-tool-side-effects.long.md), which keeps optional capabilities and side effects approval-gated.
- [AC-ADR-048](../ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.long.md), which bounds post-Plan persistence to the approved governance slice.
- [AC-ADR-052](../ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces.long.md), which makes repository-native artifacts canonical and host instruction surfaces evidence-driven adapters.

[AC-ADR-001](../ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.long.md) remains linked only as superseded historical context for the canonical triplet contract; it is not a current routing authority.

If a change would alter any of those public outcomes or write boundaries, this record is insufficient; propose or adopt the applicable public successor instead of extending this file.

## Decision

Architecture Compass implementations resolve persistence in the following order before any write:

1. **Name the artifact and authority.** Identify whether the intended write is a specification, ADR triplet, index, receipt, instruction binding, or another repository artifact. Confirm the workflow and exact approved write scope independently of host presentation state.
2. **Inspect repository-native conventions.** Read the repository instructions, existing sibling artifacts, indexes, and accepted ADR conventions that are in scope for the selected workflow. Treat an existing canonical path and its naming/ownership rules as stronger evidence than a generic host default.
3. **Classify candidate surfaces.** Record each candidate as `canonical`, `host-adapter`, `unavailable`, `mismatched`, or `indeterminate`:
   - `canonical` is a repository-confirmed durable location for the named artifact;
   - `host-adapter` is an instruction or metadata surface used to translate behavior, not the durable target unless the repository explicitly makes it canonical;
   - `unavailable` is documented or observed as unsupported in the current host;
   - `mismatched` belongs to another host, workflow, or artifact contract; and
   - `indeterminate` lacks enough current evidence to authorize a write.
4. **Select the canonical artifact path.** Write the durable artifact only to a `canonical` path that is within the user-approved scope and compatible with the active public decision. If several canonical candidates remain, use the repository's stated precedence; otherwise stop and ask for the missing authority. Do not create a new root-level convention merely to avoid the stop.
5. **Resolve an optional adapter binding separately.** After the canonical artifact path is known, classify whether a supported active-host adapter may bind or mirror the already-authorized rule. Permit that separate adapter write only when the applicable public decision, current host capability, target precedence, and exact adapter path are all confirmed inside the approved scope. Otherwise skip the adapter or stop when it is required for the approved outcome.
6. **Apply the bounded writes.** Recheck protected state and every exact canonical or separately authorized adapter path immediately before mutation. Preserve unrelated staged, unstaged, untracked, ignored, and external work. A host's prompt or mode label cannot expand the approved scope.
7. **Report the resolution.** The receipt names the canonical artifact path, any separately selected adapter path, authority evidence, validation performed, and every unavailable or indeterminate surface. A failed or skipped persistence check remains failed or skipped; it is never reported as canonical or adapter-bound by implication.

Host-specific files—including `AGENTS.md`, `CLAUDE.md`, `.claude/rules`, `.cursor/rules`, and Codex metadata—may be inspected or updated only when the target repository explicitly confirms that file as the selected adapter or durable artifact, the current host supports the operation, and the exact path is authorized. An adapter binding or mirror remains separate from the canonical repository-native artifact unless accepted target policy makes that host surface canonical. A skill must not silently create a Claude-only file during a Codex run (or the inverse), and an instruction that names an unavailable or wrong-host surface must not be treated as a write destination.

When repository conventions are absent, contradictory, stale, or host-incompatible, the implementation chooses the safest confirmed repository-native fallback if one exists. Otherwise it stops before mutation and returns a bounded handoff that states the missing decision, candidate paths, and evidence required to resume.

## Invariants

- Public canonical Long decisions control user-visible outcomes, artifact identity, safety boundaries, and write authority; internal guidance never overrides them.
- Repository-native paths are canonical only when current target evidence confirms their role; historical examples, prompt wording, and host defaults are not sufficient.
- Adapter capability and persistence authority are reported separately. A supported host surface does not prove that it is the target's durable path.
- Every write has an exact allowlist, a pre-write state check, and a receipt that distinguishes observed, skipped, unavailable, stale, and indeterminate evidence.
- A conflict between an internal rule and an accepted public decision stops the affected route and is escalated for a public successor; it is not resolved by silently preferring this file.

## Failure handling

- **Wrong-host instruction:** classify the surface as `mismatched`, use a confirmed repository-native path when the artifact contract is clear, and report the mismatch. Do not create or modify the wrong-host file.
- **Missing repository convention:** stop before writing unless an already accepted public decision and current target evidence identify one unambiguous canonical path. Return a copy-ready handoff for the missing convention.
- **Conflicting paths or precedence:** stop the affected write, preserve protected state, and report each candidate and the authority conflict.
- **Stale or incomplete evidence:** mark the path `indeterminate`; refresh only through an authorized read-only inspection. Do not infer canonical status from an old receipt.
- **Protected-state drift:** preserve completed disjoint artifacts when safe, but stop before touching paths whose authority or content changed materially.
- **Internal/public disagreement:** follow the accepted public Long decision and open a successor or implementation update; never make the internal record the de facto override.

## Alternatives

- **Chosen: evidence-first repository-native resolution.** It keeps durable artifacts portable while allowing each host's instruction surface to remain an adapter.
- **Rejected: always write the active host's global or project instruction file.** Host identity does not prove target authority and can create the wrong file or broaden scope.
- **Rejected: accept the first path mentioned by the user or prompt.** Prompt wording is intent evidence, not repository governance or write permission.
- **Rejected: add a new generic persistence root for Architecture Compass.** It would compete with target conventions and create another policy layer without a public decision.

## Consequences

- **Benefit:** Codex, Claude, Cursor, and generic-host runs can share one persistence contract without silently crossing instruction surfaces.
- **Tradeoff:** Every governed write carries a short path-resolution inspection and a more explicit receipt.
- **Risk:** A repository with weak or contradictory conventions may stop more often. The stop is safer than persisting a durable artifact where the target will not recognize it.

## Acceptance

- A fixture with `docs/specs/` and `docs/adrs/` conventions selects those paths even when a host-specific instruction names another file.
- A Codex run confronted with a Claude-only persistence instruction classifies it as `mismatched` and does not create `CLAUDE.md` or `.claude/rules` without target evidence and authority.
- A repository with no confirmed convention returns a bounded handoff rather than inventing a path.
- A supported active-host adapter binds or mirrors an already-authorized rule only after the canonical artifact is resolved and separate adapter capability, precedence, scope, and path authority are confirmed.
- Receipts distinguish canonical, host-adapter, unavailable, mismatched, and indeterminate states and include the exact write scope.
- A synthetic internal/public conflict follows the accepted public Long decision and records the need for a successor.
