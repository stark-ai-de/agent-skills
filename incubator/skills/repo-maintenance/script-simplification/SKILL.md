---
name: script-simplification
description: Inventory and simplify repository scripts with caller evidence, smaller ownership boundaries, standard tools where they preserve the full contract, and focused validation. Use when asked for script cleanup, unused commands, duplicate wrappers, or excessive automation logic. Skip performance tuning without a maintenance goal and broad repo health audits.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: repo-maintenance
  internal: true
  version: "0.2.0"
---

# Script Simplification

## Goal

Reduce the number of mechanisms a maintainer must understand while preserving
the behavior and safeguards that callers rely on. A shorter diff alone is not
evidence of improvement.

## When to use

- The user asks to simplify, consolidate, or remove repository scripts or CLI
  entry points.
- A script duplicates a workflow, package command, generated wrapper, or
  standard tool and its actual use needs checking.
- Several repositories need separately reviewable script cleanup.

## When not to use

- The task is only runtime performance tuning, dependency updates, or a broad
  health audit without a script-maintenance goal.
- A focused failed pipeline needs diagnosis first; use the repository's CI
  debugging workflow.
- A change primarily decides architecture or moves runtime ownership; use the
  repository's architecture workflow before script cleanup.
- The only proposed change is a language port, line-count reduction, or new
  helper framework with no demonstrated maintenance benefit.

## Workflow selection

The complete workflow set is:

- `assess`: inventory scripts and recommend changes without writing files or
  invoking write-capable checks.
- `simplify`: implement and validate a bounded script cleanup that the user
  already authorized.

For clear authorized intent, announce the selected route and scope and proceed.
An assessment, review, or recommendation request selects `assess`, not
`simplify`. On bare activation, ambiguous cleanup intent, or an options request,
show both workflows and ask; an options request alone authorizes no execution.
Do not infer merge, deployment, publication, tool installation, or external
operations from permission to edit scripts or create a PR. Preserve host Plan
and no-write controls. The steps below stay within the selected route.

## Inputs to inspect

- User scope and authorization; exact repository, default branch, worktree,
  uncommitted changes, and repository instructions or accepted decisions.
- Script files and generated sources, package commands, CI and release jobs,
  docs, runbooks, operator commands, and tests that invoke them.
- Required outputs, side effects, authentication, ownership, size/time bounds,
  concurrency behavior, error handling, and pinned tool versions.

## Workflow

1. Establish the current source and rules. For multiple repositories, record
   independent baselines and changes; respect the requested order and give each
   repository its own reviewable diff. Do not manufacture a change where none
   is useful.
2. Inventory every Python, shell, JavaScript/TypeScript, PowerShell, Nix
   generated, package-manager, and embedded workflow script in scope, including
   non-ignored untracked files. Record exclusions and unreadable paths; do not
   follow symlinks outside scope. Separate
   runtime helpers, operator commands, tests, fixtures, and generated copies. Use
   [the inventory and decision guide](references/inventory-and-decisions.md).
3. Trace each proposed removal or consolidation through static callers and
   manual operations. Search workflows, package scripts, docs, runbooks, and
   platform-specific entry points. Treat absence from source imports as
   insufficient proof of non-use. Unknown external or operator callers block
   removal until their contract is resolved.
4. Compare alternatives against the whole contract. Prefer an existing tool or
   framework function only when it preserves required auth, evidence, limits,
   errors, and side effects with less maintenance. Keep small domain-specific
   coordinators, safety checks, and stable public entry points when needed.
5. In `assess`, report the proposed change and stop before editing. In
   `simplify`, make the smallest coherent edit in the owning source. Update direct callers
   and documentation, preserve generated-source ownership, and avoid a new
   plugin, hook, dependency, or language port unless its net benefit is proven.
6. Inspect check commands for side effects before executing them; `--help`,
   `--dry-run` and test naming are not safety guarantees. In `simplify`, validate
   changed behavior and important negative paths with the repository's pinned tools. Compare exact before/after outputs where behavior must stay
   stable. Distinguish local tests, current-head CI, and real operational proof;
   none substitutes for the others. Stop dependent changes when proof fails;
   repair or revert only this task's authorized edits, never unrelated work.
7. Report proposed versus actually removed mechanisms and caller paths, functions reused,
   necessary helpers retained with reasons, validation results, and open gates.
   If a PR was requested, publish one per repository under the user's authority
   and read back its head, diff, and CI state.

## Safety rules

- Follow the target repository's instructions and accepted architecture. Do
  not weaken provenance, access, approval, rollback, time, or size boundaries
  to make a script smaller.
- Treat scripts that deploy, publish, change credentials, delete data, or alter
  production state as write-capable. Inspect them without running those paths
  unless the user authorized the exact operation.
- Do not activate or replace an automation writer as part of cleanup alone.
  Keep one owner for each output or proposed change.
- Preserve unrelated edits. Do not infer merge or deployment authority from
  authorization to create a PR.

## References

- [Inventory and decision guide](references/inventory-and-decisions.md):
  classification fields, replacement checks, examples, and report shape.

## Scripts

No bundled scripts. Use the target repository's existing tools and checks.

## Output format

For each repository, give the decision, concrete before/after maintenance
burden, changed or retained helpers, caller evidence, validation and CI status,
and remaining operational gates. Link a requested PR or explain why no safe,
useful change was found.

## Completion criteria

- Every removed entry point has a caller check, including manual operations.
- Each retained helper has a distinct reason; replacements preserve the full
  contract and have a smaller maintenance surface.
- The affected behavior and negative paths have current evidence, with missing
  CI or live qualification marked explicitly.

## Failure modes

If callers, the owner contract, pinned tools, or operational authority cannot
be established, leave the risky part unchanged and report the precise gap.
Continue independent, authorized cleanup where possible.
