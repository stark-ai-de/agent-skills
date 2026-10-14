# Official MCP connection

Karakeep's web service stores the collection. The official `@karakeep/mcp` process
exposes tools over STDIO and calls that service. The browser UI is not in this path.
Every agent connects to the same endpoint and intended account; another MCP process
does not require another database.

## Runtime and credentials

Reuse an existing official MCP launcher first. Inspect its pinned package/runtime
and credential source without printing secrets. The checked baseline is
`@karakeep/mcp@0.33.1`; web and MCP package versions are independent.

If absent and installation is authorized, install that exact official package once
in a dedicated user runtime directory using the host's existing package owner. Keep
the resulting dependency lockfile. On NixOS prefer a pinned Nix derivation in the
existing configuration; do not add a duplicate global Node/toolchain. A non-Nix host
can use a private directory outside Git with a small private `package.json` and
`pnpm add --save-exact @karakeep/mcp@0.33.1 --ignore-scripts`. Resolve the installed
executable to an absolute path. Review dependency/runtime requirements before use.

The bundled launcher installs nothing and never runs `npx` at startup. It requires
Python 3.10+ on POSIX. It starts an already-installed **official** executable; it is
not a reimplementation of Karakeep's MCP protocol.

In the intended Karakeep account, use Settings to create a revocable read key for
bookmarks, assets, lists, tags and highlights as supported by the selected release.
Store its two literal assignments in private `mcp.env`, owned by the execution user,
mode `0600`, in a private mode-`0700` directory. Use a local editor or secret-entry
UI; never place the key in a shell command, chat, Git or client TOML/JSON. The fields
are `KARAKEEP_API_ADDR` (the selected loopback origin) and `KARAKEEP_API_KEY` (the
actual account key). The parser supports quoted literals, not shell `export` lines.

The launcher accepts loopback HTTP(S) origins and arbitrary valid ports. It rejects
remote hosts, credentials in URLs, paths/queries, duplicate fields, symlinked secret
files and loose permissions. A later remote deployment needs a separate reviewed
connection design; do not weaken this local launcher or expose its HTTP port.

## Codex

Use the actual installed paths below. TOML does not shell-expand `~` or `$HOME` in
these command arguments. This is a template, not a command to copy unresolved.

```toml
[mcp_servers.karakeep]
command = "/absolute/path/to/python3"
args = ["/absolute/path/to/karakeep-knowledge/scripts/mcp_launcher.py", "--env-file", "/absolute/private/karakeep/mcp.env", "--", "/absolute/path/to/official/karakeep-mcp"]
enabled = true
required = false
startup_timeout_sec = 20
tool_timeout_sec = 60
enabled_tools = ["search-bookmarks", "get-bookmark", "get-bookmark-content", "get-bookmark-lists", "get-lists", "get-list", "get-tags", "get-tag", "get-tag-bookmarks"]
```

When a Nix-managed or previously verified private launcher exists, point `command`
directly to it and omit redundant wrapper arguments. Verify the actual tools
advertised by that installed version and keep the read allowlist aligned. Tool
filtering is a convenience; a scoped API key is the authorization boundary.

Back up the client's writable configuration before a scoped edit. If it is generated,
change its declarative source through the existing owner, preserving unrelated
servers and settings. Do not replace writable runtime TOML with a Nix-store symlink.
Configuration examples contain no API key.

Reload/reconnect the MCP server using the current client's supported controls, or
start a fresh session when necessary. Check **tools actually callable in that
session**, run `search-bookmarks`, then `get-bookmark-content`. A settings row or a
saved receipt does not prove the agent can call tools.

## Other clients and host boundaries

For clients accepting `mcpServers`, use the same command and arguments:

```json
{
  "mcpServers": {
    "karakeep": {
      "command": "/absolute/path/to/python3",
      "args": [
        "/absolute/path/to/karakeep-knowledge/scripts/mcp_launcher.py",
        "--env-file",
        "/absolute/private/karakeep/mcp.env",
        "--",
        "/absolute/path/to/official/karakeep-mcp"
      ]
    }
  }
}
```

Check that client's documented schema and read-tool policy before editing it. Prefer
an individual revocable key for each independently managed client/person. Shared
collection means the same server/account or deliberately shared lists, not copied
databases. Do not share a different user's key merely to make a test pass.

On Windows/WSL, determine where the MCP process actually runs. A Windows client cannot
execute a Linux path directly. Use an explicitly supported WSL launch command targeting
the intended distribution or run the agent in that Linux environment. Keep the key
and database on their owning side; do not copy them between environments. Verify any
Windows-to-WSL launch separately. A cloud executor's `localhost` is a different host.

Installing this skill alone does not register an MCP server, install Docker or prove
automatic skill activation. If persistent agent guidance is requested, add a scoped
pointer to this skill and the nonsecret private-receipt location through that host's
configuration owner. Avoid a global rule to search unrelated tasks.

## Approved sync and curation writes

Keep ordinary retrieval on the read connection. For requested writes or an approved
standing policy, use a separately authorized write-capable key/connection scoped to
bookmarks, lists and tags as needed. Discover callable schemas before selecting tools;
never silently widen the read key or assume product features are all exposed by MCP.
Record the intended account in the private policy and verify identity before a batch.
See [Sync](sync.md) and [Curation](curation.md) for authority and capability gaps.
