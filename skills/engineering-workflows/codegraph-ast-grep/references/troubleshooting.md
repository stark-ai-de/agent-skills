# Troubleshooting

Diagnose the smallest failing layer: update lookup, executable/provenance, runtime MCP connection, selected project root, CodeGraph index/watch state, ast-grep parser/rule, or project validation. Do not turn diagnostics into unapproved repair.

## Contents

- [Update state is unavailable](#update-state-is-unavailable)
- [Wrong or shadowed executable](#wrong-or-shadowed-executable)
- [MCP server is missing or disconnected](#mcp-server-is-missing-or-disconnected)
- [CodeGraph is uninitialized, stale, or on the wrong root](#codegraph-is-uninitialized-stale-or-on-the-wrong-root)
- [CodeGraph misses symbols or files](#codegraph-misses-symbols-or-files)
- [ast-grep is missing or cannot materialize its binary](#ast-grep-is-missing-or-cannot-materialize-its-binary)
- [ast-grep matches nothing or too much](#ast-grep-matches-nothing-or-too-much)
- [Semantic and structural evidence disagree](#semantic-and-structural-evidence-disagree)
- [An update or config refresh failed](#an-update-or-config-refresh-failed)

## Update state is unavailable

Check whether the user/environment intentionally disables lookup:

```bash
test -n "${DO_NOT_TRACK:-}" && printf 'DO_NOT_TRACK is set\n'
test -n "${CODEGRAPH_NO_UPDATE_CHECK:-}" && printf 'CODEGRAPH_NO_UPDATE_CHECK is set\n'
```

Do not print values beyond presence. If offline/opt-out applies, report `not checked` and continue. If an allowed lookup fails, do not retry through a second API/registry during the task.

For current CodeGraph, use `upgrade --check` only when installed help exposes it and external lookup is allowed. For legacy CodeGraph or ast-grep without a built-in check, use official channel metadata only when available; never invent an updater.

## Wrong or shadowed executable

```bash
command -v codegraph 2>/dev/null || true
which -a codegraph 2>/dev/null || true
codegraph --version 2>/dev/null || true

command -v ast-grep 2>/dev/null || true
which -a ast-grep 2>/dev/null || true
ast-grep --version 2>/dev/null || true
```

Compare the winning path with package-manager/declarative provenance. Do not update a different installation and call the problem fixed. Propose removing, reordering, or updating a shadowing install only after showing the paths and obtaining approval.

On Linux, `sg` may be the system `setgroups` utility; use `ast-grep` explicitly.

## MCP server is missing or disconnected

Verify the runtime's own state rather than copying another client's config:

- Codex: `codex mcp list`, `codex mcp get codegraph`, and `/mcp`.
- Cursor: MCP settings or current `cursor-agent mcp` help/list commands.
- Claude Code: current `claude mcp` help/list/get or `/mcp`.
- Other clients: their server/tool inventory.

Then verify the configured command resolves from the same environment that launches the client. For a user-wide executable:

```bash
command -v codegraph
codegraph --version
codegraph --help
```

For a Team-pinned dependency on POSIX, require and invoke the exact configured project-local shim. Do not use bare package-manager `exec`; it can fall through to another binary on `PATH`:

```bash
project_root="<approved-project-root>"
codegraph_bin="$project_root/node_modules/.bin/codegraph"
if [ -x "$codegraph_bin" ]; then
  CODEGRAPH_TELEMETRY=0 "$codegraph_bin" --version
else
  printf 'Missing project-local CodeGraph shim: %s\n' "$codegraph_bin" >&2
  false
fi
```

On native Windows, require and invoke `<approved-project-root>\node_modules\.bin\codegraph.cmd`. Compare the result with the approved dependency pin, then verify the runtime stored the same exact shim, `--path`, `CODEGRAPH_DIR`, and telemetry environment before reconnecting and listing tools.

Common causes:

- runtime needs restart/reconnect after config change;
- global CLI path is absent from GUI/runtime environment;
- project-local config contains a moved absolute path;
- Cursor/another client launches from the wrong working directory and needs an approved `--path`/workspace-root binding;
- Windows and WSL paths/environments are mixed;
- current server exposes a different MCP tool set than old instructions assume.

Inspect generated config with `codegraph install --print-config <target>` only when installed help exposes it. Remember that the snippet does not disclose every first-party installer side effect.

## CodeGraph is uninitialized, stale, or on the wrong root

Start with checks that do not open the graph:

```bash
pwd
codegraph --version
codegraph help init 2>/dev/null || true
```

`codegraph status`, MCP graph queries, and other project-opening diagnostics can migrate generated index metadata in some versions. Explain the generated-state boundary and obtain affirmative approval for the selected root, or use an approved disposable copy. Under a strict no-write instruction, skip the command unless that copy was approved. After approval, run:

```bash
codegraph status
```

The bare command above applies only to a verified user-wide executable. For a Team-pinned setup, invoke the exact local shim established in the MCP section and carry the same `CODEGRAPH_DIR`; do not let diagnostics fall through to a global binary or the default state directory.

If no valid graph exists, ask before running the help-confirmed init form. If status points at the wrong root, fix runtime/project-path selection before creating another index.

For freshness:

- active MCP watcher with no pending state: wait for debounce and avoid ceremonial sync;
- persistent pending/stale state: inspect watcher/root and propose the minimum approved sync;
- CLI/script, disabled daemon, sandboxed watcher, or CI: a manual sync can be valid;
- changed `codegraph.json` extraction/exclude/include behavior: installed help/current docs may require full index.

Do not delete the effective state directory (`CODEGRAPH_DIR`, default `.codegraph/`) as the default fix. Preserve the index and logs until the failure is understood. Run every approved status/sync/repair command with the same state-directory value used by the MCP server.

Do not share one index between Windows and WSL processes. Use one environment or, on a version that documents `CODEGRAPH_DIR`, separately configure plain directory names such as `.codegraph-win` and `.codegraph-wsl` after approval.

## CodeGraph misses symbols or files

Check:

1. selected root and graph status;
2. supported language/extension in installed/current docs;
3. `.gitignore`, built-in excludes, and root `codegraph.json` when supported;
4. generated/vendor/nested-repository/worktree boundaries;
5. dynamic dispatch, reflection, macros, dependency injection, route registration, or string-based loading;
6. pending watcher state.

Use help-confirmed file/query commands or targeted source/text search to test the named gap. Absence from the graph is not proof of absence from source.

If a current stable release contains a relevant parser/framework fix, offer it through the itemized update checkpoint; do not silently update.

## ast-grep is missing or cannot materialize its binary

```bash
command -v ast-grep 2>/dev/null || true
ast-grep --version 2>/dev/null || true
```

Inspect how it was installed. npm-family packages may need an allowed install lifecycle to materialize the native binary. Report the package manager's current trust/build policy and ask before changing it or reinstalling.

Do not install through a different channel just because the existing channel needs repair. Preserve project-local versus user-wide scope.

## ast-grep matches nothing or too much

- Test one known file before the repository.
- Confirm language and TS versus TSX/JS versus JSX.
- Quote `$` metavariables with single quotes in the shell.
- Reduce the pattern to the smallest expected node.
- Inspect parser/AST debug options only when installed help exposes them.
- Check expression versus statement context and embedded-language boundaries.
- Add known positives and negatives to rule tests.
- Use `stopBy: end` only when relational traversal should reach the full enclosing node.
- Bound paths/globs before adding relational complexity.

If a result cap truncates output, say so. If a known syntax variant cannot be represented, document the gap and use targeted corroboration rather than overstating coverage.

## Semantic and structural evidence disagree

1. Recheck graph root/freshness/pending files.
2. Recheck ast-grep language, rule, and fixtures.
3. Inspect dynamic/generated/ignored/unsupported code.
4. Use runtime-native LSP or one bounded literal search for the named discrepancy.
5. Read the exact source and report which evidence remains partial.

Do not resolve disagreement by automatically taking the union and calling it impact. The union may be a conservative review scope, but label it as such.

## An update or config refresh failed

Stop additional update/config actions. Capture the redacted command/error and verify what still resolves:

```bash
which -a codegraph 2>/dev/null || true
codegraph --version 2>/dev/null || true

which -a ast-grep 2>/dev/null || true
ast-grep --version 2>/dev/null || true
```

Do not open the graph merely to verify a binary/config rollback. Run `codegraph status` only if graph diagnosis is separately necessary and its generated-state boundary was affirmatively approved for that root or an approved disposable copy.

Check for:

- a stale PATH winner;
- partial package/archive install;
- package lifecycle/build policy failure;
- runtime config or prompt-hook changes that exceeded the approved scope;
- required client restart;
- project manifest/lockfile drift.

Use only the rollback disclosed before approval. If rollback is weak or unavailable, preserve config/index/source and present a separate repair proposal. Never delete an index or overwrite runtime config merely to make the new version appear healthy.
