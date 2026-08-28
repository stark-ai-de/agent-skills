# ADR-0054: Select repository runtimes through an advisory evidence matrix

ID: ADR-0054
Title: Select repository runtimes through an advisory evidence matrix
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: bun, evidence, matrix, nodejs, runtime, tooling
Applies when: Selecting or changing the runtime for a repository executable, composed task, build, transient CLI, action, or deployable.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0034
Superseded by: None
Guide verified: 2026-08-26
Gist: Rank runtime candidates per execution boundary without turning incomplete evidence into a repository gate.

Variants: [Short](0054-select-repository-runtimes-through-an-advisory-evidence-matrix.short.md) · **Long, canonical** · [Guide](0054-select-repository-runtimes-through-an-advisory-evidence-matrix.guide.md)

## Decision

The repository will maintain an advisory evidence matrix for each current execution boundary, start relevant JavaScript/TypeScript tooling from ADR-0053's Bun candidate, and encode the best evidenced supported winner in the owning command or workflow. Unknown or non-material matrix signals do not block work; actual command results and mandatory repository checks determine failure.

## Why

- AC-ADR-014 selects runtimes and hosts from evidence for the concrete executable or deployable.
- AC-ADR-058 and ADR-0053 deliberately provide a Bun-first repository-tooling candidate and a verified-fallback contract.
- A repository-owned matrix makes their coordination inspectable without treating the existence of an ADR as compatibility proof.
- Advisory unknown cells preserve honest gaps while mandatory executable and repository checks remain fail-closed.
- Encoding the winner in the owning command prevents callers from silently choosing a different runtime.
- Each boundary records candidates, material signals, a winner, evidence references, rationale, fallback order, and a revisit trigger.
- The fastest supported winner must preserve correctness, operational behavior, security, upstream contracts, and required platform coverage; performance alone is insufficient.
- Signals may be `pass`, `fail`, `unknown`, or `not-applicable`; malformed declarations, unclassified current boundaries, winner/command drift, and undocumented fallbacks remain invalid.
- Changing a winner updates the matrix, owning command, focused evidence, and affected docs together without rewriting ADR-0053 unless package ownership or Bun's candidate status changes.

## Options

- Chosen: advisory per-boundary matrix with command-aligned winners and mandatory fallback evidence.
- Rejected: make Bun universal. That would override framework, upstream, security, and deployable evidence.
- Rejected: require every matrix cell before commands can run. That would turn missing non-material observations into process gates unrelated to correctness.
- Rejected: leave exceptions only in package scripts. That would hide why a runtime differs and when it should be revisited.

## Consequences

- Benefit: AC-ADR-014 and AC-ADR-058 remain independently useful and jointly actionable.
- Benefit: Bun wins compatible repository boundaries while narrow Node.js and upstream-runtime exceptions stay explicit.
- Benefit: Incomplete evidence remains visible without blocking otherwise verified work.
- Tradeoff: The matrix and owning command must change together whenever a winner changes.
- Tradeoff: Candidate comparisons require focused evidence rather than a single repository-wide benchmark.
- Risk: Stale evidence can preserve a weaker winner; revisit triggers and current command failures reopen the boundary.
