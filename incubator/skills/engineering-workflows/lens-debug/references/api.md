# Read-only gateway contract

Source: [LiteLLM Lens API](https://docs.litellm.ai/docs/proxy/lens/api).
Check the deployed version; repository documentation is not live qualification.

| Reader command | Gateway route                                                   | Scope                                                |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| `list`         | `GET /v1/traces`                                                | Required start_ms/end_ms; one page; optional cursor. |
| `show`         | `GET /v1/traces/{trace_id}?trace_ref=...`                       | Both identifiers; optional cursor and page size.     |
| `span`         | `GET /v1/traces/{trace_id}/spans/{span_id}?trace_ref=...`       | Full selected input/output, not just previews.       |
| `span --error` | `GET /v1/traces/{trace_id}/spans/{span_id}/error?trace_ref=...` | Full error when marked truncated.                    |
| `schema`       | `GET /v1/traces/query/help`                                     | Tables, fields, examples and server rules.           |
| `query`        | `POST /v1/traces/query`                                         | Read-only SQL; same row access as trace reads.       |

These calls use an ordinary **user-owned LiteLLM virtual key** with access to the
requested traces. `TRACE_READ` is not a special key type; `LENS_READ_KEY_FILE` is
only this helper's private-file setting. An existing inference key can be reused
when its user/route scope allows these reads. A separate read-scoped key is
optional. Never use a gateway master key in this helper.

Keys without a user owner (including team-only service-account keys) receive 403
on trace reads. Ordinary team members need the team's `/spend/logs` member
permission for shared team traces; team administrators already see their team's
traces. Inspect the current scope before asking for any access change. Never
replace the complete permission list to add one permission.

Ingestion uses a separate Lens tracing key at the ingestion base. Its delivery
receipt endpoint can confirm known trace/span IDs but returns no trace content.
Keep the gateway base separate and do not append `/v1` yourself: the helper owns
that prefix. Key creation, scope changes and enabling query support are operator
tasks, not actions this skill performs. The query service needs a server-side
master-key configuration; the reader does not need that key.

### Complete trace evidence

List within an explicit interval and identify the actual requested agent/run.
Keep its `trace_id` and `trace_ref`; a Codex thread UUID is not a trace ID.
`show` returns one page of span summaries. Pass `next_cursor` explicitly using
`--cursor`; optionally use `--page-size` (1..1000; deployed server limits may be
lower). There is no unbounded automatic pagination. Fetch relevant full spans
with `span`, and `span --error` when indicated. Retain partial-coverage warnings
if any requested page or content is missing. Only share an exact validated UI
link, not a guessed trace URL or an URL containing credentials.

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
