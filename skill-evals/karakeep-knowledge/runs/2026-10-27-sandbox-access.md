# Karakeep sandbox access correction — local evidence

Date: 2026-10-27. Codex runtime: 0.164.0, Linux/WSL.

## Changed contract

Proxy environment variables no longer reject a valid Node API request before
transport. Selected connection/account ownership is retained. An explicit host
denial of a shell check is recorded separately from MCP reads and helper readiness.
Global startup guidance and the generated plugin projection carry that rule.

## Observed checks

| Boundary                                                | Observed result                                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Focused proxy regression before correction              | Unset passed; values 0 and 1 failed before fetch                                                |
| Complete Node helper suite after correction             | 51 passed                                                                                       |
| Complete Python helper suite                            | 26 passed                                                                                       |
| Skill contracts                                         | Passed; existing advisory warnings outside Karakeep retained                                    |
| Regenerated portable projection and projection fixtures | Passed                                                                                          |
| Host Nix codex-config check                             | Passed, including old-policy migration, idempotence, rollback and offline profile guards        |
| Installed skill readback                                | All 30 canonical source files match                                                             |
| Scoped host configuration readback                      | Verified receipt; exactly TypeSafe plus localhost, existing offline profile guards retained     |
| Fresh default Codex app-server command/exec             | Application check reached Karakeep and returned pending                                         |
| Fresh checks for both implementation repositories       | needs_setup with connection ready; no enrollment or sync                                        |
| Official MCP after activation                           | Search and actual content read succeeded                                                        |
| Fresh default runtime negative controls                 | Unrelated domain and unapproved loopback IP could not connect                                   |
| Implementation configuration sandbox probe              | Unreachable with explicit :workspace permission profile, as required by the current sandbox CLI |
| Already-running chat sandbox                            | Still rejects localhost; requires a fresh Codex process to adopt host policy                    |

## Evidence limits

The fresh-runtime checks used real native app-server command execution, without
model turns, agents or sandbox policy overrides. Negative-control connection
failures alone do not identify their cause as a host denial. Static allowlist,
private-network and profile boundaries were checked separately.

The sandbox CLI requires an explicit permission profile; its implementation
probe therefore records that exact invocation, not unrestricted qualification of
every consumer of the named configuration. Existing chat policy is not changed
retroactively. No automatic skill activation/model-adherence evaluation, CI,
publication or remote synchronization is claimed. Pending and needs_setup were
not promoted to ready.

Canonical changes remain in an isolated worktree. Original worktrees and Git
indices were preserved. Private deployment/installation backups, receipts and
raw local qualification records remain outside the public skill payload.
