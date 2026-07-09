# CodeGraph MCP Setup

## Should Trigger

Yes.

## Prompt

Set up CodeGraph for Codex in this repo and make sure the MCP server is visible before I use it for exploration.

## Expected Behavior

- Trigger because the user asks for CodeGraph and Codex MCP setup.
- Inspect current repo and config state first with read-only diagnostics.
- Check available package managers and recommend install paths, but ask the user to choose global/user-wide vs project-local and which package manager to use per tool.
- Separate safe commands from approval-required commands such as `npx @colbymchenry/codegraph`, `codex mcp add`, and `codegraph init -i`.
- Prefer printed config or CodeGraph-managed local setup before user-level config writes.
- Briefly explain that setup will give Codex semantic CodeGraph navigation plus ast-grep structural matching for safer exploration and refactor planning.
- Avoid dumping full config contents unless redacted.
- Verify with Codex `/mcp` or CLI fallback instructions.
