# Checkout Identity Independent of Invocation Directory

## Should Trigger

Yes.

## Prompt

The same repository-owned preview launcher is invoked from the Git root, a nested workspace package and an unrelated terminal directory. A linked detached worktree contains its own copy of that launcher. The terminal also inherits GIT_DIR, GIT_WORK_TREE and GIT_COMMON_DIR from a foreign repository. Correct the checkout naming strategy so repeated starts identify the same checkout without merging identities across worktrees.

## Deterministic Assertions

- contains: AC-ADR-066
- contains: launcher
- contains: root
- contains: identity

## Expected Behavior

Resolve and canonicalize the Git root from the repository-owned launcher's file location, not process.cwd() or the terminal's repository. Remove Git-local selectors in the Git child environment while preserving unrelated runtime/authentication settings and the parent environment. Execute the actual fenced Guide example in clone/detached-worktree and clean/foreign-environment fixtures. Root lookup failure stops the launch rather than guessing a fallback. For a non-Git project, require an explicit verified root from the owned launcher or configuration. Demonstrate that different invocation directories produce the same identity for one checkout and that a separate linked worktree produces a different identity. Keep service/repository naming and collision checks; a short hash does not authorize route takeover.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
