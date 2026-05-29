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

Respect the selected package manager's freshness, trust, and build-script policy. If the package manager installs an older mature version or blocks lifecycle scripts, report that behavior and ask before bypassing it.

For npm-family installs, these checks can help distinguish registry latest from policy-selected versions:

```bash
pnpm config get minimumReleaseAge 2>/dev/null || true
pnpm config get --json allowBuilds 2>/dev/null || true
npm view @colbymchenry/codegraph version dist-tags --json
npm view @ast-grep/cli version dist-tags --json
```

## Setup decisions

Before running install or config-writing commands, present this table and ask the user whether to continue with the recommended global setup or choose a repo-local/diagnostics-only path:

| Layer                      | Recommended default            | Repo-local alternative                      | Use repo-local when                                                        |
| -------------------------- | ------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------- |
| `codegraph-ast-grep` skill | Global install after release   | Project-local `.agents/skills/` copy        | Developing or testing unreleased skill changes in this repo                |
| CodeGraph CLI              | Global/user-wide               | One-time runner where practical             | A repo must avoid global workstation tools                                 |
| CodeGraph MCP              | Global/user-level registration | Project-local config                        | A repo needs pinned server commands or isolated MCP behavior               |
| CodeGraph index            | Per-repo `.codegraph/`         | None                                        | Always keep index data local to the repo and ignored by Git                |
| ast-grep CLI               | Global/user-wide               | Project-local dev dependency                | CI, committed rules, or team-reproducible ast-grep behavior                |
| ast-grep MCP               | Global/user-level registration | Project-local config with `AST_GREP_CONFIG` | The repo has custom `sgconfig.yml`, rule directories, or language mappings |

Global is the recommended default for personal multi-repo use because it keeps the same workflow available everywhere while CodeGraph still stores indexes per repo. Repo-local is better for reproducibility, CI, or unreleased skill development.

Then confirm:

- Install scope: global or user-wide for use across many repos, project-local for one repo or evaluation, or diagnostics-only when tools are already available.
- Package manager per tool: choose from package managers found in preflight; do not install a new package manager unless the user asks.
- MCP config location: printed snippet only, CodeGraph-managed local install when supported, or user-level Codex registration.

CodeGraph and ast-grep do not have identical install channels. If both tools need installation, ask separately for the CodeGraph install path and the ast-grep install path.

| Tool         | Supported choices to offer                                                                                                                                          | Do not imply                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| CodeGraph    | `npx @colbymchenry/codegraph` for one-time setup, `pnpm add -g @colbymchenry/codegraph`, or `npm install -g @colbymchenry/codegraph` for user-wide CLI availability | Do not offer `brew`, `cargo`, `pip`, `pipx`, `yarn`, or `bun` CodeGraph commands unless upstream documents them. |
| ast-grep CLI | Project-local `pnpm`, `npm`, `yarn`, or `bun`; user-wide `pnpm`, `npm`, `brew`, `cargo`, `pipx`, or `pip`                                                           | Do not assume a global install when the user only wants to test one repo.                                        |
| ast-grep MCP | `uvx` runner plus Codex MCP registration                                                                                                                            | Do not treat `uvx` as installing the normal ast-grep CLI.                                                        |

## Global vs project-local MCP registration

Global or user-level Codex MCP registration is the right default when the user wants the same server available across many repositories. It avoids repeating `codex mcp add` in each checkout, keeps the Codex server list consistent, and works well for servers that infer the active project from the client root URI or current repo context, such as CodeGraph.

Project-local MCP config is better when a server needs repo-specific environment, pinned commands, or team-reproducible behavior. It avoids leaking experimental tools into unrelated work and can point at a repo `sgconfig.yml`, but each repo needs its own config and the path can become stale after moving a checkout.

For CodeGraph, global MCP plus per-repo `.codegraph/` indexes is usually a good multi-project setup. For ast-grep MCP, global registration without `AST_GREP_CONFIG` is useful for generic structural search; prefer project-local config only when the repo has custom language mappings or rule directories.

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

After initialization, `.codegraph/` stores local index data. If `git status --short` shows it as untracked, ask before editing `.gitignore`; after approval, add `.codegraph/` to the repo `.gitignore` before finalizing.

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
pnpm add -g --allow-build=@ast-grep/cli @ast-grep/cli
brew install ast-grep
cargo install ast-grep --locked
npm i @ast-grep/cli -g
pipx install ast-grep-cli
pip install ast-grep-cli
```

For pnpm global installs, `approve-builds` is not supported after the fact. Use `--allow-build=@ast-grep/cli` during install so the native ast-grep binary is prepared and the CLI does not fall back to runtime binary resolution on every invocation.

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
