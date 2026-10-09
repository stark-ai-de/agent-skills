# Database

Read for schema/query work and route 5. Sources: [database](https://core.telegram.org/bots/serverless#the-database), [queries](https://core.telegram.org/bots/serverless#querying), [migrations](https://core.telegram.org/bots/serverless#migrations), [CLI migration flags](https://core.telegram.org/bots/serverless#migrate).

## Schema contract

Each bot has persistent SQLite-backed storage. Declare tables as named exports from `tgcloud/schema.js`, using `table` and column builders from `sdk/db`. Describing or deploying the schema does not apply it to the database.

Supported documented factories include text, integer, real/float, numeric, blob, boolean, and json. Column names may be explicit or derive from property names. Encoding modes include boolean, json, timestamp (seconds), timestamp_ms, and bytes. Blob values use Uint8Array. Mode conversion is separate from SQLite storage type.

Use documented primary-key, not-null, unique, default, generated-column, and deprecated modifiers. Declare indexes, unique/check constraints, expression indexes, and partial indexes in the table extras callback. Table modifiers include strict, withoutRowid, and deprecated. Check the SDK guide for exact combinations rather than importing upstream Drizzle builders.

Original schema example:

```js
import { table, integer, text, index } from "sdk/db";

export const notes = table(
  "notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerId: integer("owner_id").notNull(),
    body: text("body").notNull(),
  },
  (t) => ({
    byOwner: index("notes_by_owner").on(t.ownerId),
  }),
);
```

There are no foreign keys: `.references()` and table-level `foreignKey()` fail, and raw SQLite foreign-key clauses do not supply enforcement. Model relationships as ordinary columns and enforce ownership/integrity in application code. Insert parents before children and remove children before parents where required; account for failures and orphan reconciliation. Do not claim transactions or cascades without verified platform support.

## Query contract

Import `db` from `sdk`, operators from `sdk/db`, and tables from the local schema. Every query terminal is asynchronous and must be awaited.

- Select with from, where, orderBy, limit/offset, groupBy/having, distinct, and projections. Terminals are all, get, and values. get returns the first row or null.
- Insert/update/delete terminate with run. Returning rows and conflict-update behavior are supported; use an atomic SQL expression for a counter instead of a read-then-write race.
- Count with `db.$count(table, where?)` or an aggregate projection.
- Use documented comparison, null, Boolean, range, membership, ordering, and aggregate operators. A column reference can be compared with another column or SQL expression.
- Bound parameters, including the SQL template helper, are preferred to concatenating input. Literal raw SQL must never contain unchecked user values.
- Batch inserts are bounded by SQLite's parameter limit; chunk using the actual row/column shape rather than assuming unbounded batches.

For owned data, constrain queries by the verified owner as well as the requested resource identifier:

```js
import { db } from "sdk";
import { and, eq } from "sdk/db";
import { notes } from "../schema.js";

export async function ownedNote(ownerId, noteId) {
  return await db
    .select()
    .from(notes)
    .where(and(eq(notes.ownerId, ownerId), eq(notes.id, noteId)))
    .get();
}
```

Raw methods are db.run, db.all, db.get, and db.values. Raw rows do not receive the table builder's Boolean/JSON/date conversion. Positional values avoid collisions from duplicate projected column names; use aliases when returning objects. Read the documented run-result shape instead of assuming a driver-specific result.

## Migration decisions

For an existing bot, inspect the deployed schema and local changes separately. Use a schema-only deploy followed by migration and then dependent consumer code when an additive change needs that sequencing. Do not publish handlers that immediately require an absent table.

A migration preview is a cloud database inspection. `migrate --dry-run` applies nothing; `--local` chooses the local schema for comparison, not a local database. Without dry-run, `migrate --local` can change the live database.

| Classification | Treatment                                                                       |
| -------------- | ------------------------------------------------------------------------------- |
| safe           | Additive operations; apply only within authorized scope                         |
| warning        | Potential loss or slow operation; review the exact changes and recovery plan    |
| manual         | Requires a separate, explicit data/schema operation                             |
| undocumented   | Present in the database but missing from schema; report without assuming a drop |

Flag distinctions:

- Interactive migrate asks before applying.
- `--safe` applies safe changes and skips warnings/manual work; it is a write, not a preview.
- `--yes` also applies every warning without prompting. Never use it as a convenience workaround for a non-interactive terminal.
- `--dry-run` cannot be combined with `--safe` or `--yes`; safe and yes are mutually exclusive.
- Check the result summary. Successful exit does not prove required skipped/manual changes were completed.

The prose overview's statement about individual warning confirmations must not hide the concrete `--yes` behavior. Check the installed CLI and command reference if they conflict.

## Destructive or manual changes

Removing a declaration alone does not drop the table/column. Explicit deprecation requests a drop; review and authorize that migration, then remove the declaration only after the drop is verified.

Type changes require a reviewed manual migration, potentially adding a replacement, copying/converting data, and changing consumers. Do not guess a conversion or claim SQLite will safely coerce existing values.

The platform documentation does not establish backup/restore commands or transaction guarantees. Before a destructive operation, obtain a verified recovery method and concrete authorization or stop that operation. A code rollback cannot restore dropped data. Report applied, skipped, remaining manual, and undocumented changes separately.
