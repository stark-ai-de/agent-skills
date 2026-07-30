# Repo Exploration and Impact

## Should Trigger

Yes.

## Prompt

Use CodeGraph to find where the billing webhook flow enters the app, what it calls, and which tests are likely affected if I change validation.

## Expected Behavior

- Confirm the project root, CodeGraph version/help, and actual MCP/CLI capabilities without opening the graph; obtain affirmative approval for that root or an approved disposable copy before status or semantic queries.
- Complete the once-per-task stable update check with CodeGraph telemetry suppressed unless separately consented, or report offline/opt-out state; an available update is advisory and approval-gated.
- Prefer exposed `codegraph_explore`; otherwise use help-confirmed CLI `explore` or narrower legacy/granular capabilities actually present.
- Do not assume `codegraph_trace` or a fixed menu of MCP tools exists.
- Use watcher/pending evidence rather than running manual sync ceremonially; permit approved sync for CLI-only/stale/recovery state.
- Read only targeted source after the graph narrows entry point, call path, affected surface, and likely tests.
- Corroborate critical scope with source/structural evidence and report dynamic/generated/unsupported uncertainty.
- Return findings, affected files/symbols/tests, evidence provenance, suggested project validation, and remaining risk.
