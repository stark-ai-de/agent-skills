For `/workspace/legacy-app`, I would use CodeGraph 0.9.7’s granular MCP capabilities:

1. `context` to resolve the exact `validateInvoice` definition and surrounding symbols.
2. `callers` iteratively to trace direct callers and relevant upstream entry points. There is no consolidated `explore` or `trace` capability.
3. `impact` to identify likely downstream blast radius.
4. File/affected capabilities to narrow candidate test files.
5. `callees` only if the validation change depends on helpers or schemas whose contracts also matter.

The equivalent CLI fallback is the help-confirmed `context`, `callers`, `callees`, `impact`, `affected`, `node`, `query`, and `files` commands. I would not invoke `explore` or invent a trace command.

I would corroborate the graph results by reading:

- The exact `validateInvoice` implementation and its input contract.
- Each reported caller’s call site, including how it constructs or narrows the input.
- Wrappers, aliases, callbacks, dependency-injection registrations, and string-based dispatch near the traced paths.
- Candidate tests’ imports, fixtures, mocks, invocation paths, and assertions—not merely filenames.
- Tests for invalid, missing, malformed, and boundary inputs, plus integration tests exercising upstream callers.

What remains uncertain:

- `impact` and `affected` identify likely tests; they do not prove those tests execute the changed branch.
- Dynamic dispatch, reflection, generated code, unsupported syntax, or runtime registrations may be absent from the graph.
- Duplicate or overloaded `validateInvoice` symbols require source-level identity confirmation.
- A current graph establishes freshness, not compiler correctness or runtime coverage. Final confidence would require targeted tests/typechecking after a future approved change.

I would not upgrade, initialize, or sync: the graph already exists and supplied freshness evidence says it is current. I also would not repeat the declined stable-version lookup. Because strict no-write mode is in force and opening a legacy graph can migrate generated metadata, I would not actually issue MCP/CLI graph queries without a write-safe disposable copy or explicit acceptance of that risk. No project-opening command was run here. The effective state directory was not independently verified; absent a `CODEGRAPH_DIR` override, its default would be `/workspace/legacy-app/.codegraph/`.
