# Read-only gateway contract

Source: [LiteLLM Lens API](https://docs.litellm.ai/docs/proxy/lens/api).
Check the deployed version; repository documentation is not live qualification.

| Reader command | Gateway route                             | Scope                                                |
| -------------- | ----------------------------------------- | ---------------------------------------------------- |
| `list`         | `GET /v1/traces`                          | Required start_ms/end_ms; one page; optional cursor. |
| `show`         | `GET /v1/traces/{trace_id}?trace_ref=...` | Use both identifiers from the selected listing.      |
| `schema`       | `GET /v1/traces/query/help`               | Tables, fields, examples and server rules.           |
| `query`        | `POST /v1/traces/query`                   | Read-only SQL; same row access as trace reads.       |

These calls use a scoped **gateway read key**. Ingestion instead uses a separate
Lens tracing key on the ingestion base; it is not a read credential. Generating
keys, changing scopes, and enabling server query support are administrator tasks,
not actions this skill performs. The query service requires the proxy's server-
side master-key configuration; this does not mean the client needs that key.

## SQL

Read `schema` first. Then put a reviewed SELECT/WITH query in a local file. Use
`{start_ms}` and `{end_ms}` in the actual Timestamp predicates, with a final
`LIMIT` between 1 and 1000. For a schema that exposes these fields:

```sql
SELECT SpanName, count() AS spans
FROM otel_traces
WHERE Timestamp >= fromUnixTimestamp64Milli({start_ms})
  AND Timestamp < fromUnixTimestamp64Milli({end_ms})
GROUP BY SpanName
ORDER BY spans DESC
LIMIT 20
```

```bash
python3 scripts/lens_read.py query --sql-file query.sql \
  --start-ms 1794848400000 --end-ms 1794852000000
```

Add the requested session/project filter using verified schema fields. The
client's syntax checks are conservative input guards, **not a SQL firewall**;
read-only execution, memory/time limits, and access scope are server-enforced.
Do not use comments/placeholders to pretend an unbounded query is bounded.
Duration is nanoseconds in the documented raw trace table; verify field units.
Use `spend_logs FINAL` for cost aggregation and count each call once. Do not add
`FORMAT`. The documented server query budget is 10 seconds and 256 MiB; inspect
the deployed help rather than assuming newer versions preserve it.

The helper refuses redirects instead of forwarding a credential to another
origin, uses a 15-second HTTP timeout, and withholds error response bodies.
Common credential fields, Bearer strings and the active token are redacted from
successful JSON, but this is not a complete detector of secrets in code or prose.
No results are saved by the script; shell redirection is the operator's choice.
