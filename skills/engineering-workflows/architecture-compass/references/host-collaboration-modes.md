# Host Collaboration Modes

Use one portable architecture lifecycle. Adapt only how the current host exposes planning, review, and permissions.

Select the collaboration route before applying the state tables below. The planning-capability table applies only to a selected decision phase. An audit preserves its read-only boundary without requesting Plan, a review prefers the host review surface and resolves read-only enforcement when that surface does not establish a no-write boundary, and direct execution does not request Plan or Read Only merely because either control is available. If repository evidence later changes the route, stop before decision work or mutation and resolve the newly required controls.

## Separate mode from permissions

Plan mode structures investigation and approval; it is not a filesystem or security boundary. Use the host's read-only permission or sandbox control when available. If the host has no enforceable read-only control, follow the same no-write decision gate and report that limitation.

While an architecture decision is pending:

- inspect only with commands known to be read-only,
- use `git --no-optional-locks status` (or `GIT_OPTIONAL_LOCKS=0`) for Git
  status inspection so the decision phase does not refresh the index,
- do not edit tracked, untracked, ignored, or index state,
- do not run formatters, generators, installs, tests, or builds that may write repository artifacts,
- do not mutate external systems, and
- do not claim prompt text changed a host mode or permission.

A host may internally maintain a plan artifact. Do not write that artifact with repository or file tools, and do not treat it as permission to edit the target repository.

## Planning capability states

Derive state from runtime instructions, visible controls, or explicit user statements. Do not probe capability by attempting a write.
Apply this table only after the selected route requires a decision phase.

| State                  | Required behavior                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Active                 | Continue the native read-only decision phase and report the observed mode evidence.                                            |
| Available but inactive | Ask the user to enter the host planning mode and stop without writing.                                                         |
| Unavailable            | Use the portable conversational no-write gate and report `Plan-mode fallback: unavailable - <evidence>`.                       |
| Explicitly declined    | Use the portable conversational no-write gate and report `Plan-mode fallback: explicitly declined - <user statement>`.         |
| Indeterminate          | Report `Plan-mode fallback: indeterminate - <evidence>`. Do not infer a decline or write until the user confirms a safe route. |

Silence is never evidence that the user declined Plan mode.

## Read-only enforcement states

Detect and report read-only enforcement separately from planning mode. Do not
infer enforcement from a Plan label alone; treat a planning mode as enforced
read-only only when runtime or host evidence says it is the permission boundary.
A Plan instruction or system reminder that forbids edits proves the behavioral
no-write gate, not an enforced filesystem permission. `Enforced` requires
evidence of an active read-only permission or sandbox policy; a requested flag
or successful helper preflight is insufficient when command-level runtime
evidence later reports the sandbox unavailable or disabled.
Use this table for decision phases and audits, and for a review fallback whose
native review surface does not establish a no-write boundary. Do not request a
read-only transition for direct execution merely because one is available.

| State                  | Required behavior                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Enforced               | Record the active read-only permission or sandbox evidence, then continue the selected read-only route.                                       |
| Available but inactive | Request the host-controlled read-only transition and stop before repository work on that route.                                               |
| Unavailable            | Record `Read-only enforcement: unavailable - <evidence>` and preserve the behavioral no-write gate.                                           |
| Explicitly declined    | Record `Read-only enforcement: explicitly declined - <user statement>`, do not repeat the request, and preserve the behavioral no-write gate. |
| Indeterminate          | Record `Read-only enforcement: indeterminate - <evidence>` and use only operations guaranteed read-only until the user confirms state.        |

Do not infer enforcement from an approval prompt, command name, or a previous
turn. If a host cannot enforce read-only access, the behavioral gate still
forbids repository, index, artifact, and external-state writes.

## Host adapters

- **Codex:** when exposed, `/plan` selects native planning, `/permissions` selects a separate read-only control, and `/review` is preferred for PR, branch, or diff findings. Request and confirm planning and read-only transitions independently; if Read Only cannot be activated, record the enforcement limitation. The skill does not claim to perform host transitions.
- **Cursor:** use the current surface's visible Plan and read-only controls when exposed. `--plan` or a Plan system reminder proves planning capability only, not read-only enforcement. A requested `--sandbox enabled` flag or helper preflight is not enforcement proof when command-level runtime evidence reports the sandbox unavailable or disabled; record that limitation and preserve the behavioral gate. Do not assume a particular command, shortcut, or mode exists across all Cursor versions.
- **Claude Code:** use the current surface's exposed Plan permission mode or transition control. Do not assume a particular command or flag. Host-managed plan artifacts are not target-repository writes.
- **Other or unknown hosts:** use the portable conversational no-write gate and record capability evidence honestly.

Preserve the target repository's existing agent-instruction convention. For a new repository with no selected runtime or convention, default to `AGENTS.md`; create Cursor- or Claude-specific instruction files only when the user selects that target.

## Architecture checkpoint

