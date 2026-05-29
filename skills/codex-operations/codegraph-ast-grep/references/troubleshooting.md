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
test -f ~/.codex/config.toml && grep -n '^\[mcp_servers' ~/.codex/config.toml || true
test -f .codex/config.toml && grep -n '^\[mcp_servers' .codex/config.toml || true
```

Make sure the command in `config.toml` exists on `PATH` from the same shell environment that starts Codex.
If full config inspection is needed, redact tokens, static headers, customer hostnames, and private paths before sharing output.

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

Check graph health and indexed files:

```bash
codegraph status
codegraph files --filter "**/*target*"
```

CodeGraph follows its default excludes and project `.gitignore` rules. To change what is indexed, update `.gitignore` rather than `.codegraph/`, then run `codegraph sync`.

## ast-grep command not found

Install with a trusted package manager and verify:

```bash
ast-grep --version
```

On Linux, avoid relying on `sg` because it can be a system command.

## ast-grep warns that postinstall did not run

After approval, reinstall pnpm global ast-grep with build approval:

```bash
pnpm add -g --allow-build=@ast-grep/cli @ast-grep/cli
ast-grep --version
```

`pnpm approve-builds` does not apply to global packages. If the warning remains after a global reinstall, inspect the shim target and the global install metadata before changing project config.

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

Codex, CodeGraph, ast-grep, and the repository should run in the same environment. Avoid mixing Windows paths and WSL paths in MCP config. Prefer CodeGraph-managed local setup only when the project is trusted and the path is stable.
