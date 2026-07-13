Selected root: `/workspace/offline-app`.

I cannot safely run CodeGraph queries under the strict no-write constraint: even read-only-looking context, caller, callee, or impact queries may open the existing graph and migrate generated metadata. I will not run `status`, initialize, sync, rebuild, or query the graph without approval for that possibility.

Safe state:

- CodeGraph: `/opt/tools/codegraph` 0.9.7; granular context/caller/callee/impact/file queries available; `explore` unavailable.
- ast-grep: `/opt/tools/ast-grep` 0.43.0; `run`, `scan`, and `test` available; `outline` unavailable.
- Existing graph: accepted as current from supplied evidence.
- Remote update state: **not checked** because the machine is offline and `DO_NOT_TRACK=1`. No registry, GitHub, update, or fallback API calls will be attempted.
- No files, configuration, graph state, or source will be changed.

A permitted structural inventory would use bounded TypeScript searches such as:

```bash
cd /workspace/offline-app

/opt/tools/ast-grep run \
  -p 'loadInvoice($$$ARGS)' \
  -l ts .
```

Then separately inventory declarations and common member-call variants:

```bash
/opt/tools/ast-grep run -p 'function loadInvoice($$$ARGS) { $$$BODY }' -l ts .
/opt/tools/ast-grep run -p 'async function loadInvoice($$$ARGS) { $$$BODY }' -l ts .
/opt/tools/ast-grep run -p '$OBJ.loadInvoice($$$ARGS)' -l ts .
```

These establish syntax occurrences, not semantic callers or complete impact. Aliases, re-exports, dependency injection, computed access, generated code, and runtime registration remain possible gaps. A complete semantic map requires permission to open the current graph despite the potential generated-metadata migration, or an approved disposable graph copy—which would also require relaxing the no-write rule.
