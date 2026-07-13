# Stable Updates and Installation Provenance

Use this reference for the skill's once-per-task analysis-stack update check and every approved tool update. The check is advisory and does not authorize mutation. External version lookup and telemetry are separate choices.

## Contents

- [Scope and frequency](#scope-and-frequency)
- [Respect network and privacy policy](#respect-network-and-privacy-policy)
- [Discover installed provenance](#discover-installed-provenance)
- [Resolve the stable target](#resolve-the-stable-target)
- [Itemized approval checkpoint](#itemized-approval-checkpoint)
- [Approved update execution](#approved-update-execution)
- [Configuration and index separation](#configuration-and-index-separation)
- [Verification and rollback](#verification-and-rollback)

## Scope and frequency

Perform the stable-version lookup **at most once per tool per task** before first use, then reuse the result.

Include only the selected analysis stack:

- installed/required CodeGraph;
- installed/required ast-grep;
- configured MCP helpers relevant to the task;
- an optional semantic, codemod, or policy tool only after it is selected for the task.

Exclude:

- unused optional tools;
- application frameworks and dependencies;
- package-manager self-updates;
- Codex, Claude Code, or Cursor client updates unless a concrete compatibility blocker makes one relevant.

When a tool is missing, route to setup. Do not install it merely to learn a version.

## Respect network and privacy policy

Before external lookup, inspect explicit policy and user intent. Do not override:

- offline or air-gapped operation;
- `DO_NOT_TRACK`;
- `CODEGRAPH_NO_UPDATE_CHECK`;
- corporate registry/mirror restrictions;
- repository/declarative version pins;
- a user instruction not to browse or check updates.

CodeGraph's explicit `upgrade --check` can still contact GitHub even when its background-update environment flags are set. The skill must enforce the opt-out before invoking the command.

Permission to query public release metadata does not enable CodeGraph telemetry. Unless the user separately chose to keep telemetry enabled for the check, run the CodeGraph process with `CODEGRAPH_TELEMETRY=0`. Do not infer consent from CodeGraph's default-on state. If `DO_NOT_TRACK` or `CODEGRAPH_NO_UPDATE_CHECK` blocks lookup, report `not checked`; do not replace the opt-out with a narrower telemetry override just to reach GitHub.

If lookup is disallowed or fails:

1. report `remote update state: not checked` with the reason;
2. continue from installed version/help;
3. do not retry through another registry/API during the task;
4. do not imply that the installed version is current.

Only public package identifiers and release metadata may leave the machine. Never send repository paths, source, symbols, queries, config, or customer data to an update source.

## Discover installed provenance

Record, without mutation:

- resolved executable path and all PATH duplicates where shadowing is plausible;
- tool-reported version;
- package/declarative owner and scope;
- project manifest/lockfile pin when present;
- lifecycle/build trust policy;
- MCP command and pinned helper source when relevant.

Examples of read-only provenance checks; run only those matching the environment:

```bash
command -v codegraph 2>/dev/null || true
command -v ast-grep 2>/dev/null || true
which -a codegraph ast-grep 2>/dev/null || true

codegraph --version 2>/dev/null || true
ast-grep --version 2>/dev/null || true

npm list -g --depth=0 @colbymchenry/codegraph @ast-grep/cli 2>/dev/null || true
pnpm list -g --depth=0 2>/dev/null || true
cargo install --list 2>/dev/null || true
python -m pip show ast-grep-cli 2>/dev/null || true
brew list --versions ast-grep 2>/dev/null || true
```

Native Windows provenance checks:

```powershell
Get-Command codegraph, ast-grep -All -ErrorAction SilentlyContinue |
  Select-Object Name, CommandType, Source

$codegraphCommand = Get-Command codegraph -CommandType Application -ErrorAction SilentlyContinue |
  Select-Object -First 1
$astGrepCommand = Get-Command ast-grep -CommandType Application -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($codegraphCommand) { & $codegraphCommand.Source --version }
if ($astGrepCommand) { & $astGrepCommand.Source --version }

npm list -g --depth=0 @colbymchenry/codegraph @ast-grep/cli
pnpm list -g --depth=0
python -m pip show ast-grep-cli
```

Do not treat a package-manager command as authoritative if the resolved executable comes from a different channel. If provenance is ambiguous, report it and do not propose an update until the winning executable/channel is understood.

## Resolve the stable target

Use the installed channel's official metadata when possible, then the upstream official release as corroboration. Apply repository pins/freshness policy before deciding an update is eligible.

| Tool/channel                                | Read-only stable source                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| CodeGraph with current upgrade capability   | Existing MCP/status notice, then `codegraph upgrade --check` when external lookup is allowed |
| CodeGraph npm-family                        | Official `@colbymchenry/codegraph` registry metadata and GitHub release                      |
| CodeGraph standalone                        | Official GitHub release assets plus `SHA256SUMS`                                             |
| ast-grep npm-family                         | Official `@ast-grep/cli` registry metadata and GitHub release                                |
| ast-grep Cargo/Python/Homebrew/MacPorts/Nix | Matching official channel metadata, constrained by the active environment                    |
| Optional selected tool                      | Its official release/registry source recorded in the extension decision                      |

Examples when their channel is selected and network checks are allowed:

```bash
codegraph help upgrade 2>/dev/null || true
CODEGRAPH_TELEMETRY=0 codegraph upgrade --check

npm view @colbymchenry/codegraph version dist-tags --json
npm view @ast-grep/cli version dist-tags --json
```

Native Windows equivalent for the CodeGraph check; use the already-verified exact project-local shim instead of `Get-Command` when provenance is Team-pinned:

```powershell
if ($env:DO_NOT_TRACK -or $env:CODEGRAPH_NO_UPDATE_CHECK) {
  throw "CodeGraph remote update lookup is disabled by policy"
}
$codegraphCommand = Get-Command codegraph -CommandType Application -ErrorAction Stop |
  Select-Object -First 1
$previousTelemetry = [Environment]::GetEnvironmentVariable("CODEGRAPH_TELEMETRY", "Process")
try {
  $env:CODEGRAPH_TELEMETRY = "0"
  & $codegraphCommand.Source help upgrade
  if ($LASTEXITCODE -ne 0) { throw "CodeGraph upgrade help probe failed" }
  & $codegraphCommand.Source upgrade --check
  if ($LASTEXITCODE -ne 0) { throw "CodeGraph stable update check failed" }
} finally {
  [Environment]::SetEnvironmentVariable("CODEGRAPH_TELEMETRY", $previousTelemetry, "Process")
}
```

`codegraph upgrade --check` is a check only in versions whose installed help says so. It does not authorize or perform an update, but reviewed CodeGraph 1.4.1 includes every `upgrade` invocation in its telemetry flush path. Keep the `CODEGRAPH_TELEMETRY=0` override unless telemetry was separately approved for this action, so a default-on process cannot flush buffered telemetry. Do not use the override to bypass `DO_NOT_TRACK` or `CODEGRAPH_NO_UPDATE_CHECK`.

Select the newest **stable** version that is compatible with the active package/declarative policy. Ignore prereleases. Mention a prerelease only when a documented blocker has no stable fix and the user explicitly asks to evaluate prereleases.

Filter release notes locally for relevant languages, frameworks, platforms, parser fixes, MCP behavior, update/install changes, and known regressions. Do not claim a security reason unless an authoritative advisory or release note supports it.

## Itemized approval checkpoint

If no eligible stable update exists, report the checked state briefly and continue without a prompt.

If one or more updates exist, actively ask once with independent choices. Include every field:

| Component | Installed                  | Stable target/source              | Why it matters              | Exact action          | Scope and expected mutation                   | Restart/reindex            | Rollback                  |
| --------- | -------------------------- | --------------------------------- | --------------------------- | --------------------- | --------------------------------------------- | -------------------------- | ------------------------- |
| `<tool>`  | `<version, path, channel>` | `<version, official URL/channel>` | `<relevant fix/capability>` | `<versioned command>` | `<global/project files, network, privileges>` | `<required/none/separate>` | `<command or limitation>` |

State explicitly:

- approval is separate/itemized for each install or update;
- approving a package/binary does not approve agent config, prompt hooks, telemetry changes, graph sync/rebuild, or unrelated dependencies;
- the exact CodeGraph action shows `CODEGRAPH_TELEMETRY=0` unless telemetry was separately approved for that action; default-on telemetry is not approval;
- project-local actions include the named manifest/lockfile writes;
- declining one item does not block diagnostics or other approved items;
- a declined item will not be re-asked during the task.

Never offer or run a blanket `update all` operation.

## Approved update execution

After approval, re-check that the exact proposed version, channel, scope, and command still match the checkpoint. If the target changed, stop and re-present the affected item.

### CodeGraph

When installed help exposes a pinned upgrade and the detected channel is safe to update through it, a binary-only current-release action must disable agent-config refresh, Claude prompt-hook changes, and telemetry unless telemetry was separately approved for that action:

```bash
CODEGRAPH_TELEMETRY=0 \
CODEGRAPH_NO_INSTALL_REFRESH=1 \
CODEGRAPH_NO_PROMPT_HOOK=1 \
codegraph upgrade <version>
```

Native Windows equivalent, after resolving `$codegraphBin` to the approved installation rather than an alias or another PATH copy:

```powershell
$codegraphBin = (Get-Command codegraph -CommandType Application -ErrorAction Stop |
  Select-Object -First 1).Source
$previousTelemetry = [Environment]::GetEnvironmentVariable("CODEGRAPH_TELEMETRY", "Process")
$previousRefresh = [Environment]::GetEnvironmentVariable("CODEGRAPH_NO_INSTALL_REFRESH", "Process")
$previousPromptHook = [Environment]::GetEnvironmentVariable("CODEGRAPH_NO_PROMPT_HOOK", "Process")
try {
  $env:CODEGRAPH_TELEMETRY = "0"
  $env:CODEGRAPH_NO_INSTALL_REFRESH = "1"
  $env:CODEGRAPH_NO_PROMPT_HOOK = "1"
  & $codegraphBin upgrade <version>
  if ($LASTEXITCODE -ne 0) { throw "CodeGraph binary update failed" }
} finally {
  [Environment]::SetEnvironmentVariable("CODEGRAPH_TELEMETRY", $previousTelemetry, "Process")
  [Environment]::SetEnvironmentVariable("CODEGRAPH_NO_INSTALL_REFRESH", $previousRefresh, "Process")
  [Environment]::SetEnvironmentVariable("CODEGRAPH_NO_PROMPT_HOOK", $previousPromptHook, "Process")
}
```

Reviewed CodeGraph 1.4.1 can flush buffered telemetry when `upgrade` starts, before the update action completes. Omit `CODEGRAPH_TELEMETRY=0` only when the user separately chose to keep telemetry enabled for this exact action; neither update approval nor CodeGraph's default-on state is sufficient.

Before using this path, disclose that upstream standalone upgrade logic can execute its installer and may not verify the published SHA-256. For provenance-sensitive standalone installs, prefer the exact asset plus `SHA256SUMS` workflow from [setup-and-mcp-config.md](setup-and-mcp-config.md).

For an existing user/global npm-family installation, preserve that scope and use the exact package version through its detected manager:

```bash
npm install -g @colbymchenry/codegraph@<version>
pnpm add -g @colbymchenry/codegraph@<version>
```

For a Team-pinned project dependency, preserve project scope, the existing manager, and the reviewed manifest/lockfile mutation:

```bash
npm install --save-dev --save-exact @colbymchenry/codegraph@<version>
pnpm add --save-dev --save-exact @colbymchenry/codegraph@<version>
```

These are alternatives. Never substitute a global command for an approved project-local update, and never switch managers merely to obtain a version.

If the npm launcher can download a missing platform bundle and strict provenance/offline behavior is required, set `CODEGRAPH_NO_DOWNLOAD=1` and fail visibly rather than silently fetching a fallback.

Do not update a source checkout or `npx`-ephemeral execution as if it were a normal global package. Report the correct source/declarative action instead.

### ast-grep

Use the same approved channel and exact target when the channel supports it:

```bash
pnpm add -D @ast-grep/cli@<version>
npm install --save-dev @ast-grep/cli@<version>
pnpm add -g --allow-build=@ast-grep/cli @ast-grep/cli@<version>
npm install -g @ast-grep/cli@<version>
cargo install ast-grep --locked --version <version>
pipx install --force 'ast-grep-cli==<version>'
python -m pip install --upgrade 'ast-grep-cli==<version>'
```

For Homebrew, MacPorts, Nix, or another declarative channel, show that channel's actual update and rollback limitations. Do not switch to npm/Cargo just to obtain an exact version.

### Optional selected tools

Use only the version, channel, permissions, and sandbox/dry-run behavior approved when the tool was selected. Registry codemods, `npx`, `uvx`, and Git sources remain remote code execution even when invoked for one task.

## Configuration and index separation

A tool update does not authorize configuration repair or refresh.

After a CodeGraph update, inspect current generated/runtime config and diff it against existing config. Offer any needed config change as a separate item. Reviewed CodeGraph 1.4.1 `install --refresh` can rewrite multiple previously configured targets and locations; `--target` does not reliably narrow that refresh path. Prefer a runtime-native, reviewed MCP-only change when narrower behavior is required.

Likewise, treat these separately:

- MCP server restart/reconnect;
- Claude prompt hook or runtime instructions;
- permissions/auto-allow lists;
- telemetry consent;
- `codegraph sync` or full re-index;
- `codegraph.json`, `sgconfig`, rule, manifest, or lockfile edits not already listed in the update item.

## Verification and rollback

Verify immediately after each approved item before proceeding to the next:

```bash
command -v codegraph 2>/dev/null || true
which -a codegraph 2>/dev/null || true
codegraph --version 2>/dev/null || true
codegraph --help 2>/dev/null || true

command -v ast-grep 2>/dev/null || true
ast-grep --version 2>/dev/null || true
ast-grep --help 2>/dev/null || true
```

Native Windows equivalent; for Team-pinned installs, bind these variables to the exact `.cmd` shims under the approved project root:

```powershell
$codegraphBin = (Get-Command codegraph -CommandType Application -ErrorAction Stop |
  Select-Object -First 1).Source
$astGrepBin = (Get-Command ast-grep -CommandType Application -ErrorAction Stop |
  Select-Object -First 1).Source
$previousTelemetry = [Environment]::GetEnvironmentVariable("CODEGRAPH_TELEMETRY", "Process")
try {
  $env:CODEGRAPH_TELEMETRY = "0"
  & $codegraphBin --version
  if ($LASTEXITCODE -ne 0) { throw "CodeGraph version verification failed" }
  & $codegraphBin --help
  if ($LASTEXITCODE -ne 0) { throw "CodeGraph help verification failed" }
  & $astGrepBin --version
  if ($LASTEXITCODE -ne 0) { throw "ast-grep version verification failed" }
  & $astGrepBin --help
  if ($LASTEXITCODE -ne 0) { throw "ast-grep help verification failed" }
} finally {
  [Environment]::SetEnvironmentVariable("CODEGRAPH_TELEMETRY", $previousTelemetry, "Process")
}
```

Do not run `codegraph status` as binary-only verification. It opens the selected project and some versions can migrate generated index metadata. Run it only after affirmative approval for that root or in an approved disposable copy; skip it under a strict no-write instruction unless that copy was approved.

Then verify, as applicable:

- the PATH-resolved binary is the updated one;
- MCP reconnects and exposes only expected tools;
- after the separate project-opening boundary is affirmatively approved or an approved disposable copy is selected, existing graph status can be read without deletion/reinitialization;
- ast-grep config parses and reusable rules pass positive/negative tests;
- project manifests/lockfiles contain only the approved change;
- no runtime config, instructions, hooks, or telemetry state changed unexpectedly.

Record the previous version before execution. Provide an exact same-channel downgrade when supported. If the channel cannot reliably restore an old version—commonly a rolling formula/port—say so before approval.

On failure:

1. stop remaining updates;
2. preserve indexes, config, and user source;
3. report the failing command without secrets;
4. verify whether the prior executable still works;
5. roll back only through the pre-disclosed safe path;
6. otherwise leave a precise repair proposal for separate approval.
