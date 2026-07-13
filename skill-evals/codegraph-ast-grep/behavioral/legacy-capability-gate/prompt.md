# Legacy Capability Gate Behavioral Prompt

You are a clean-context behavioral-eval agent. Read
`skills/engineering-workflows/codegraph-ast-grep/SKILL.md` and only the references
it routes to for this task. Treat the synthetic fixture facts below as
authoritative. You may use read-only file access or commands only to read that
named candidate and its routed references. Do not inspect unrelated host
workspace state, execute analysis tools, contact the network, or change files.
Respond directly to the user prompt as the skill-guided assistant. Do not discuss
this harness.

## Synthetic fixture facts

- Selected project root: `/workspace/legacy-app`.
- CodeGraph resolves to `/opt/tools/codegraph` and reports `0.9.7`.
- Installed CLI help has no `explore` command. It exposes `context`, `query`,
  `callers`, `callees`, `impact`, `affected`, `node`, and `files`.
- Initialization help accepts `codegraph init -i`; an existing graph is already
  initialized, so initialization is unnecessary.
- The MCP server exposes granular context, caller, callee, impact, and file
  capabilities. It does not expose a consolidated explore tool or a trace tool.
- The watcher is disabled. Already-supplied freshness evidence says the graph is
  current for the requested symbol, so manual sync is unnecessary.
- The user declined the once-per-task remote stable-version lookup. Do not ask
  again and do not propose an update as a prerequisite.
- Target question: trace callers and likely affected tests for
  `validateInvoice` before changing its input validation.

## User prompt

Use this installed legacy CodeGraph to scope the `validateInvoice` change. Do not
upgrade, initialize, sync, or write anything. Tell me which available
capabilities you would use, what source evidence you would corroborate, and what
remains uncertain.
