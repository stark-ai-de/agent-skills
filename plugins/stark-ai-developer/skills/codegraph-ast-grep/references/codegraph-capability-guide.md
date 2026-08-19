# CodeGraph Capability Guide

Use this reference for semantic exploration, graph freshness, current/legacy command selection, or CodeGraph project-root issues. The installed executable and exposed MCP tools are the command contract.

Use it only for a known repository root. In `doctor`, project-opening diagnostics still need exact-root approval because generated metadata may migrate. A selected `setup` or `update` workflow already covers required in-root initialization/migration when that write scope was announced.

Reviewed upstream baseline: CodeGraph 1.4.1 on 2026-07-12. This date is a maintenance checkpoint, not a runtime version floor.

## Contents

- [Discover capabilities](#discover-capabilities)
- [Select MCP or CLI behavior](#select-mcp-or-cli-behavior)
- [Initialize and keep the graph fresh](#initialize-and-keep-the-graph-fresh)
- [Choose the project root](#choose-the-project-root)
- [Use optional project configuration](#use-optional-project-configuration)
- [Bound and qualify evidence](#bound-and-qualify-evidence)

## Discover capabilities

Start with commands reviewed across legacy and current releases:

```bash
codegraph --version
codegraph --help
```

`codegraph status`, MCP graph queries, and other project-opening diagnostics can migrate generated index metadata in some versions. Explain the generated-state boundary and obtain affirmative approval for the selected root, or use an approved disposable graph copy. Under a strict no-write instruction, stop at version/help and filesystem/config inspection unless the disposable-copy path was approved. After approval, run only the needed command, for example:

```bash
codegraph status
```

Then inspect only the help needed for the task:

```bash
codegraph help init 2>/dev/null || true
codegraph help install 2>/dev/null || true
codegraph help explore 2>/dev/null || true
codegraph help query 2>/dev/null || true
codegraph help context 2>/dev/null || true
codegraph help callers 2>/dev/null || true
codegraph help callees 2>/dev/null || true
codegraph help impact 2>/dev/null || true
codegraph help affected 2>/dev/null || true
codegraph help node 2>/dev/null || true
codegraph help files 2>/dev/null || true
```

Do not infer support from version alone. Record each capability as `available`, `absent`, or `not verified`.

Typical capability branches:

| Need                               | Preferred when discovered        | Degraded/legacy branch                                         |
| ---------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| Natural-language semantic question | Exposed MCP `codegraph_explore`  | CLI `codegraph explore`, then help-confirmed `context`/`query` |
| Symbol/source details              | Consolidated explore result      | Help-confirmed `node` or targeted source read                  |
| Call relationships                 | Consolidated explore call paths  | Help-confirmed `callers`/`callees`                             |
| Blast radius/tests                 | Consolidated explore result      | Help-confirmed `impact`/`affected` plus project tests          |
| File inventory                     | Explore result or targeted reads | Help-confirmed `files`                                         |
| No usable CodeGraph path           | Runtime-native LSP               | ast-grep outline/structural search, then bounded text search   |

## Select MCP or CLI behavior

Enumerate the runtime's actual CodeGraph MCP tools before calling one. Tool enumeration itself does not authorize a graph query; reuse the selected-root or disposable-copy approval from the project-opening gate above.

- If `codegraph_explore` is exposed, use it first for semantic questions.
- If it is not exposed, use only the granular MCP tools that are present.
- If MCP is unavailable, use `codegraph explore` only when installed CLI help lists it.
- On a legacy CLI without `explore`, use help-confirmed `context`, `query`, `callers`, `callees`, `impact`, `affected`, `node`, or `files` as needed.
- Never assume a remembered MCP tool such as `codegraph_trace` exists.

Ask one focused semantic question. Avoid repeating a successful consolidated result through every granular operation. Use a narrow follow-up only for missing evidence or a decision that affects the patch.

Example, only after installed help confirms the command:

```bash
codegraph explore "How does request validation reach persistence?"
```

Legacy examples must remain capability-gated:

```bash
# Run only when installed help lists these commands/options.
codegraph query ValidationService
codegraph callers ValidationService
codegraph impact ValidationService
```

Treat semantic results as an index-backed hypothesis, not compiler proof. Read the exact source before editing and run project-native checks afterward.

## Initialize and keep the graph fresh

Do not infer initialization from state-directory existence alone. Record the selected project root and effective state directory (`CODEGRAPH_DIR`, default `.codegraph`) together.

```bash
codegraph help init
```

After the generated-state boundary is affirmatively approved for the selected root, or an approved disposable copy is selected, use `codegraph status` to inspect initialization and freshness. Run it with the same effective `CODEGRAPH_DIR` and executable provenance as the MCP server. Do not substitute disclosure alone for approval.

After approval, use the installed form:

```bash
# Current help may say init builds the initial graph directly.
codegraph init

# Help-confirmed legacy form only.
codegraph init -i
```

Do not globally ban the legacy `-i` form and do not make it the unconditional default.

Freshness depends on how CodeGraph is running:

| State                                                        | Appropriate behavior                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Active MCP server with watcher and no pending/stale evidence | Trust watcher/connect-sync; do not run manual sync ceremonially                   |
| Pending files reported                                       | Wait for debounce or use targeted source; sync only if the pending state persists |
| CLI/script outside an agent session                          | An approved pre-flight `codegraph sync` may be appropriate                        |
| Watcher disabled/blocked or `CODEGRAPH_NO_DAEMON=1`          | Use approved manual sync before relying on graph results                          |
| Config/extraction engine changed or graph is corrupt         | Inspect help/status and propose the minimum sync or full re-index separately      |

Auto-sync is conditional on an active supported watcher. Manual sync remains valid for CLI-only workflows, disabled watchers, CI/scripts, persistent stale state, and recovery.

Never delete the effective state directory as the first repair. Preserve it, inspect approved status/log evidence, and ask before sync, index, uninit, or removal.

## Choose the project root

Confirm the root used by both the index and MCP server:

- top-level monorepo versus a package/service root;
- nested Git repositories or submodules;
- linked worktrees that should not be indexed as duplicate source;
- a stable path for project-local MCP config;
- Windows versus WSL ownership of the index.

Use one graph when cross-package relationships are the goal and the repository size/support is reasonable. Use separate graphs when packages are independent, paths/config differ, or a single graph creates irrelevant noise. Report which root was chosen.

Do not point Windows and WSL processes at the same SQLite index. Run the client, CodeGraph, ast-grep, package manager, and repository in one environment or configure separate state directories after approval. For current versions that document `CODEGRAPH_DIR`, use plain project-root names such as `.codegraph-win` for native Windows and `.codegraph-wsl` for WSL; put the matching value in that environment's MCP entry and every CLI invocation. If the installed version does not establish `CODEGRAPH_DIR` support, do not rely on it.

When a client launches MCP from the wrong working directory, pass an approved project path if current server help supports it. Prefer client roots/workspace variables over a public hardcoded absolute path.

## Use optional project configuration

The effective state directory (`CODEGRAPH_DIR`, default `.codegraph/`) is local generated index state. Root `codegraph.json` is optional project configuration in current releases that document it; it does not choose the state directory.

Use no config when defaults are sufficient. Consider `codegraph.json` only for a concrete need such as:

- custom file extensions for a supported language;
- excluding tracked first-party-irrelevant paths;
- including explicitly selected ignored first-party source;
- including selected nested repositories.

Inspect the installed/current configuration schema, show the proposed file/diff, and obtain approval. Some configuration changes require a full index rather than an incremental sync.

Never invent `.codegraph/config.json` and never edit index database/state files directly.

## Bound and qualify evidence

For every semantic result, record:

- project root and graph status/freshness;
- MCP tool or CLI command used;
- relevant symbols/files/call paths;
- unsupported/dynamic/generated boundaries;
- targeted source corroboration;
- what remains unverified.

Use `confirmed` only when graph evidence and targeted source/structural evidence agree. Use `partial` when dynamic dispatch, unsupported languages, stale/pending files, generated code, or missing tools limit coverage. Use `unavailable` when no semantic surface could be verified.

If output is broad, narrow the question, symbol, path, or depth rather than dumping the graph. Do not claim that absence from the graph proves absence from the repository.

## Primary sources

- [CodeGraph 1.4.1 README](https://github.com/colbymchenry/codegraph/blob/v1.4.1/README.md)
- [CodeGraph CLI reference](https://github.com/colbymchenry/codegraph/blob/v1.4.1/site/src/content/docs/reference/cli.md)
- [CodeGraph indexing guide](https://github.com/colbymchenry/codegraph/blob/v1.4.1/site/src/content/docs/guides/indexing.md)
- [CodeGraph configuration](https://github.com/colbymchenry/codegraph/blob/v1.4.1/site/src/content/docs/getting-started/configuration.md)
