# AC-ADR-002: Select Actions, Resolve Authority, and Record Guardrail Adoption

ID: AC-ADR-002
Title: Select Actions, Resolve Authority, and Record Guardrail Adoption
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, authority, adoption, conflict-resolution
Applies when: Architecture Compass classifies a request, combines repository evidence, or proposes bundled guardrails.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Separate operational authority from architecture authority and record every applicable guardrail disposition.

Variants: [Short](ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.short.md) · [Long, canonical](ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Fast route selection

| Evidence                                                                              | Suggested route  |
| ------------------------------------------------------------------------------------- | ---------------- |
| User asks only whether code follows existing ADRs                                     | Audit            |
| User asks for findings on a PR, branch, or diff                                       | Review           |
| Accepted ADR and exact slice already determine the change                             | Direct execution |
| Ownership, public contract, runtime, data flow, stack, or adoption remains unresolved | Decision route   |

After selecting a preliminary route, inspect repository identity, instructions, status, governing ADRs, target paths, and validation commands without mutating state. Reclassify before any write when that evidence changes the route.

## Working authority map

Keep operational and architectural evidence in separate columns:

| Constraint      | Source              | Axis                  | Applies to       | Result           |
| --------------- | ------------------- | --------------------- | ---------------- | ---------------- |
| Read-only task  | Current request     | Operational           | Entire run       | No edits         |
| ADR-0007        | Accepted target ADR | Architecture          | Package boundary | Required shape   |
| Existing folder | Current code        | Architecture evidence | Touched package  | Drift or example |

This makes a common conflict visible: an agent may be allowed to edit a file while still being blocked from choosing an ADR-incompatible design.

## Adoption worksheet

For each catalog match with `Scope: target-repository` and `Adoptable: true`, record:

| ADR        | Applies | Disposition              | Target evidence        | Persisted rule or future trigger | Rationale owner          |
| ---------- | ------- | ------------------------ | ---------------------- | -------------------------------- | ------------------------ |
| AC-ADR-NNN | yes     | adopt/adapt/defer/reject | path or user statement | exact rule or trigger            | maintainer when rejected |

Useful checks:

- `adapt` names the semantic delta and the target ADR or rule that owns it.
- `defer` names a condition such as a second deployable, trusted-write path, or public package consumer.
- `reject` records explicit maintainer rationale rather than an agent inference.
- A catalog `Applies when` mismatch uses `defer` and names the future applicability trigger; it does not omit the row.

## Conflict report shape

```text
Conflict: <short name>
Operational source: <instruction, permission, or scope>
Architecture source: <accepted ADR or canonical doc>
Blocked outcome: <specific implementation or adoption decision>
Required resolution: <scope change, successor ADR, or maintainer choice>
```

## Official sources

- [Agent Skills specification](https://agentskills.io/specification)
- [MADR: when to write an architecture decision record](https://adr.github.io/madr/decisions/0001-record-architecture-decisions.html)
