# Cross-Runtime Setup Boundaries

## Should Trigger

Yes.

## Prompt

Give me a no-write CodeGraph MCP setup proposal for a Codex project, a Cursor project, and a Claude Code project. Show what would change in each and how I would verify it.

## Expected Behavior

- Inspect installed CodeGraph help and generated `--print-config` output when available without executing the installer.
- Present Codex project/user TOML or `codex mcp` behavior only for Codex.
- Present Cursor `.cursor/mcp.json`/user config with verified workspace/project path handling only for Cursor.
- Present current Claude `.mcp.json`/`claude mcp --scope` boundaries only for Claude and label documentation-only verification if the CLI is unavailable.
- Include a generic stdio shape only as a fallback, not as proof for all clients.
- Explain first-party installer side effects beyond the printed MCP snippet, including possible config/instruction/permission/hook changes.
- Separate CLI install, per-runtime config, graph initialization, telemetry, and verification into independent approval items.
- Do not write config, install, initialize, or expose private absolute paths.
