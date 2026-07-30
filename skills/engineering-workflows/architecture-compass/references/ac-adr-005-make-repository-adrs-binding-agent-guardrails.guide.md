# AC-ADR-005: Make Repository ADRs Binding Agent Guardrails

ID: AC-ADR-005
Title: Make Repository ADRs Binding Agent Guardrails
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: adr-governance, agent-instructions, conflict-resolution
Applies when: A repository uses or is adopting ADR governance for architecture-affecting implementation, refactoring, or review.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Make accepted repository ADRs discoverable and binding for architecture-affecting agent work.

Variants: [Short](ac-adr-005-make-repository-adrs-binding-agent-guardrails.short.md) · [Long, canonical](ac-adr-005-make-repository-adrs-binding-agent-guardrails.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Adoption procedure

1. Discover the repository's existing instructions, ADR directories, index, architecture docs, stack rules, and approved examples.
2. Preserve an established naming and location convention unless a separately accepted migration changes it.
3. Ensure the index exposes status and successor relationships without requiring readers to scan every ADR.
4. Add a concise agent-instruction section that points to the index, states accepted-decision authority, requires conflict reporting, and asks final reports to name applied ADRs.
5. Test the workflow with one representative architecture question and one deliberate conflict.

For a new repository, start with only the decisions needed for its first deployable slice. Record unresolved choices as proposed or open rather than manufacturing a complete architecture.

## Task discovery worksheet

| Task boundary         | Search terms             | Candidate ADR | Status   | Applies | Loaded evidence          |
| --------------------- | ------------------------ | ------------- | -------- | ------- | ------------------------ |
| Public package export | package, export, runtime | ADR-NNNN      | Accepted | yes     | Long plus linked example |

After discovery, keep only applicable accepted decisions in the implementation rule map. Retain proposed or superseded records as context when they explain an unresolved choice or migration.

## Adapt examples without importing assumptions

Treat an ADR-linked example as evidence for the decision it demonstrates, not as a repository template. Before reusing it:

1. map its owner, runtime audience, trust boundary, and public contract to the target;
2. adapt aliases, package names, framework-reserved paths, and local naming conventions;
3. preserve authorization, lifecycle, cleanup, and compatibility responsibilities; and
4. re-verify version-sensitive APIs against the target lockfile and primary documentation.

Do not mix fragments from conflicting examples. Record the conflict, follow the applicable accepted decision, and either adapt one coherent example or stop for a durable decision.

## ADR gate examples

| Observed change                                                | Repository action                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Apply an existing accepted decision                            | No new ADR; cite the decision and validate the implementation.                   |
| Refresh version-sensitive syntax without changing the decision | Update its non-normative guide and verification date.                            |
| Introduce a durable boundary with no governing decision        | Propose one repository-native ADR before implementation.                         |
| Intentionally change an accepted decision                      | Use the repository's replacement or amendment process before conflicting code.   |
| Repair code that drifted from an accepted decision             | Use separately authorized refactor scope; do not rewrite the ADR after the fact. |

## Agent-instruction shape

```md
## Architecture decisions

- Discover active decisions through `<adr-index>` before architecture-affecting work.
- Treat applicable accepted ADRs as binding; follow accepted successors.
- Report a conflict before implementing an ADR-incompatible request.
- Name materially applied ADRs in the final report.
```

Adapt paths and terminology to the repository. Keep decision detail in the ADR rather than copying it into the instruction file.

## Review checks

- Can an unfamiliar agent find active decisions from the repository root?
- Does the index distinguish Accepted, Proposed, Superseded, and Rejected?
- Does the active index expose the governing accepted replacement without making historical records active authority?
- Do referenced examples agree with the canonical decision?
- Would deleting a checklist or template lose policy? If so, move that policy into an ADR.

## Official sources

- [MADR overview](https://adr.github.io/madr/)
- [MADR: record architecture decisions](https://adr.github.io/madr/decisions/0001-record-architecture-decisions.html)
- [Agent Skills specification](https://agentskills.io/specification)
