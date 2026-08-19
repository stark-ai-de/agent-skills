# Setup and MCP Configuration

Use this reference for the idempotent `setup` workflow: installation/reconciliation, MCP setup, project initialization, and persisted repository guidance. Use [update-and-provenance.md](update-and-provenance.md) for the `update` workflow.

Precondition: `setup` was selected from clear user intent or explicit choice and the exact root/write scope was announced. That selection covers ordinary in-root package, runtime-config, graph, and guidance reconciliation; privilege escalation, installer-channel/scope changes, telemetry, destructive replacement, and unrelated writes remain separate.

## Contents

- [Setup principles](#setup-principles)
- [Read-only preflight](#read-only-preflight)
- [Choose an installation scope](#choose-an-installation-scope)
- [Install channels](#install-channels)
- [CodeGraph runtime configuration](#codegraph-runtime-configuration)
- [Project initialization and configuration](#project-initialization-and-configuration)
- [ast-grep project setup](#ast-grep-project-setup)
- [Experimental ast-grep MCP](#experimental-ast-grep-mcp)
- [Authorization and verification](#authorization-and-verification)

## Setup principles

1. Prefer a healthy existing install.
2. Discover the installed command surface before choosing examples.
3. Preserve the user's current package manager, installer channel, scope, trust policy, and declarative configuration.
4. Show exact versions, destinations, remote execution, lifecycle scripts, telemetry behavior, and rollback limits before approval. Treat update-network permission and telemetry consent separately; default-on telemetry is not affirmative consent.
5. Keep CLI/package, MCP registration, agent guidance, project initialization, and repository config as separately reported changes even when the selected setup scope authorizes them together.
6. Never install a package manager just to install either tool unless the user asks.

`npx`, `uvx`, package installs, archive extraction, MCP registration, `codegraph install`, graph initialization, configuration writes, and ignore-file edits are side-effectful. Do not run them from diagnostic intent.

## Read-only preflight

Start from the intended project root. Avoid echoing full runtime config or unrelated environment variables; the non-secret CodeGraph state-directory selector is relevant here.

```bash
pwd
git status --short 2>/dev/null || true
printf 'Configured CODEGRAPH_DIR: %s\n' "${CODEGRAPH_DIR:-<default .codegraph>}"

for tool in codegraph ast-grep pnpm npm yarn bun brew port cargo pip pipx uv nix codex cursor-agent claude; do
  command -v "$tool" >/dev/null 2>&1 && printf '%s: %s\n' "$tool" "$(command -v "$tool")"
done
```

Probe installed tools without assuming newer subcommands:

```bash
codegraph --version 2>/dev/null || true
codegraph --help 2>/dev/null || true
codegraph help init 2>/dev/null || true
codegraph help install 2>/dev/null || true

ast-grep --version 2>/dev/null || true
ast-grep --help 2>/dev/null || true
```

`codegraph --version` is the portable first probe across reviewed legacy and current releases. Use `codegraph version` only after help exposes it. Prefix skill-invoked CodeGraph commands with `CODEGRAPH_TELEMETRY=0` unless the user separately chose to keep telemetry enabled for that action. Preserve `DO_NOT_TRACK=1` when present or requested; do not weaken it merely to permit an update lookup.

Version/help probes are the safest no-write checks. `codegraph status`, MCP graph queries, and other project-opening diagnostics can repair or migrate metadata in the effective state directory (`CODEGRAPH_DIR`, default `.codegraph/`) in some versions. Explain that boundary and obtain affirmative approval for the selected root before running one, or use an approved disposable copy. Under a strict no-write request, skip project-opening commands unless the disposable-copy path was approved.

Inspect only relevant config names and paths before reading content:

```bash
find . -maxdepth 3 \
  \( -path '*/.codex/config.toml' -o -path '*/.cursor/mcp.json' -o -name '.mcp.json' \
     -o -name 'codegraph.json' -o -name 'sgconfig.yml' -o -name 'sgconfig.yaml' \) \
  -print 2>/dev/null
```

When content inspection is necessary, redact credentials, headers, private service URLs, customer names, and unrelated server entries before reporting it.

## Choose an installation scope

Select and announce the applicable installation scope inside the `setup` workflow. This is not another public workflow. Ask only when the installation scope or authority is ambiguous or expands beyond the requested setup outcome.

| Installation scope | CLI/tool scope                                                            | MCP/config scope                 | Best fit                                               |
| ------------------ | ------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| Personal           | Existing or user-wide installation                                        | User/global runtime config       | One trusted workstation across many repositories       |
| Team-pinned        | Project dependency, Nix/devbox/toolchain pin, or documented exact release | Project runtime config           | Reproducible team and CI behavior                      |
| Ephemeral          | Exact package or verified archive in a temp/sandbox path                  | Printed or temporary config only | CI, evaluation, locked-down hosts                      |
| Diagnostics-only   | Existing executables only                                                 | No writes                        | Exploration or repair assessment before setup approval |

The CodeGraph index is always per selected project root even when the CLI/MCP registration is user-wide. ast-grep can be user-wide for ad-hoc use or project-local when rules/CI require a reproducible version.

## Install channels

Resolve `<version>` from an authoritative stable source and local policy before proposing a command. Do not use an unqualified mutable `latest` in an approved persistent install.

### CodeGraph

Preferred choices, in order:

1. Existing working executable.
2. Existing npm-family channel with an exact package version.
3. Exact standalone GitHub release asset plus its published `SHA256SUMS`.
4. Approved one-time `npx` execution when persistence is unwanted and remote execution is acceptable.

Exact npm-family examples:

```bash
npm install -g @colbymchenry/codegraph@<version>
pnpm add -g @colbymchenry/codegraph@<version>
```

For project/declarative setups, use the repository's existing package/toolchain mechanism rather than inventing a global install. For an approved Team-pinned npm-family setup, save an exact manifest pin and the matching lockfile resolution:

```bash
pnpm add --save-dev --save-exact @colbymchenry/codegraph@<version>
npm install --save-dev --save-exact @colbymchenry/codegraph@<version>
```

These are separate alternatives, not commands to run together. They write the manifest and lockfile and can run package lifecycle scripts; show that scope and the package manager's trust policy before approval. On POSIX, verify the exact project-local shim rather than a bare package-manager `exec`, which can fall through to another binary on `PATH`:

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

Native Windows equivalent:

```powershell
$projectRoot = "<approved-project-root>"
$codegraphBin = Join-Path $projectRoot "node_modules\.bin\codegraph.cmd"
if (-not (Test-Path -LiteralPath $codegraphBin -PathType Leaf)) {
  throw "Missing project-local CodeGraph shim: $codegraphBin"
}
$env:CODEGRAPH_TELEMETRY = "0"
& $codegraphBin --version
if ($LASTEXITCODE -ne 0) { throw "Project-local CodeGraph version check failed" }
```

Confirm that the reported CLI version equals the approved pin and that the manifest/lockfile diff contains only the reviewed dependency change. Use this exact shim for `--help`, `help init`, and `serve --help` too. Never fall back to a global `codegraph` when the local shim is missing.

A reviewable Linux standalone download looks like this; select the asset for the actual architecture and inspect the archive before extraction:

```bash
set -euo pipefail

version=vX.Y.Z
asset=codegraph-linux-x64.tar.gz
base="https://github.com/colbymchenry/codegraph/releases/download/${version}"
workdir="$(mktemp -d)"
cd "$workdir"

curl -fL -o "$asset" "$base/$asset"
curl -fL -o SHA256SUMS "$base/SHA256SUMS"
grep "  $asset\$" SHA256SUMS | sha256sum -c -
tar -tzf "$asset"
printf 'Verified archive: %s/%s\n' "$workdir" "$asset"
```

Archive extraction and PATH linking require a second approved write step with the chosen destination. On macOS, use the matching Darwin asset and verify the selected checksum with `shasum -a 256` before inspecting the archive. On Windows, download the matching ZIP and `SHA256SUMS`, compare `Get-FileHash -Algorithm SHA256`, inspect the ZIP, then extract only after approval.

Do not default to upstream `curl ... | sh` or `irm ... | iex`. A one-time runner such as `npx @colbymchenry/codegraph@<version>` is also remote code execution and requires approval.

### ast-grep CLI

Choose the channel already trusted by the user or repository:

| Channel           | Exact/setup form                                                  | Important policy                                                        |
| ----------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Project pnpm      | `pnpm add -D @ast-grep/cli@<version>`                             | Includes manifest/lockfile writes and may require build-script approval |
| Project npm       | `npm install --save-dev @ast-grep/cli@<version>`                  | Includes manifest/lockfile writes                                       |
| User pnpm         | `pnpm add -g --allow-build=@ast-grep/cli @ast-grep/cli@<version>` | Do not bypass pnpm build policy silently                                |
| User npm          | `npm install -g @ast-grep/cli@<version>`                          | Writes to configured npm prefix                                         |
| Cargo             | `cargo install ast-grep --locked --version <version>`             | Compiles locally; preserve Cargo's install root                         |
| pipx              | `pipx install 'ast-grep-cli==<version>'`                          | Isolated Python CLI environment                                         |
| pip               | `python -m pip install 'ast-grep-cli==<version>'`                 | Use only in the explicitly selected environment                         |
| Homebrew/MacPorts | Formula/port install                                              | Usually tracks repository channel; disclose weak exact pin/rollback     |
| Nix/declarative   | Edit the existing input/package declaration                       | Do not imperatively mutate a declarative environment                    |

The npm package materializes the native executable through its install lifecycle. If a package manager blocks that step, report it and ask before changing trust/build policy. On Linux, use `ast-grep`; `sg` can resolve to the system `setgroups` utility.

For either project npm-family install, verify the exact local shim. Do not use bare `pnpm exec` or `npm exec`: a missing shim must fail instead of searching `PATH`, fetching a package, or executing anything other than the approved `@ast-grep/cli` dependency.

```bash
project_root="<approved-project-root>"
ast_grep_bin="$project_root/node_modules/.bin/ast-grep"
if [ -x "$ast_grep_bin" ]; then
  "$ast_grep_bin" --version
else
  printf 'Missing project-local ast-grep shim: %s\n' "$ast_grep_bin" >&2
  false
fi
```

On native Windows, require `<approved-project-root>\node_modules\.bin\ast-grep.cmd` with `Test-Path -PathType Leaf`, then invoke that exact path with `& $astGrepBin --version`.

## CodeGraph runtime configuration

First inspect generated MCP configuration without changing runtime config when the installed version supports it:

```bash
DO_NOT_TRACK=1 codegraph install --print-config codex
DO_NOT_TRACK=1 codegraph install --print-config cursor
DO_NOT_TRACK=1 codegraph install --print-config claude
```

`--print-config` shows an MCP snippet, not every side effect of `codegraph install`. Reviewed CodeGraph 1.4.1 installer behavior can also alter runtime config, legacy instruction markers/hooks, permissions, telemetry choices, global package state, or a Claude prompt hook. Prefer runtime-native MCP-only configuration when that is the user's intent.

Generic stdio shape for a verified executable already on the runtime's `PATH`:

```json
{
  "command": "codegraph",
  "args": ["serve", "--mcp"]
}
```

Add `--path <approved-project-root>` only when the client does not reliably provide roots/current working directory. Do not persist private absolute paths in public examples.

For a Team-pinned project dependency, do not use bare `codegraph`, `npx`, or bare package-manager `exec`. After installed help confirms `serve --mcp --path`, configure the selected runtime with the exact local shim verified above:

| Runtime environment  | `command`                                                 | `args`                                                    |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| POSIX, including WSL | `<approved-project-root>/node_modules/.bin/codegraph`     | `["serve", "--mcp", "--path", "<approved-project-root>"]` |
| Native Windows       | `<approved-project-root>\node_modules\.bin\codegraph.cmd` | `["serve", "--mcp", "--path", "<approved-project-root>"]` |

Use the same native absolute project path in the shim and `--path`; this makes local dependency resolution independent of the client's launch directory and fails if the reviewed dependency is absent. Set `CODEGRAPH_DIR` to the approved plain directory name and `CODEGRAPH_TELEMETRY=0` in the MCP environment unless the user separately opted into telemetry. Before writing runtime config, run the platform-specific version check from the Team-pinned install section. After writing it, reconnect/restart and verify both the stored command/args/environment and the exposed CodeGraph tool list. If the project moves, regenerate the path after approval. If the runtime does not expose a server version, report that limitation instead of claiming MCP itself returned one.

For native Windows JSON/TOML, use a correctly serialized absolute path: forward slashes or escaped backslashes, never a raw backslash string copied from PowerShell output.

### Codex

- Project scope: trusted `.codex/config.toml`.
- User scope: `~/.codex/config.toml` or `codex mcp add` after approval.
- Verify with `codex mcp list`, `codex mcp get codegraph`, and `/mcp` when the TUI is available.

Project/user TOML shape:

```toml
[mcp_servers.codegraph]
command = "codegraph"
args = ["serve", "--mcp"]
```

Approved Team-pinned POSIX project shape; use the native Windows shim from the table when applicable:

```toml
[mcp_servers.codegraph]
command = "<approved-project-root>/node_modules/.bin/codegraph"
args = ["serve", "--mcp", "--path", "<approved-project-root>"]
env = { CODEGRAPH_DIR = "<approved-state-directory>", CODEGRAPH_TELEMETRY = "0" }
```

Codex also supports an MCP `cwd`, but the exact absolute shim above does not depend on launch-directory behavior and binds execution to the reviewed project dependency. Project `.codex/config.toml` is loaded only for a trusted project.

Do not use CodeGraph's first-party Codex installer for project-scope or MCP-only intent without inspecting its current target/scope behavior; reviewed 1.4.1 treats Codex setup as user/global and can touch more than the MCP entry.

### Cursor

- Project scope: `.cursor/mcp.json`.
- User scope: `~/.cursor/mcp.json`.
- Verify with Cursor's MCP settings or `cursor-agent mcp list`/`cursor-agent mcp list-tools codegraph` when available.

Cursor may launch MCP subprocesses outside the project root. Use the runtime's workspace variable for global config or an approved absolute project path for local config only after current Cursor behavior is verified. Reviewed CodeGraph 1.4.1 first-party Cursor output accounts for this with `--path`; inspect it before writing.

Approved Team-pinned POSIX project shape; use the native Windows shim from the table when applicable:

```json
{
  "mcpServers": {
    "codegraph": {
      "command": "<approved-project-root>/node_modules/.bin/codegraph",
      "args": ["serve", "--mcp", "--path", "<approved-project-root>"],
      "env": {
        "CODEGRAPH_DIR": "<approved-state-directory>",
        "CODEGRAPH_TELEMETRY": "0"
      }
    }
  }
}
```

### Claude Code

- Project/team scope: `.mcp.json` through current `claude mcp add --scope project` behavior.
- Local/user behavior: inspect current `claude mcp` help and `~/.claude.json` rather than guessing its storage boundary.
- Verify with `claude mcp list`, `claude mcp get codegraph`, or `/mcp` when available.

Reviewed first-party CodeGraph setup can touch `CLAUDE.md`, permissions, legacy hooks, or a prompt hook in addition to MCP configuration. Use runtime-native MCP-only configuration when those writes were not requested. This path is documentation-verified when a Claude CLI is unavailable locally.

For a Team-pinned Claude project, use the same approved JSON `mcpServers.codegraph` entry shown for Cursor in project `.mcp.json`, then verify the stored entry and connected tools with current Claude CLI/UI behavior. Do not translate the Codex TOML shape into Claude JSON.

### Other MCP clients

Read the client's current MCP documentation, choose its project/user scope, show the stdio entry and destination, and verify the server/tool list. Do not transpose Codex TOML, Cursor JSON, or Claude scope commands into another client.

## Project initialization and configuration

Select the actual indexed root before initialization. In a monorepo, decide whether one root graph or separate package graphs best matches the task.

Current CodeGraph versions that document `CODEGRAPH_DIR` accept only a plain directory name in the project root; the default is `.codegraph`. Record the effective value with the project root and use it in every CLI invocation and MCP environment. If installed/current documentation does not establish this capability, do not assume the override works: use one environment only or offer an approved version update.

When native Windows and WSL share one working tree, never share one index. After separate config approval, use distinct names such as `.codegraph-win` for the native Windows client/CLI and `.codegraph-wsl` for the WSL client/CLI. Keep each runtime, package manager, repository path, `CODEGRAPH_DIR`, and ast-grep invocation in that same environment.

```bash
codegraph help init
```

Then run only the form installed help documents. For example:

```bash
# Current releases where init performs indexing:
codegraph init

# Help-confirmed legacy releases where -i requests the initial index:
codegraph init -i
```

For an approved Team-pinned POSIX initialization, validate the state-directory value before CodeGraph can fall back to its default, require the exact local shim, and stop on the first failure:

```bash
set -euo pipefail

project_root="<approved-project-root>"
codegraph_dir="<approved-state-directory>"
codegraph_dir="${codegraph_dir#"${codegraph_dir%%[![:space:]]*}"}"
codegraph_dir="${codegraph_dir%"${codegraph_dir##*[![:space:]]}"}"
case "$codegraph_dir" in
  ""|"."|*..*|*/*|*\\*)
    printf 'Invalid CODEGRAPH_DIR: plain directory name required\n' >&2
    exit 1
    ;;
esac

codegraph_bin="$project_root/node_modules/.bin/codegraph"
if [ ! -x "$codegraph_bin" ]; then
  printf 'Missing project-local CodeGraph shim: %s\n' "$codegraph_bin" >&2
  exit 1
fi

CODEGRAPH_TELEMETRY=0 CODEGRAPH_DIR="$codegraph_dir" \
  "$codegraph_bin" init "$project_root"
```

Use the help-confirmed legacy `-i` form only with a legacy pin. Native Windows validates the selected state directory and exact shim before initialization and checks the command result:

```powershell
$projectRoot = "<approved-project-root>"
$codegraphDir = ("<approved-state-directory>").Trim()
if ([string]::IsNullOrWhiteSpace($codegraphDir) -or $codegraphDir -eq "." -or $codegraphDir.Contains("..") -or $codegraphDir.Contains("/") -or $codegraphDir.Contains("\")) {
  throw "CODEGRAPH_DIR must be a plain directory name"
}
$codegraphBin = Join-Path $projectRoot "node_modules\.bin\codegraph.cmd"
if (-not (Test-Path -LiteralPath $codegraphBin -PathType Leaf)) {
  throw "Missing project-local CodeGraph shim: $codegraphBin"
}
$env:CODEGRAPH_DIR = $codegraphDir
$env:CODEGRAPH_TELEMETRY = "0"
& $codegraphBin init $projectRoot
if ($LASTEXITCODE -ne 0) { throw "Project-local CodeGraph initialization failed" }
```

Only after project-opening status verification is separately approved, restate the exact approved root and state directory and bind the executable to that root again:

```bash
set -euo pipefail
project_root="<approved-project-root>"
codegraph_dir="<approved-state-directory>"
codegraph_dir="${codegraph_dir#"${codegraph_dir%%[![:space:]]*}"}"
codegraph_dir="${codegraph_dir%"${codegraph_dir##*[![:space:]]}"}"
case "$codegraph_dir" in
  ""|"."|*..*|*/*|*\\*) exit 1 ;;
esac
codegraph_bin="$project_root/node_modules/.bin/codegraph"
[ -x "$codegraph_bin" ]
CODEGRAPH_TELEMETRY=0 CODEGRAPH_DIR="$codegraph_dir" \
  "$codegraph_bin" status "$project_root"
```

```powershell
$projectRoot = "<approved-project-root>"
$codegraphDir = ("<approved-state-directory>").Trim()
if ([string]::IsNullOrWhiteSpace($codegraphDir) -or $codegraphDir -eq "." -or $codegraphDir.Contains("..") -or $codegraphDir.Contains("/") -or $codegraphDir.Contains("\")) {
  throw "CODEGRAPH_DIR must be a plain directory name"
}
$codegraphBin = Join-Path $projectRoot "node_modules\.bin\codegraph.cmd"
if (-not (Test-Path -LiteralPath $codegraphBin -PathType Leaf)) {
  throw "Missing project-local CodeGraph shim: $codegraphBin"
}
$env:CODEGRAPH_DIR = $codegraphDir
$env:CODEGRAPH_TELEMETRY = "0"
& $codegraphBin status $projectRoot
if ($LASTEXITCODE -ne 0) { throw "Project-local CodeGraph status failed" }
```

Initialization creates index state in the effective directory. In the same environment where the approved `CODEGRAPH_DIR` is set, validate that it is a plain name, then inspect that exact path rather than assuming `.codegraph/`:

```bash
codegraph_dir="${CODEGRAPH_DIR:-}"
codegraph_dir="${codegraph_dir#"${codegraph_dir%%[![:space:]]*}"}"
codegraph_dir="${codegraph_dir%"${codegraph_dir##*[![:space:]]}"}"
: "${codegraph_dir:=.codegraph}"
case "$codegraph_dir" in
  "."|*..*|*/*|*\\*)
    printf 'Invalid CODEGRAPH_DIR: plain directory name required\n' >&2
    exit 1
    ;;
  *) git check-ignore -q -- "$codegraph_dir/" ||
     git status --short --untracked-files=all -- "$codegraph_dir/" ;;
esac
```

Native PowerShell equivalent:

```powershell
$codegraphDir = if ([string]::IsNullOrWhiteSpace($env:CODEGRAPH_DIR)) { ".codegraph" } else { $env:CODEGRAPH_DIR.Trim() }
if ($codegraphDir -eq "." -or $codegraphDir.Contains("..") -or $codegraphDir.Contains("/") -or $codegraphDir.Contains("\")) {
  throw "CODEGRAPH_DIR must be a plain directory name"
}
git check-ignore -q -- "$codegraphDir/"
if ($LASTEXITCODE -ne 0) { git status --short --untracked-files=all -- "$codegraphDir/" }
```

Ask before editing `.gitignore`. Never delete, reinitialize, or share an existing index just because its version differs.

When installed/current documentation exposes root `codegraph.json`, use it only for a real project need such as custom extensions, tracked-source excludes, explicitly included first-party ignored source, or selected nested repositories. Show the proposed diff and obtain approval. Configuration changes can require a full re-index; inspect installed help before proposing it.

Do not create `.codegraph/config.json`.

## ast-grep project setup

Inspect existing config first:

```bash
test -f sgconfig.yml && sed -n '1,220p' sgconfig.yml
test -f sgconfig.yaml && sed -n '1,220p' sgconfig.yaml
find . -maxdepth 4 -type d \( -name rules -o -name rule-tests -o -name tests \) -print
```

Do not create `sgconfig.yml`, rule directories, or test fixtures for an ad-hoc search. Create them only when the user wants reusable rules/CI, show the intended paths, and follow existing repository conventions.

## Experimental ast-grep MCP

Prefer ast-grep CLI. The upstream ast-grep MCP server is experimental, has no stable release line, requires Python plus ast-grep on `PATH`, and is excluded from normal `setup` and `update`. It should not be persisted from an unpinned Git branch.

For an approved experiment:

1. review and select a full upstream commit;
2. clone/check out that commit into the approved scope;
3. run `uv sync --locked` in the reviewed checkout;
4. configure the runtime to launch that checkout;
5. record the commit and ast-grep CLI version;
6. verify exposed tools and keep CLI fallback.

Do not publish an unpinned `uvx --from git+...` MCP entry as a durable default.

## Authorization and verification

An explicit `setup` request for the announced root authorizes the ordinary agent-complete actions below. Keep each effect visible, and stop for a new approval when the effective action crosses the listed boundary.

| Action                                             | Covered setup scope                                  | Separate boundary                                      | Verify afterward                                   |
| -------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Install/reconcile CLI package or archive           | Existing approved project/declarative channel        | Privilege, global scope, channel/trust-policy change   | Executable path, version, help, install provenance |
| Register/edit MCP server                           | Named runtime and announced config scope             | Another runtime, user-wide expansion, secret material  | Server list, tool list, restart/reconnect          |
| Run `codegraph install`                            | Only when every known side effect was announced      | Undisclosed instruction/hook/global mutation           | Every touched config/instruction/hook surface      |
| Initialize/migrate/sync graph                      | Exact announced root and generated state             | Destructive rebuild, deletion, or another root         | Root, `status`, freshness, ignore state            |
| Create/edit project config and repository guidance | Minimal idempotent setup files in the announced root | Unrelated source, policy, or broad instruction rewrite | Diff, parse/test, discovery and behavior           |

After setup, report exact installed versions and scopes, runtime verification, graph readiness, ast-grep availability, persisted guidance discovery, any unverified path, and the next safe usage command. Do not claim setup complete from file presence alone.
