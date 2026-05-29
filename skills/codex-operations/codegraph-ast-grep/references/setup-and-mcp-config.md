# Setup and MCP Config

Use this reference when the task is installation, MCP setup, or repository initialization.

## Preflight

From the target repository root:

```bash
git status --short
pwd
node --version
npm --version
codex mcp --help || true
```

Inspect available package managers and tools before recommending an install path:

```bash
for tool in pnpm npm yarn bun brew cargo pip pipx uvx codegraph ast-grep; do
  command -v "$tool" >/dev/null 2>&1 && printf '%s: %s\n' "$tool" "$(command -v "$tool")"
done
```

Check existing config before editing anything:

```bash
ls -la .codex .codegraph 2>/dev/null || true
test -f .codex/config.toml && grep -n '^\[mcp_servers' .codex/config.toml || true
test -f ~/.codex/config.toml && grep -n '^\[mcp_servers' ~/.codex/config.toml || true
```

Read full MCP config only when needed, and redact tokens, static headers, customer hostnames, and private paths before echoing snippets back to the user.

## Setup decisions

Before running install or config-writing commands, ask the user to choose:

- Install scope: global or user-wide for use across many repos, project-local for one repo or evaluation, or diagnostics-only when tools are already available.
- Package manager per tool: choose from package managers found in preflight; do not install a new package manager unless the user asks.
- MCP config location: printed snippet only, CodeGraph-managed local install when supported, or user-level Codex registration.

CodeGraph and ast-grep do not have identical install channels. If both tools need installation, ask separately for the CodeGraph install path and the ast-grep install path.

| Tool         | Supported choices to offer                                                                                                                                          | Do not imply                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| CodeGraph    | `npx @colbymchenry/codegraph` for one-time setup, `pnpm add -g @colbymchenry/codegraph`, or `npm install -g @colbymchenry/codegraph` for user-wide CLI availability | Do not offer `brew`, `cargo`, `pip`, `pipx`, `yarn`, or `bun` CodeGraph commands unless upstream documents them. |
| ast-grep CLI | Project-local `pnpm`, `npm`, `yarn`, or `bun`; user-wide `pnpm`, `npm`, `brew`, `cargo`, `pipx`, or `pip`                                                           | Do not assume a global install when the user only wants to test one repo.                                        |
| ast-grep MCP | `uvx` runner plus Codex MCP registration                                                                                                                            | Do not treat `uvx` as installing the normal ast-grep CLI.                                                        |

Recommend based on the user's goal and available tools:

| User goal                                    | Recommendation                                                              | Hints                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Use CodeGraph and ast-grep across many repos | User-wide CodeGraph plus user-wide ast-grep with the user's chosen managers | Good for personal workstations. Confirm global bin paths are on `PATH`; pnpm may require `pnpm setup` before global binaries work. |
| Try the tools in one repo                    | Project-local install or one-time runner                                    | Avoids changing the user's global environment. Good for evaluation, CI experiments, and team-specific pinning.                     |
| Keep repo behavior reproducible              | Project-local devDependency for ast-grep                                    | Pins the ast-grep version in the project lockfile. Use the repo's existing package manager when possible.                          |
| Avoid writes for now                         | Diagnostics-only path                                                       | Check existing binaries, print config snippets, and explain which approval-required command would be needed next.                  |

Give hints for every package manager found in preflight:

