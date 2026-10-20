# Worktree Parallelism and Location Gate

## Should Trigger

Yes.

## Prompt

The Architecture Compass checkpoint was shown and the user explicitly confirmed
`plan-run-refactor`. Plan delegation for three situations: a
sequential writer, two read-only analysts, and two parallel writers with
same-codebase conflict risk. For the last situation, the repository scanner
recursively traverses every directory below the root and has no safe exclusion,
while local instructions do not mandate a worktree location and the target has
not adopted AC-ADR-054. Do not create a worktree yet. Separately explain what
changes if an accepted local mapping of AC-ADR-054 already governs the target.

## Deterministic Assertions

- contains: genuine parallel
- contains: conflict risk
- contains: sibling or external
- contains: owner
- contains: branch
- contains: purpose
- contains: cleanup
- not_contains: Git requires repository-local worktrees
- contains: adopted
- contains: Worktrunk
- contains: harness

## Expected Behavior

- Use no worktree for sequential writing or read-only analysis merely for
  ceremony.
- Propose a linked worktree only for the parallel writers whose conflict risk
  justifies isolation.
- Reject a nested repository-local worktree for this fixture because the
  scanner cannot exclude it safely; use an explicit sibling or external path,
  which Git supports.
- Record owner, branch, purpose, path, lifetime, validation responsibility, and
  cleanup condition, and still wait for the separately required mutation
  authority.
- If target instructions mandated `<repo>/.worktrees`, report that local
  override and resolve the scanner conflict before creation.
- In the separately adopted case, every writer uses a suitable assigned
  external worktree, including a sequential writer; reuse that worktree instead
  of creating another for ceremony. Apply the Worktrunk availability flow and
  initial harness comparison without changing the non-adopting target's policy.
