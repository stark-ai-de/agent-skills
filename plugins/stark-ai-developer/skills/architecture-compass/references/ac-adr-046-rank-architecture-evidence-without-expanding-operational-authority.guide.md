# AC-ADR-046: Rank Architecture Evidence Without Expanding Operational Authority

ID: AC-ADR-046
Title: Rank Architecture Evidence Without Expanding Operational Authority
Status: Accepted
Date: 2026-07-29
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: authority, evidence-ranking, conflict-resolution, governance
Applies when: Architecture Compass combines user intent, target-repository decisions, documentation, implementation evidence, provider decisions, or framework guidance.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Rank architecture evidence independently from the permissions that limit execution.

Variants: [Short](ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.short.md) · [Long, canonical](ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls.

## Evidence worksheet

Architecture evidence rank:

1. accepted or superseding target ADR;
2. specific canonical target architecture, stack, or agent documentation;
3. ADR-linked approved target example;
4. consistent current implementation;
5. applicable adoptable provider decision; and
6. current general framework default.

Keep a small working table:

| Rule                        | Provenance     | Applies to       | Strength    | Target decision | Notes                   |
| --------------------------- | -------------- | ---------------- | ----------- | --------------- | ----------------------- |
| Keep route entrypoints thin | target ADR     | App Router route | `required`  | ADR-NNNN        | Current route matches   |
| Prefer a local helper       | provider Guide | one package      | `preferred` | not adopted     | Re-evaluate after reuse |

Use `required` for an accepted binding rule, `preferred` for a documented default with a permitted evidence-backed deviation, `example` for shape guidance, and `assumption` for an unverified input that cannot justify broad mutation.

## Conflict record

```text
Conflict: <short name>
Operational authority: <allowed and blocked actions>
Architecture source A: <path, status, and scope>
Architecture source B: <path, status, and scope>
Impact: <blocked outcome and affected paths>
Recommendation: <follow accepted rule, adapt, defer, reject, or create target successor>
Decision owner: <role or repository authority>
Disjoint work: <safe to continue or blocked>
```

Do not use precedence wording to hide a real conflict. Explain why the lower-ranked source is drift, guidance, or an adoption candidate.

## Target examples and provider examples

Use a target example first only when it is consistent with accepted target decisions. When a provider example is useful, adapt aliases, package names, file placement, and runtime syntax while preserving the governing responsibility and trust boundary. Never copy a snippet blindly across stacks.

During Setup, an incompatible provider candidate remains visible as `adapt`, `defer`, or `reject`. During Audit or Refactor, it does not become target authority until the target repository accepts it.

## Sources

- [Agent Skills specification](https://agentskills.io/specification), verified 2026-07-29.
- [Repository agent instructions](https://github.com/stark-ai-de/agent-skills/blob/main/AGENTS.md), verified 2026-07-29.
