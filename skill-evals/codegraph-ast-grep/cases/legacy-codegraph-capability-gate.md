# Legacy CodeGraph Capability Gate

## Should Trigger

Yes.

## Prompt

Assume this repo has CodeGraph 0.9.7. Its help has no `explore` command, it accepts `init -i`, and its MCP server exposes granular tools rather than `codegraph_explore`. Diagnose and explore without upgrading unless I approve.

## Expected Behavior

- Treat the fixture's installed help/tool inventory as authoritative.
- Use `codegraph --version`; do not require the newer `codegraph version` command.
- Do not invent `codegraph_explore` or CLI `codegraph explore`.
- Obtain affirmative approval for the selected root or use an approved disposable copy before any legacy command that opens the graph.
- Use only exposed/help-confirmed legacy context/query/caller/callee/impact/file capabilities relevant to the question.
- Recognize `codegraph init -i` as the help-confirmed legacy form rather than banning it globally.
- Permit manual sync when this legacy/CLI-only watcher state needs it, with approval.
- Check the stable update once if network policy allows, suppress CodeGraph telemetry unless separately consented, and offer it item-by-item, but continue safely if declined.
- Report legacy limitations and targeted source/LSP/ast-grep fallbacks.
