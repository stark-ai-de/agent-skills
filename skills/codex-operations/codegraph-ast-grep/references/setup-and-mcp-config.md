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

Check existing config before editing anything:

```bash
ls -la .codex .codegraph 2>/dev/null || true
test -f .codex/config.toml && sed -n '1,200p' .codex/config.toml || true
test -f ~/.codex/config.toml && sed -n '1,200p' ~/.codex/config.toml || true
```

## CodeGraph setup

Prefer the interactive installer for human-led setup:

```bash
npx @colbymchenry/codegraph
```

For non-writing inspection, print the Codex config snippet:

```bash
codegraph install --print-config codex
```

Manual Codex MCP setup after CodeGraph is installed on `PATH`:

```bash
codex mcp add codegraph -- codegraph serve --mcp
```

Equivalent `config.toml` shape:

```toml
[mcp_servers.codegraph]
command = "codegraph"
args = ["serve", "--mcp"]
```

Initialize a project graph:

```bash
codegraph init -i
codegraph status
```

For TypeScript/Turbo repos, inspect `.codegraph/config.json` after initialization and keep generated/build folders excluded. A typical starting point is:

```json
{
  "version": 1,
  "languages": ["typescript", "javascript"],
  "exclude": [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "packages/*/dist/**",
    "apps/*/.next/**",
    "**/*.generated.*"
  ],
  "frameworks": [],
  "maxFileSize": 1048576,
  "extractDocstrings": true,
  "trackCallSites": true
}
```

Verify in Codex TUI:

```text
/mcp
```

## ast-grep CLI setup

Use a package manager the project or user already trusts. Examples:

```bash
brew install ast-grep
cargo install ast-grep --locked
npm i @ast-grep/cli -g
pip install ast-grep-cli
```

Verify:

```bash
ast-grep --version
ast-grep --help
```

On Linux, prefer `ast-grep` instead of `sg` because `sg` can conflict with the system `setgroups` command.

## ast-grep MCP setup for Codex

The ast-grep MCP server can be run directly from GitHub with `uvx`:

```bash
uvx --from git+https://github.com/ast-grep/ast-grep-mcp ast-grep-server
```

Register it with Codex:

```bash
codex mcp add ast-grep -- uvx --from git+https://github.com/ast-grep/ast-grep-mcp ast-grep-server
```

Equivalent `config.toml` shape:

```toml
[mcp_servers.ast-grep]
command = "uvx"
args = ["--from", "git+https://github.com/ast-grep/ast-grep-mcp", "ast-grep-server"]
```

With a project-specific ast-grep config:

```bash
codex mcp add ast-grep \
  --env AST_GREP_CONFIG="$PWD/sgconfig.yml" \
  -- uvx --from git+https://github.com/ast-grep/ast-grep-mcp ast-grep-server
```

Equivalent `config.toml` shape:

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
codex mcp --help
```

Ask before running because these install, write config, or initialize state:

```bash
npx @colbymchenry/codegraph
npm install -g @colbymchenry/codegraph
codex mcp add codegraph -- codegraph serve --mcp
codegraph init -i
codex mcp add ast-grep -- uvx --from git+https://github.com/ast-grep/ast-grep-mcp ast-grep-server
```
