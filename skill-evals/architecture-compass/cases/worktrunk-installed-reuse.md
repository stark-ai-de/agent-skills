# Installed Worktrunk and Existing Assignments

## Should Trigger

Yes.

## Prompt

The target has accepted a local mapping of the revised AC-ADR-054 and authorized
an implementation. Worktrunk is installed and usable. The harness has already
assigned an exclusive external worktree with a detached HEAD; its directory does
not match the current Worktrunk template. A second, independent writing task
needs a new worktree. Compare an existing external user template with absent
path configuration. Describe the next actions without executing them.

## Deterministic Assertions

- contains: Worktrunk
- contains: reuse
- contains: detached
- contains: configured
- contains: default
- contains: harness

## Expected Behavior

- Reuse the suitable assigned worktree without relocating or recreating it,
  deriving identity from Git metadata rather than its directory name.
- Do not require a new worktree merely to attach a branch to an existing
  detached assignment; ordinary authorized Git branch operations remain valid.
- Use Worktrunk for the second task's authorized worktree management, respecting
  its configured external path or default external sibling path when unset.
- Do not ask the user to select the already available tool or install its newest
  version merely because current documentation describes more options.
- Perform the bounded initial harness comparison and preserve one active writer
  per worktree. Worktrunk does not itself grant workspace permissions.
- Preserve the current accepted policy in a consumer that has not yet adopted
  this revised decision.
