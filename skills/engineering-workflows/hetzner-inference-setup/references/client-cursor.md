# Cursor Standard-Chat Adapter

## Current boundary

Cursor is guided, not machine-written. The skill never edits Cursor databases, opaque state, global JSON, settings stores, or application files.

Current public Cursor BYOK documentation covers standard chat models and states that requests still pass through Cursor infrastructure for final prompt construction. It does not provide a durable machine-readable custom loopback base-URL contract. Recheck the [official Cursor API-key documentation](https://cursor.com/help/models-and-usage/api-keys) for the installed version.

## Guided inspection

Run `check --components cursor`. It returns `blocked` guidance without loading or requiring an installation manifest, requiring a running gateway, reading a credential, or making a network request. An absent, stopped, or drifted installation does not suppress this safe inspection guidance.

Only if the installed Cursor UI visibly exposes all required controls:

1. Record the exact Cursor version and UI path.
2. Confirm that the base-URL override applies to the intended standard-chat model and disclose if it is global.
3. Enter `http://127.0.0.1:4000/v1`.
4. Enter model `hetzner-default`.
5. Enter only the local administrative gateway key, never the provider token.
6. Click the UI's manual Verify action and record the result.

If any control is absent or incompatible, report `blocked`. Never reinterpret a specialized Cursor feature as standard-chat proof.

## Claims

Manual Verify can establish transport only for that exact Cursor version and route. Keep the state at `transport_verified` unless the same version visibly proves the requested repository/tool flow and rules out hidden routing. Cursor evidence never proves Codex or Claude Code.

For an existing remote gateway, use [remote-clients.md](remote-clients.md) and a separate inference credential.
