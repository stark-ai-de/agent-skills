# Official CLI reads

Use this optional route when the official CLI is already available and reads are
authorized. It does not replace the [reconciliation helper](helper.md).

## Identity and account first

1. Inspect `type -a karakeep` and `command -v karakeep`. A local command with that
   name may be a service/Compose wrapper. Check its owner/package, version and help
   before using bookmark commands; do not install or replace it implicitly.
2. The inspected [v0.33.2 CLI source](https://github.com/karakeep-app/karakeep/tree/v0.33.2/apps/cli)
   declares `@karakeep/cli` version **0.33.0**. Check `karakeep --version`,
   `karakeep --help` and relevant subcommand help on the actual executable. That
   source has no `karakeep skill`; use it only if installed help proves support.
3. Resolve the approved loopback HTTP(S) origin and private credential environment.
   The helper/MCP uses `KARAKEEP_API_ADDR`; the CLI uses `KARAKEEP_SERVER_ADDR`.
   Validate the origin against the existing connection policy before mapping it:

   ```sh
   export KARAKEEP_SERVER_ADDR="${KARAKEEP_API_ADDR:?approved origin is required}"
   karakeep --json whoami
   ```

   Keep `KARAKEEP_API_KEY` in the private host-provided environment. Never put keys
   in command arguments, print them or source an untrusted env file. An absent
   address must stop the workflow: the CLI's cloud default is not the local account.
   Compare the returned account identity with the private receipt/policy before
   reading collection contents. Named hosts such as `karakeep.localhost` are outside
   this skill's direct loopback-origin contract.

## Bounded search and content

After identity/help/account checks, the inspected commands are:

```sh
karakeep --json bookmarks search 'list:"Project references" rust' --limit 5 --search-mode fts
karakeep --json bookmarks get BOOKMARK_ID
karakeep --json bookmarks content BOOKMARK_ID --format markdown --max-chars 20000
karakeep --json bookmarks content BOOKMARK_ID --format markdown --max-chars 20000 --cursor RETURNED_CURSOR
```

Use a real selected ID and returned cursor; the placeholder list is not created by
these commands. Start with metadata and a small limit. Full-text search is the
default; semantic/hybrid search requires existing server support and authorization.
Do not broaden to `--all`, another account or collection-wide export on an empty hit.

For an ordinary answer, an identified excerpt may suffice. State its limits and
cite the original URL. For verified sync evidence, follow every cursor to completion,
check one consistent `contentVersion`, preserve the complete text and hash, and
inspect its substance. A later-page error, missing cursor, changed version, login
page or summary is not a verified original. The helper performs those complete
reads itself; CLI snippets do not replace its bound plan/apply evidence.

For a separately requested PDF/SingleFile repair, inspect the existing release's
official asset/import or SingleFile capabilities. Preserve the original object,
notes and provenance; choose non-overwriting handling (`ifExists: skip` where
supported). Report capture failure instead of automatically uploading archives,
installing a capture engine or bypassing access controls.
