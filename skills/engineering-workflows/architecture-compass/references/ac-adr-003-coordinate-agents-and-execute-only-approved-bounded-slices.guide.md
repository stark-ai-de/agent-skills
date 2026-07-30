# AC-ADR-003: Coordinate Agents and Execute Only Approved Bounded Slices

ID: AC-ADR-003
Title: Coordinate Agents and Execute Only Approved Bounded Slices
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: agent-lifecycle
Tags: collaboration, delegation, execution-boundary
Applies when: Architecture Compass delegates work, resumes an approved checkpoint, or executes a multi-file or phased change.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Keep one accountable lead, disjoint delegated ownership, and an exact approved execution boundary.

Variants: [Short](ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.short.md) · [Long, canonical](ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Delegation record

Create a compact ledger before assigning mutable work:

| Task             | Agent | Access    | Owned paths                 | Inputs              | Required report      |
| ---------------- | ----- | --------- | --------------------------- | ------------------- | -------------------- |
| Catalog build    | A     | write     | `references/adr-catalog.md` | accepted inventory  | links and self-check |
| Validator review | B     | read-only | none                        | schema and fixtures | findings only        |

Prefer reading or analysis tasks when file ownership would otherwise overlap. If two results feed one shared file, assign the shared file to the lead or one dedicated writer.

## Bounded execution checkpoint

Record:

```text
Requested outcome: <behavior>
Allowed paths: <exact list or validated narrow pattern>
Excluded state: <index, unrelated dirty files, external systems>
Required decisions: <accepted ADR IDs>
Permission transition: <state and evidence>
Validation: <commands and scenarios>
Stop conditions: <drift, new path, conflict, failing baseline>
Rollback: <revert or forward-fix boundary>
```

Immediately before the first edit, compare current `HEAD`, index-safe status, instructions, ADRs, targets, and validation with this checkpoint. A dirty worktree is not automatically a blocker, but overlapping or unexplained state is.

## Reconciliation pass

For each delegated result:

1. Confirm the report belongs to the current branch and content, not an earlier snapshot.
2. Inspect the final artifact rather than trusting a summary of intended edits.
3. Check applicable ADRs and path ownership.
4. Re-run or inspect the relevant validation from the lead context when feasible.
5. Mark the result `used`, `superseded`, `stale`, `missing`, or `out of scope`.
6. Base the final claim only on `used` results and current direct evidence.

## Phased delivery example

A governance migration can use one read-only inventory phase, one tool-compatible migration phase, one atomic cutover, and one release-preparation phase. Each phase gets a separate allowlist and gate. Passing the inventory phase does not authorize file deletion; passing local validation does not authorize publication.

## Worktree isolation example

This is a non-normative coordination example, not authority to create a checkout or choose its location. When the repository instructions and approved execution scope permit linked worktrees, consider one only for genuinely parallel writers whose same-codebase overlap justifies isolation. Sequential work, read-only analysis, or disjoint path ownership normally does not need another checkout.

Use the location required by the target repository. For example, a repository may require `<repo>/.worktrees/<name>` after confirming that scanners, build inputs, documentation generators, release inventories, ignore rules, and cleanup tooling safely exclude it. Do not substitute a sibling or external location when repository instructions prescribe a repository-local root.

If a worktree is authorized, its record can name owner, branch, purpose, path, expected lifetime, validation responsibility, and cleanup condition. Creation never implies authority to delete, prune, remove branches, or mutate another active checkout.

## Proportional planning validation example

Validation cadence and evidence reuse are governed by the target repository's adopted mapping of AC-ADR-049. A planning worksheet may begin with cheap objective invariants such as required identifiers, links, unique ownership, allowed statuses, and path shape, then add semantic review at the checkpoints justified by the slice's risk. This example creates no independent validation obligation.

Do not treat later-phase completeness as a baseline requirement before those artifacts are expected to exist. Promote a semantic concern into automation only when it has become objective and stable, prevents a recurring failure, or demonstrably saves more process cost than it adds.

## Decision lineage

- `generalizes`: [ADR-0029](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0029-keep-linked-worktrees-inside-the-repository.long.md).

## Useful references

- [Git status documentation](https://git-scm.com/docs/git-status)
- [Git worktree documentation](https://git-scm.com/docs/git-worktree)
- [Agent Skills specification](https://agentskills.io/specification)