Before approval, report route-relevant capability and enforcement evidence,
return the rule, adoption, or placement map, and ask only questions that change
a durable decision, execution scope, or validation contract. Approval always
requires explicit user confirmation of durable decisions and material
assumptions or accepted risks. When implementation was requested, approval also
requires confirmation of:

- the exact setup or refactor slice,
- every allowed target path,
- validation commands,
- any required pre-execution write-capable permission transition, its execution
  scope, and whether it is required before direct execution, follows native
  Plan exit, or follows portable-fallback approval.

Always report `Planning capability: <state> - <evidence>` and
`Read-only enforcement: <state> - <evidence>` as separate public fields. Use
`Not applicable` when the selected direct, audit, or review route does not use
planning or does not require a separate read-only control.

Use the public statuses exactly:

| Situation                                                                                             | Architecture decision status | Execution status             |
| ----------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------- |
| Audit or review with no implementation                                                                | `not required`               | `not requested`              |
| Fully prescribed direct work; no implementation requested                                             | `not required`               | `not requested`              |
| Fully prescribed direct work; implementation requested and write permission confirmed or not required | `not required`               | `ready for direct execution` |
| Fully prescribed direct work; required write permission pending                                       | `not required`               | `pending write permission`   |
| Decision unresolved; no implementation requested                                                      | `pending`                    | `not requested`              |
| Decision unresolved; implementation requested                                                         | `pending`                    | `blocked`                    |
| Decision approved; no implementation requested                                                        | `approved`                   | `not requested`              |
| Native decision approved; implementation requested                                                    | `approved`                   | `pending Plan-mode exit`     |
| Fallback decision approved; implementation requested and write permission confirmed or not required   | `approved`                   | `ready for direct execution` |
| Fallback decision approved; required write permission pending                                         | `approved`                   | `pending write permission`   |
| Missing evidence or conflict; no implementation requested                                             | `blocked`                    | `not requested`              |
| Missing evidence or conflict; implementation requested                                                | `blocked`                    | `blocked`                    |
| Approved checkpoint; material re-entry drift                                                          | `approved`                   | `blocked`                    |
| Approved implementation validated                                                                     | `approved` or `not required` | `completed`                  |

`ready for direct execution` means every required implementation approval and
write-capable permission is already confirmed or no transition is required.
Use `pending write permission` whenever the architecture route is ready but a
known pre-execution write-capable permission or control remains inactive or
unconfirmed. Native approval remains `pending Plan-mode exit` until Plan exits;
if a write transition is still required afterward, report
`pending write permission` and stop until it is confirmed.

Do not emit an implementation continuation when implementation was not
requested. For requested implementation, use the matching continuation below.

Native Plan-mode continuation:

```text
Exit Plan mode. If a separate read-only control remains active after Plan exit, request an approved write-capable permission for this execution slice. After all required host transitions are confirmed, re-read repository state (HEAD and `git --no-optional-locks status` when Git exists), the governing ADRs, and the approved target paths. Stop and report any material drift. Otherwise apply only the approved Architecture Compass <setup/refactor slice> to: <enumerated paths>. Do not expand scope. Run: <enumerated validation commands>. Report changed paths, validation results, and remaining ADR gaps, then stop.
```

Portable fallback continuation:

```text
After explicit implementation approval, confirm any required write permission, then re-read repository state (HEAD and `git --no-optional-locks status` when Git exists), the governing ADRs, and the approved target paths. Stop and report any material drift. Otherwise apply only the approved Architecture Compass <setup/refactor slice> to: <enumerated paths>. Do not expand scope. Run: <enumerated validation commands>. Report changed paths, validation results, and remaining ADR gaps, then stop.
```

Direct-route permission continuation:

```text
After the required write-capable permission is confirmed, re-read repository state (HEAD and `git --no-optional-locks status` when Git exists), the governing ADRs, and the approved target paths. Stop and report any material drift. Otherwise apply only the approved Architecture Compass <setup/refactor slice> to: <enumerated paths>. Do not expand scope. Run: <enumerated validation commands>. Report changed paths, validation results, and remaining ADR gaps, then stop.
```

## Execution re-entry

Before the first write:

1. Confirm the user requested implementation and any separately required write-capable permission transition is approved. For a native decision route, also confirm the host is no longer in Plan mode; for the portable fallback, confirm explicit implementation approval; for a direct route, confirm no decision approval is required.
2. Re-read repository identity, root, branch, `HEAD`, and full status when Git exists. Use `git --no-optional-locks status` or `GIT_OPTIONAL_LOCKS=0` even when execution permissions are active so the lifecycle has one index-safe inspection contract.
3. Re-read repository instructions, governing ADRs, and every approved target path.
4. Compare this evidence with the checkpoint. Stop and report material drift, including changed governing decisions, overlapping worktree or index changes, removed or repurposed target paths, or a changed validation contract.
5. Apply only the approved path allowlist. Report and stop before touching an extra path.
6. Run only the approved validation commands and return the final public statuses.
