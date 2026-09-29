# Windows ACL follow-up — 2026-09-22

The [603d2ae hosted run](https://github.com/stark-ai-de/agent-skills/actions/runs/35695555144) passed the required repository job, archive identity checks, Linux helper tests (173 passed, 14 skipped) and macOS helper tests (172 passed, 15 skipped). Windows reported 80 passed, 63 failed and 44 skipped. Most failures were ACL-command timeouts; the native PowerShell argument-transport test passed. This run does not qualify Windows.

A bounded, read-only comparison on Windows PowerShell 5.1 showed that the previous complete ACL snapshot failed with `IdentityNotMappedException` under both full and minimal environments. Reading ACL rules directly as `SecurityIdentifier` objects succeeded on the same path in approximately half a second. This establishes the account-name lookup defect, but does not by itself establish the cause of every hosted timeout.

All three production snapshots now share the same direct-SID rule-reading block. Both explicit and inherited entries remain included, with their SID, allow/deny type, rights and inheritance/propagation flags. Owner checks, permitted identities, environments and time limits are unchanged. See the [Microsoft API contract](https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.commonobjectsecurity.getaccessrules?view=net-9.0).

The regression runs the actual shared block against an in-memory ACL containing an unmappable synthetic SID and an inherited SYSTEM rule. It passed in real Windows PowerShell without changing any Windows file ACL. Three targeted Linux tests passed; the Windows case was skipped there and executed separately on Windows. Formatting, lint and independent source review passed.

The PR records hosted results for the commit containing this correction. Keep the earlier [Linux-container live receipt](2026-09-21-validation.md) bound to its recorded runtime fingerprint: this Windows-only follow-up is not a new provider, gateway or client live run. Remote creation/inference/cleanup and the documented client/platform gaps remain open.