| Package manager | Good fit                         | Hint                                                                                          |
| --------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm`          | Project-local or global Node CLI | Good when the user prefers pnpm across repos; global installs may need `pnpm setup` first.    |
| `npm`           | One-time runners or global CLI   | Broadly available; global installs write to the configured npm prefix.                        |
| `yarn`          | Project-local CLI                | Good when the repo already uses Yarn; global install behavior depends on the Yarn generation. |
| `bun`           | Project-local CLI                | Use only if the repo already trusts Bun; verify binary execution after install.               |
| `brew`          | User-wide binary                 | Good on macOS or Linuxbrew when the user wants a shared CLI outside project lockfiles.        |
| `cargo`         | User-wide Rust binary            | Good for Rust users; may compile locally and take longer than binary package managers.        |
| `pipx`          | Isolated Python CLI              | Prefer over `pip` for user-scoped Python CLI installs when available.                         |
| `pip`           | Python environment install       | Use only when the user explicitly wants the CLI in the active Python environment.             |
| `uvx`           | One-time MCP server runner       | Useful for ast-grep MCP experiments; it does not install the ast-grep CLI for normal use.     |

When setup is complete, explain the practical improvement in one or two sentences: CodeGraph gives Codex a semantic map for symbols, callers, callees, traces, and impact; ast-grep adds syntax-aware search and rule testing so refactors can start from exact matches instead of broad text search.

## Approval-required command matrix

Run only the selected command or commands after explicit approval. This matrix is the command source of truth for setup; do not repeat or invent install/config/init commands elsewhere.

### CodeGraph

Make CodeGraph available with one of these documented Node/npm-family options:

```bash
npx @colbymchenry/codegraph
pnpm add -g @colbymchenry/codegraph
npm install -g @colbymchenry/codegraph
```

If the user chooses `brew`, `cargo`, `pipx`, `pip`, `yarn`, or `bun` for ast-grep, still choose one of the CodeGraph options above for CodeGraph itself.

Configure CodeGraph MCP after CodeGraph is on `PATH`:

```bash
codegraph install --target=codex --location=local
codex mcp add codegraph -- codegraph serve --mcp
```

Use `codegraph install --target=codex --location=local` for CodeGraph-managed local setup when supported. Use `codex mcp add` for manual user-level Codex CLI registration, then verify with `/mcp`.

Initialize a project graph:

```bash
codegraph init -i
```

### ast-grep CLI

Install project-locally with the chosen repo package manager:

```bash
pnpm add -D @ast-grep/cli
npm install --save-dev @ast-grep/cli
yarn add --dev @ast-grep/cli
bun add --dev @ast-grep/cli
```

Install user-wide with the chosen package manager:

```bash
pnpm add -g @ast-grep/cli
brew install ast-grep
cargo install ast-grep --locked
npm i @ast-grep/cli -g
pipx install ast-grep-cli
pip install ast-grep-cli
```

### ast-grep MCP

`ast-grep-mcp` is experimental. Prefer ast-grep CLI for the fallback path when MCP setup is blocked.

Run or register the MCP server with `uvx`:

```bash
uvx --from git+https://github.com/ast-grep/ast-grep-mcp ast-grep-server
codex mcp add ast-grep -- uvx --from git+https://github.com/ast-grep/ast-grep-mcp ast-grep-server
codex mcp add ast-grep \
  --env AST_GREP_CONFIG="$PWD/sgconfig.yml" \
  -- uvx --from git+https://github.com/ast-grep/ast-grep-mcp ast-grep-server
```

## CodeGraph config notes

For non-writing inspection, print the Codex config snippet:

```bash
codegraph install --print-config codex
```

Equivalent CodeGraph config shape:

```toml
[mcp_servers.codegraph]
command = "codegraph"
args = ["serve", "--mcp"]
```

CodeGraph is zero-config for language detection and default excludes. The `.codegraph/` directory stores project index data; do not create or edit `.codegraph/config.json`. To exclude additional generated or build output, update `.gitignore`, then run `codegraph sync` and check `codegraph status`.

Verify in Codex TUI:

```text
/mcp
```

## ast-grep CLI notes

Use the package manager and install scope selected by the user. Prefer project-local for one repo or reproducible team use. Prefer global or user-scoped only when the user wants one CLI available across repositories.

Run a project-local install through the package manager:

```bash
pnpm exec ast-grep --version
npm exec -- ast-grep --version
yarn ast-grep --version
bunx ast-grep --version
```

Verify:

```bash
ast-grep --version
ast-grep --help
```

On Linux, prefer `ast-grep` instead of `sg` because `sg` can conflict with the system `setgroups` command.

## ast-grep MCP config notes

Without project-specific ast-grep config:

```toml
[mcp_servers.ast-grep]
command = "uvx"
args = ["--from", "git+https://github.com/ast-grep/ast-grep-mcp", "ast-grep-server"]
```

With project-specific ast-grep config:

```toml
[mcp_servers.ast-grep]
command = "uvx"
args = ["--from", "git+https://github.com/ast-grep/ast-grep-mcp", "ast-grep-server"]

[mcp_servers.ast-grep.env]
AST_GREP_CONFIG = "/absolute/path/to/repo/sgconfig.yml"
```

## Approval levels

Safe to run without special approval when the user asked for diagnostics:

```bash
git status --short
codegraph status
ast-grep --version
ast-grep --help
codex mcp --help
codegraph install --print-config codex
```

All install, external runner, MCP registration, config-writing, and graph-initialization commands in the command matrix require explicit approval.
