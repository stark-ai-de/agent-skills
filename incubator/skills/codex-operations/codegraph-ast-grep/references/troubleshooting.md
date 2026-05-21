# Troubleshooting

## Codex does not show MCP servers

Check:

```bash
codex mcp --help
```

In the Codex TUI:

```text
/mcp
```

Inspect config locations:

```bash
test -f ~/.codex/config.toml && sed -n '1,220p' ~/.codex/config.toml || true
test -f .codex/config.toml && sed -n '1,220p' .codex/config.toml || true
```

Make sure the command in `config.toml` exists on `PATH` from the same shell environment that starts Codex.

## CodeGraph server does not connect

Verify:

```bash
command -v codegraph
codegraph serve --mcp
codegraph status
```

If the project has no `.codegraph/`, initialize it after approval:

```bash
codegraph init -i
```

If the graph is stale:

```bash
codegraph sync
```

## CodeGraph is slow or reports database locking

Run:

```bash
codegraph status
```

If the backend line reports `wasm`, native SQLite support may be missing or not installed. Prefer fixing the local native dependency rather than increasing context reads. Typical remediations include installing platform build tools and rebuilding `better-sqlite3`, then checking that `codegraph status` reports a native backend.

## CodeGraph misses files or symbols

Inspect `.codegraph/config.json`:

```bash
sed -n '1,220p' .codegraph/config.json
```

Check excludes, supported language, generated files, and max file size. Run `codegraph sync` after changes.

## ast-grep command not found

Install with a trusted package manager and verify:

```bash
ast-grep --version
```

On Linux, avoid relying on `sg` because it can be a system command.

## ast-grep no matches

- Confirm the language: `-l ts`, `-l tsx`, `-l js`, or `-l jsx`.
- Quote `$` metavariables with single quotes.
- Test the pattern against one known file before scanning the repo.
- Use `dump_syntax_tree` or a smaller pattern to inspect the actual AST shape.
- Add `stopBy: end` to relational rules when nested search stops too early.

## ast-grep MCP fails through `uvx`

Check that `uvx` exists and can run the server command:

```bash
command -v uvx
uvx --from git+https://github.com/ast-grep/ast-grep-mcp ast-grep-server
```

If the MCP path fails, use the ast-grep CLI directly until the environment is fixed.

## Windows/WSL path mismatch

Codex, CodeGraph, ast-grep, and the repository should run in the same environment. Avoid mixing Windows paths and WSL paths in MCP config. Prefer project-scoped `.codex/config.toml` only when the project is trusted and the path is stable.
