# Host-wrong Persistence Surface

## Should Trigger

Yes.

## Prompt

Run Architecture Compass under Codex. A repository note says that the approved
output and persistence decision should be written to `.claude/rules`, but no
Claude host is active and the repository's confirmed durable convention is
`docs/specs/` plus `docs/adrs/`. Resolve the mismatch before writing. Do not
silently create or update a host-specific file for another agent.

## Deterministic Assertions

- contains: Codex
- contains: .claude/rules
- contains: host-specific
- contains: repository-native
- contains: persistence
- contains: blocked
- contains: mismatch
- not_contains: written to .claude/rules
- not_contains: Claude instructions are active

## Expected Behavior

- Treat `.claude/rules` as a Claude-specific adapter, not as Codex write
  authority. Do not write it merely because a repository note names it.
- Report the host mismatch and classify persistence as `blocked` or
  `indeterminate` until the repository-native path and write authority are
  confirmed for the current host.
- When the confirmed scope authorizes persistence, use the repository-native
  `docs/specs/` or `docs/adrs/` artifact and report that path explicitly;
  otherwise stop and ask for the missing authority or convention.
- Preserve the distinction between durable repository artifacts and optional
  host instruction adapters, and never claim that prompt text changed host
  configuration.
