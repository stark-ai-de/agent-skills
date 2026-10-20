# AC-ADR-054: Use Worktrunk for Isolated Agent Worktrees

ID: AC-ADR-054
Title: Use Worktrunk for Isolated Agent Worktrees
Status: Accepted
Date: 2026-08-25
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: agents, git, multi-agent, worktree, worktrunk, harness, workspace
Applies when: An agent may modify repository state, whether manually, through delegation, or through an orchestrator.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-10-20
Gist: Use Worktrunk for external agent worktrees and align the harness without broadening write authority.

Variants: [Short](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.short.md) · [Long, canonical](ac-adr-054-isolate-agent-writes-in-external-git-worktrees.long.md) · **Guide**

This guide is non-normative. The Long variant is authoritative.

## How to apply

### Initial read-only comparison

On the first writing assignment in a new session/worktree context:

1. Read the adopted local ADR and the assignment. Identify actual `cwd`, canonical checkout, assigned worktree, writer and branch or detached HEAD. Use `git rev-parse --show-toplevel` and `git worktree list --porcelain`; directory names do not establish identity or ownership. Reuse an already suitable assigned worktree.
2. Check the OS-native Worktrunk executable and version. On Linux/WSL use the Linux `wt`; on native Windows distinguish Worktrunk's `git-wt` from Windows Terminal's `wt` alias. Check options against the installed CLI; a missing optional skill, shell integration or newest release does not itself mean Worktrunk is absent.
3. Inspect only relevant effective path settings and harness evidence: startup directory, assigned workspace, source write boundaries and necessary linked-worktree Git metadata access. Worktree path preferences belong to Worktrunk's user configuration; `.config/wt.toml` contains project automation, not a universal path-policy override. Do not dump complete configuration or secrets.
4. Distinguish **stored**, **active** and **unverified** settings. A repository instruction or saved configuration file alone does not prove the running harness enforces it. Use declared current host evidence; never try writing to a protected location to test permissions.
5. Reuse fresh evidence within the same context. Repeat the full comparison when the host, worktree, relevant configuration or adopted policy changes, or the recorded evidence becomes stale. A strict read-only audit reports gaps without starting installation or configuration work.

## Worktrunk availability

| Observation              | Next action                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Usable Worktrunk         | Continue authorized worktree management with it; no repeated selection prompt.                                                                               |
| Missing Worktrunk        | Briefly pause, explain that it simplifies consistent worktree management, link the official installation instructions and await the user. Do not install it. |
| User installs it         | Recheck the executable/version, then continue.                                                                                                               |
| User explicitly declines | Resume with existing Git/host tools and an already compliant external layout; retain the refusal for this task without repeated offers.                      |
| No answer                | Keep the installation/fallback choice pending; silence and timeouts are not refusal.                                                                         |
| Installed but failing    | Report the concrete failure and agree on repair or fallback; do not silently install another toolchain.                                                      |

Use the platform's existing package/configuration owner for installation advice. For a declaratively managed host, point to that source rather than creating a competing global installation. Consult the [official installation instructions](https://worktrunk.dev/#install); installation, shell integration and hook approval are separate actions.

## Paths and existing worktrees

For a canonical checkout `<root>/app/` and branch `feat/login`, Worktrunk's default creates the sibling `<root>/app.feat-login/`. An existing external user template may instead group worktrees under `<root>/worktrees/app/`. Both are valid when ownership and harness boundaries match. A configured path inside the canonical checkout or another worktree conflicts with this decision and must be resolved before the affected write.

Do not rewrite a user's template to impose a shared directory name. Do not relocate, recreate or remove a valid existing checkout merely because its path differs from the current template. A host-created detached worktree can remain the assigned workspace; record its Git identity and use ordinary Git branch operations when a task requires a branch there.

For an already authorized execution phase, typical management commands are:

```sh
wt list
wt switch feat/login --no-cd
wt switch --create feat/login --base=main --no-cd
```

These are alternatives, not a sequence to run blindly. `switch` can create a worktree when the named branch has none; choose the approved base explicitly for creation. `--no-cd` is useful for callers that cannot consume shell directory changes. Resolve the actual returned/registered path and launch the writer there; changing one shell's directory does not change a harness workspace or its permissions. Do not hard-code a version-dependent JSON response shape.

