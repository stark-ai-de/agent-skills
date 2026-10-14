# Set up or connect

## Inspect before selecting a route

Determine the execution OS/user and, on WSL, the distribution. Locate the active
client's MCP configuration and current Karakeep tools. Inspect Docker CLI ownership,
context, daemon, Compose, service units, occupied ports and existing Karakeep mounts.
Use bounded fields from container inspection; full inspect/config output can expose
environment secrets. A remote Docker context is not a local installation: bind paths
belong to the daemon host. Resolve the intended host before starting anything.

Run `python3 scripts/status.py` from this installed skill directory, or supply
absolute `--config-dir`, `--data-dir` and `--url` values discovered from the existing
setup. It never scans all profiles, checks Docker, or claims MCP initialization.

| Evidence                                           | Action                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| MCP search and content work                        | Reuse the existing collection; go to the use route.                     |
| API readable, MCP absent                           | Connect that account using the MCP guide.                               |
| State/config/container exists, service stopped     | Inspect its owner and start mechanism; repair/start within the request. |
| 401/403, empty unexpected collection               | Verify account, key and scope; do not create a replacement account.     |
| Port responds unexpectedly                         | Identify its owner; do not displace it or attach a key blindly.         |
| No installation found after host/config inspection | Prepare a new stack if setup was requested.                             |

Record the chosen paths and versions before changes. If a different container engine,
Docker group access, host networking or system installation is needed, explain the
concrete change before seeking any missing authorization. Existing read authorization
does not grant setup authority. Reuse explicit setup approval already in the session.

## New local stack

The baseline uses the official three-service Docker topology with immutable image
digests. Check [upstream versions](sources.md) before a new installation; adapt/pin a
newer compatible baseline deliberately instead of substituting `latest`. Never apply
a newer Meilisearch image to an existing index without its migration procedure.

Defaults, evaluated on the selected Linux host:

| Area          | Default                                          | Contains                                           |
| ------------- | ------------------------------------------------ | -------------------------------------------------- |
| Configuration | `${XDG_CONFIG_HOME:-$HOME/.config}/karakeep`     | Compose and private service/MCP secrets            |
| Data          | `${XDG_DATA_HOME:-$HOME/.local/share}/karakeep`  | SQLite, queue, page assets and Meilisearch data    |
| State         | `${XDG_STATE_HOME:-$HOME/.local/state}/karakeep` | Private backups, receipts and optional MCP runtime |

Choose durable directories outside project repositories and the Nix store. On WSL,
keep live databases on the native Linux filesystem. Do not place them in a temporary
worktree or a Windows-mounted folder. The helper creates `.gitignore` files, but
verify the chosen roots are untracked; ignore rules do not remove tracked secrets.

First preview, then apply the same inspected paths when setup is authorized:

```bash
python3 scripts/prepare.py
python3 scripts/prepare.py --apply
```

Use `--config-dir`, `--data-dir`, `--state-dir` and `--port` for approved custom
locations. The helper refuses **any** existing target, including an empty directory
or partial previous preparation. Inspect/adopt/recover those paths manually; never
delete them just to make the helper pass. It does not rotate credentials on re-entry.

From the selected configuration directory, validate without printing secrets:

```bash
docker compose --project-name karakeep --file compose.json config --quiet
docker compose --project-name karakeep --file compose.json up --detach --wait --wait-timeout 180
```

For NixOS, establish [declarative ownership](operations.md#nixos-and-wsl) before
claiming setup complete. Both the prepared Compose JSON and the Nix template use
the same project name and mounts. Do not start a second owner for an existing stack.

Check that only the web service publishes the chosen port, bound to `127.0.0.1`
and `::1`. Search and capture services must remain internal. If IPv6 loopback is
unsupported, select and document an IPv4-only loopback mapping; never widen the bind.
Verify Windows-to-WSL localhost access separately when the user needs it.

## Account and MCP

Open `http://localhost:3000` (or the selected port) and create the intended **local**
account. Ask only for missing personal choices; use a private UI/editor/password
manager for passwords and API keys. If account generation was requested, save the
generated credential privately and tell the user its location, not its contents.
No Karakeep cloud registration is necessary. After the intended account exists,
disable new signups in private `karakeep.env` and apply with Compose `up` or the
owning service manager. A plain `restart` does not apply changed environment files.

Follow [MCP](mcp.md) to create a scoped key for this account and configure the actual
host. Verify a known bookmark belongs to the same account seen in the browser.
Keep ordinary retrieval read-only. A separate, approved import connection may use
write scopes; do not silently promote the normal key.

Screenshots, full-page HTML archives and full-text search are enabled. Automatic
AI tags, summaries, embeddings and semantic search are disabled. Inspect an existing
Ollama installation only if relevant; adding a provider or downloading models is a
separate expansion, not a setup prerequisite.

## Acceptance before bulk import

Use five public representative links selected with the user or from the authorized
collection: documentation, a component page, a framework guide, a design page and a
tool page. Deduplicate against the intended account and retain existing IDs.

1. Save the links through the approved interface. Record IDs and original URLs.
2. Wait for bounded capture completion. Inspect actual extracted text, screenshots
   and HTML archives; a login, error or challenge page is a failed source capture.
3. Search for a distinctive phrase from each page and retrieve actual content through
   the **official MCP**. A REST health check does not prove this.
4. When a service restart is in scope, record IDs and content/asset hashes, restart
   through its owner, then compare. A closed UI browser must not prevent MCP access;
   do not stop the capture-browser container for this check.
5. Make a consistent backup, verify its checksum, and restore to an isolated staging
   instance with separate roots, project and loopback port. Verify representative IDs,
   content, assets and search. Preserve the real instance throughout.

Record each result as observed, failed or not run. A service restart is not a full
Windows/WSL reboot; a template evaluation is not an activated NixOS rebuild. Report
these distinctions. Proceed to an explicitly requested bulk import after the pilot
passes. A setup-only request does not authorize importing every reachable link.

Save a private receipt with endpoint, service owner, absolute configuration/data/
backup paths, image/runtime pins, credential **file path**, account label, a known
bookmark ID and dated acceptance results. Never include credential values. Preserve
the existing declarative client config and its unrelated settings.
