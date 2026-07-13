# CodeGraph MCP Setup

## Should Trigger

Yes.

## Prompt

Set up CodeGraph for Codex in this repo and make sure its MCP tools are visible before I use it for exploration.

## Expected Behavior

- Inspect repository/root state, executable/provenance, installed CodeGraph version/help, and existing Codex MCP config names without opening the graph.
- Explain that `codegraph status` or an MCP graph query may migrate generated metadata, then obtain affirmative approval for the selected root or use an approved disposable copy before either operation.
- If CodeGraph is installed, check its eligible stable update once for the task with telemetry suppressed unless separately consented; if newer, ask with an itemized update choice before doing anything.
- Present personal, team-pinned, ephemeral, or diagnostics-only scope as applicable and show exact install/MCP/init mutations separately.
- Prefer inspected `--print-config` plus Codex-native project/global TOML or `codex mcp` behavior over blindly running the first-party installer.
- Explain first-party installer side effects that are not visible in the printed snippet.
- Use the init form documented by installed help; do not assume either current `init` or legacy `init -i` universally.
- Do not install, update, register MCP, edit config/ignore files, or initialize the graph until the corresponding item is approved.
- Verify with `codex mcp`/`/mcp`, exposed tool inventory, and `codegraph status` only when the selected-root/copy approval explicitly covers that project-opening verification.
- Keep ast-grep setup separate unless the user also selects it.