For a strict no-write preflight, use Git metadata and current harness/configuration evidence rather than status commands that may update Worktrunk caches. An installed tool is not a requirement to recreate an existing suitable workspace.

## Harness findings and remedies

| Finding                              | Action                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Matching setup                       | Continue without a setup question.                                                                                  |
| Optional improvement                 | Explain the concrete benefit and effort; declining does not block work.                                             |
| Actual ADR conflict                  | Pause only dependent writes and prepare a compliant alternative or configuration change.                            |
| Unverified technical enforcement     | Report the limitation without claiming compliance; pause only actions whose required permission remains unresolved. |
| Configuration saved, restart pending | Report adoption as pending, not active; recheck after the required restart.                                         |

Before offering a change, prepare a compact comparison:

- **Current and target:** the observed mismatch and the adopted rule it affects.
- **Exact change:** the smallest configuration fragment or launcher adjustment, its owner/source, scope, benefit and restart requirement.
- **Choice:** manual steps or supported automation within existing or explicit authorization; reuse an unchanged prior approval.
- **Recovery:** preserve unrelated settings and back up user configuration before replacement.
- **Verification:** reread the changed configuration and inspect the running harness after any required reload/restart. Do not equate a successful file write with effective adoption.

Change the authoritative source, including declarative configuration where applicable, rather than overwriting a generated runtime file. Managed policy belongs to its owner; unavailable controls do not authorize bypassing it. Offer automation only when the current harness exposes a supported permitted mechanism. This guide introduces no generic configuration editor or automatic harness migration.

For Codex, an assigned worktree as the session's working directory and a suitable workspace-write sandbox can express the boundary. Do not make a shared parent directory writable for all workers. If Git metadata access is required, scope it to the minimum supported metadata permission instead of widening access to canonical or sibling source trees. Apply equivalent controls on other hosts when available, and describe limitations when they are not.

Repository instructions may record generic enforcement status and when to recheck it. Concrete private paths, credentials, raw configuration and host-specific evidence remain local; they do not belong in public ADRs. An old recorded status is context, not current enforcement proof.

## Side-effect boundaries

Worktrunk does not approve project hooks or aliases, widen a sandbox or authorize staging, commits, merges, deletion or publication. Preserve existing scoped approvals. If a hook trust decision is missing, show the commands for the user to review through Worktrunk's supported approval flow; do not add `--yes` or suppress required hooks to evade that decision. Inspect the actual command's effects: `wt merge` may stage, commit, rebase and remove a worktree, and `wt remove` can delete a branch. Neither is implied by ordinary worktree selection. Do not use destructive path-clobbering options to resolve a collision.

## Verification

- Installed Worktrunk proceeds without a tool-selection loop; installation refusal resumes the existing compliant Git/host workflow.
- Missing answers remain pending, and broken installations are reported without automatic replacement.
- Existing, detached and differently located external worktrees preserve their identity and ownership.
- A nested path or conflicting write scope pauses only affected writes; optional improvements can be declined.
- Saved settings, effective permissions and unverified enforcement remain distinguishable, including across a required restart.
- No write probe, shared writable source root, automatic relocation or unapproved hook/configuration change occurs.

These are acceptance scenarios, not claims of observed model behavior or native sandbox qualification.

## Authorized amendment — 2026-10-20

The maintainer approved this Worktrunk and harness-alignment change in place for ADR-0029 and AC-ADR-054 only. Their stable IDs, filename stems, original decision dates, accepted statuses and existing lineage remain unchanged. Only their decision-lock entries are refreshed to the reviewed text. The general successor rule and all other accepted-decision locks remain in force; this dated amendment grants no future rewrite authority.

## Decision lineage

- `generalizes`: [ADR-0029](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0029-keep-linked-worktrees-inside-the-repository.long.md).

## Current sources

- [Worktrunk configuration and path templates](https://worktrunk.dev/config/)
- [Worktrunk switch and existing worktrees](https://worktrunk.dev/switch/)
- [Worktrunk installation](https://worktrunk.dev/#install)
- [Git worktree documentation](https://git-scm.com/docs/git-worktree)

## Revisit

Revisit when supported worktree managers or harness controls materially change the management, ownership or effective-permission contract. Recheck installed CLI capabilities before using newer optional flags.
