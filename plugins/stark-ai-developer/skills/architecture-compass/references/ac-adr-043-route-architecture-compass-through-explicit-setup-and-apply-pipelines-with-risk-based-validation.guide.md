# AC-ADR-043: Route Architecture Compass Through Explicit Setup and Apply Pipelines With Risk-Based Validation

ID: AC-ADR-043
Title: Route Architecture Compass Through Explicit Setup and Apply Pipelines With Risk-Based Validation
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, explicit-selection, setup, apply, validation
Applies when: Architecture Compass is activated, classifies setup or apply work, persists provider ADRs, or starts ADR-guided refactoring.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-026
Superseded by: AC-ADR-045
Guide verified: 2026-07-29
Gist: Preserve explicit Setup and Apply pipelines while adding risk-based validation to the fixed base profile.

Variants: [Short](ac-adr-043-route-architecture-compass-through-explicit-setup-and-apply-pipelines-with-risk-based-validation.short.md) · [Long, canonical](ac-adr-043-route-architecture-compass-through-explicit-setup-and-apply-pipelines-with-risk-based-validation.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls.

## Start checkpoint

```text
Architecture Compass selection required

Action: setup | apply
Setup profile: all | repo-relevant | base | none
Apply variant: audit | audit-and-adr-apply | audit-and-apply-refactor | none
Write scope: read-only | ADR governance only | ADR governance and approved refactor paths
Planning capability: <state and evidence>
Read-only enforcement: <state and evidence>
Expected artifacts: <exact list>
Protected state: <staged, unstaged, untracked, ignored, external>
Compatibility normalization: <none | refactor -> apply>
```

Prompt intent can populate this checkpoint but does not answer it. Wait for explicit confirmation before substantive work.

## Setup procedure

1. Inspect existing ADR, instruction, validation, evidence, and Git conventions.
2. For `all`, select every adoptable target-repository provider ADR. For `repo-relevant`, select by applicability and record deferrals. For `base`, select exactly 005, 006, 018, 019, 021, 022, and 042.
3. Allocate repository-native IDs without renumbering accepted records.
4. Record the `AC-ADR -> local ADR` mapping and every non-selected disposition.
5. For AC-ADR-042, record the existing repository-native receipt location. If none exists, propose the smallest fitting path and wait for confirmation before creating it.
6. Update supported agent instructions with ADR discovery, conflict stop, mapping, the receipt-location pointer, and the conditional public-skill selection guardrail when target evidence makes it applicable.
7. Validate only governance artifacts; Setup itself does not run implementation tests or environment probes.

Example mapping row:

```text
AC-ADR-042 -> ADR-<local>: adopted; validation receipts: <confirmed repo-native path>
```

## Conditional public-skill instruction check

After instruction discovery, inspect the target's public catalog, promotion or stability evidence, and skill choice surfaces. Classify the rule as:

- `applicable`: the target publishes a stable public skill with at least two material user-selectable outcomes, workflow variants, or mutation scopes;
- `not applicable`: no such stable public skill exists; or
- `indeterminate`: the available target evidence cannot establish stability or the material choice surface.

For Setup, preserve an equivalent instruction or add a generic rule that shows the complete finite material choices and waits for explicit confirmation before substantive work. For `apply audit`, report the classification and any missing, equivalent, or conflicting rule without writing. For a writing Apply variant, repair the rule only inside the confirmed instruction scope. An indeterminate result never writes the rule.

Do not count candidate or incubator skills, or internal host, capability, routing, fallback, or effort differences that do not change the user-visible outcome or authority boundary. Do not copy this repository's ADR identity or map this skill-runtime decision into the target. Link an existing target decision when one already governs the rule; if target policy requires a new ADR first, report a decision blocker instead of inventing one.

## Apply procedure

- `audit`: inspect and report only; never repair setup, write a spec, or run Preview/production probes.
- `audit-and-adr-apply`: audit and persist the selected governance artifacts only.
- `audit-and-apply-refactor`: audit, apply ADR governance, write the refactoring specification, confirm the complete bounded checkpoint once, then execute reversible slices until a stop condition.

Add these fields to a refactoring checkpoint when the local AC-ADR-042 mapping applies:

```text
Risk: low | moderate | high | critical
Cadence: reuse | final-batch | checkpointed | reproduce-first
Proof obligations and one owner each:
Reused receipts and reconciliation:
Invalidated receipts and targeted reruns:
Final aggregate gate:
Environment path: none | representative Preview | eligible production fallback
Separate external authorization: <evidence | absent>
```

## Evidence and authority reminders

- Setup adoption does not execute the adopted validation policy against application code.
- Audit remains read-only even if a Preview exists.
- A writing Apply checkpoint authorizes only its exact files and commands.
- Preview, deployment, production, publication, traffic, migration, and other external actions require their own authority.
- AC-ADR-042 defines Preview-first eligibility and production fallback; AC-ADR-004 defines evidence-stage claim limits; AC-ADR-022 defines promotion and rollback gates.

## Validation

This historical workflow does not create a standing validation command. Use the current AC-ADR-049 risk and proof-obligation contract, the owning boundary, and any explicit repository or user requirement. Do not run an aggregate merely because work is being finalized.

## Source

- [Agent Skills specification](https://agentskills.io/specification), verified 2026-07-28.

## Revisit

Create a successor if the public actions, profiles, Apply variants, mapping model, fixed base set, or validation-baseline integration changes. A change only to version-sensitive host mechanics belongs in this Guide.
