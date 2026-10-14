# Persistence and operations

## What must survive

Keep the chosen configuration directory (service secrets, local account credentials
if stored, MCP key and deployment definition), data directory (`data/` including
SQLite/queue/assets, plus `meilisearch/`) and private backups/receipts. Containers and
images are replaceable. The database and captured assets are the knowledge collection.
A search index can be rebuilt through the supported procedure; its loss is not a
reason to recreate the account or replace the database.

Never delete/move bind-mount roots or rotate existing secrets as a startup fix.
Avoid `docker compose down --volumes` and broad Docker cleanup until the actual mounts
are known, especially when adopting an older named-volume deployment. Bind mounts
do not make a named-volume deletion command universally safe.

Normal start/stop goes through the existing service manager. For a manually owned
new Compose stack, from its configuration directory:

```bash
docker compose --project-name karakeep --file compose.json up --detach --wait
docker compose --project-name karakeep --file compose.json stop --timeout 60
```

Apply changed environment files with `up` through the owner; plain `restart` retains
the old container environment. Stopping Karakeep or closing its browser UI does not
delete data. MCP requires the service to be running, not the user's browser window.

## NixOS and WSL

Reuse a working module first. For a new deployment, `assets/nixos-module.nix` provides
an optional `services.karakeepKnowledge` module. Place the whole skill-owned scripts/
assets layout at a stable source location in the Nix configuration, keeping runtime
secrets and state outside it. Import the module and set `enable = true`, the existing
Linux `user`, selected `port`, and optional directory overrides. Explicit XDG paths
from preparation must match these module options; defaults use that user's home.

The module requires the selected Docker engine to be enabled already. It does not
choose/install a second engine, alter firewall policy, or initialize accounts. Prepare
the private state first; missing files make startup fail visibly instead of generating
new secrets. Keep the owning user's home mount available before the unit starts.

The optional `mcpPackage` accepts an existing pinned Nix derivation providing
`bin/karakeep-mcp`; when supplied, the module also installs `karakeep-mcp-local` with
private-file loading. Otherwise register the inspected existing launcher/runtime
from the MCP guide. No package availability in a particular nixpkgs revision is assumed.

Commands for a deployment owned by this example module are `systemctl start`, `stop`
or `restart karakeep-knowledge` and `karakeep-knowledge ps`. It installs the public
Compose definition at `/etc/karakeep/compose.json`. Use the system's established rebuild
workflow; evaluate/build before an authorized switch, and check the actual active
unit and mounts afterward. Source configuration alone is not activation evidence.

Nix replaces programs and generated definitions. Secrets are read from external
private files and data is bind-mounted outside `/nix/store`, so a normal rebuild
preserves them. Verify this on the target machine with a backup and before/after
bookmark IDs and content/asset hashes. Do not claim the example was live-rebuilt just
because Nix parsed it. Declarative source must include any new files through the
repository's normal delivery process; an untracked module may be absent from a Git flake.

In WSL the service starts when the distribution and its service manager start.
Windows startup does not by itself guarantee that distribution is running. Use its
existing startup mechanism; creating a Windows login task is separate scope.
`wsl --unregister`, reinstalling the distribution, deleting its virtual disk or
removing the persistent home destroys locally stored data **and local backups**.
Keep a verified, encrypted copy outside that failure domain before such operations.

## Consistent backup and isolated restore

Use the existing verified backup command when one is available. Otherwise:

1. Record the exact Compose definition/pins, private config, data paths and which
   Karakeep services were running. Choose a private destination outside the data tree.
2. Stop only this stack through its owner for a consistent snapshot. A plain copy of
   a live SQLite file can miss its WAL; never claim it is a verified backup.
3. Archive config, the entire data roots and the deployment/pin receipt, preserving
   numeric ownership and permissions. Include the MCP runtime lock/pins needed to
   reconstruct it, not caches. Container-owned files may need scoped privileges.
4. Close and verify the archive, write/check a SHA-256 checksum and protect both the
   archive and any extracted credentials. Restore precisely the previous running
   service state even if backup creation fails.
5. Restore first into private staging with a **different Compose project, data paths,
   container/network names and loopback port**. Adjust staging URLs without altering
   the original secrets/config. Confirm every effective mount points into staging.
6. Start with matching image versions, then check database integrity, account access,
   representative IDs, stored text, screenshot/archive bytes, search and MCP. Only a
   requested production recovery may replace the active roots; retain a rollback copy.

Do not promise backup validity from archive existence alone. Record checksum and
restore observations separately. Encrypt any off-machine copy because it includes
private collection data and secrets. Cloud backup/sharing is optional separate scope.
