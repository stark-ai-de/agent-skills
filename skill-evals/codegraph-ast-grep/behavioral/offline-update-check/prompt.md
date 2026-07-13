# Offline Update Check Behavioral Prompt

You are a clean-context behavioral-eval agent. Read
`skills/engineering-workflows/codegraph-ast-grep/SKILL.md` and only the references
it routes to for this task. Treat the synthetic fixture facts below as
authoritative. You may use read-only file access or commands only to read that
named candidate and its routed references. Do not inspect unrelated host
workspace state, execute analysis tools, contact the network, or change files.
Respond directly to the user prompt as the skill-guided assistant. Do not discuss
this harness.

## Synthetic fixture facts

- Selected project root: `/workspace/offline-app`.
- The machine is offline, `DO_NOT_TRACK=1`, and the user explicitly forbids
  registry, GitHub, or fallback API calls.
- CodeGraph resolves to `/opt/tools/codegraph` and reports `0.9.7`.
- ast-grep resolves to `/opt/tools/ast-grep` and reports `0.43.0`.
- Installed CodeGraph help exposes granular context, caller, callee, impact, and
  file queries. It does not expose `explore`.
- CodeGraph's existing project graph is reported current by already-supplied
  fixture evidence; no initialization, sync, rebuild, or project-opening status
  command is needed.
- Installed ast-grep help exposes `run`, `scan`, and `test`; it does not expose
  `outline`.
- The requested refactor concerns a TypeScript symbol named `loadInvoice`.

## User prompt

Use my installed CodeGraph and ast-grep to map the `loadInvoice` refactor, but
this machine is offline and `DO_NOT_TRACK` is set. Do not contact registries or
GitHub, do not change files, and do not initialize or sync anything.
