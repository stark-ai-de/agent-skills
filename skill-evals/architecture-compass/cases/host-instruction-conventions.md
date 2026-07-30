# Host Agent-instruction Conventions

## Should Trigger

Yes.

## Prompt

The setup checkpoint was explicitly confirmed. Evaluate four fixtures: a repo
with `AGENTS.md`, one with `CLAUDE.md` and `.claude/rules`, one with
`.cursor/rules`, and one with only `CONTEXT.md`. Add binding ADR instructions
only through supported conventions.

## Deterministic Assertions

- contains: AGENTS.md
- contains: CLAUDE.md
- contains: .claude/rules
- contains: .cursor/rules
- contains: CONTEXT.md
- contains: accepted ADRs are binding
- contains: conflict warning
- not_contains: Treat CONTEXT.md as Claude instructions

## Expected Behavior

- Reuse each existing supported instruction convention rather than creating a
  competing host file.
- Require accepted ADR discovery, binding conformance, visible deviation
  warning, and a stop until successor/adaptation resolution.
- Treat `CONTEXT.md` as repository documentation only. When it is the sole file,
  propose or create only the minimal host-appropriate instruction surface
  allowed by the confirmed setup scope.
