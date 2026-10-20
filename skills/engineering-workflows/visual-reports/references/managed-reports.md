# Managed creation, updates and preview

Use one ignored/private local directory per report. The CLI writes only explicitly
supplied destinations. No API, repository source or remote service is modified.
Preserve source authority; update the existing model and reuse reviewed assets.

```sh
node scripts/render-report.mjs --create /absolute/report-store --input /absolute/model.md
node scripts/render-report.mjs --current /absolute/report-store
node scripts/render-report.mjs --update /absolute/report-store --input /absolute/model.json --base REVISION
node scripts/render-report.mjs --history /absolute/report-store
node scripts/render-report.mjs --preview /absolute/report-store
```

Creation requires an empty store. Every update requires the observed base revision.
A second writer or stale base fails clearly. Reload the current model, reconcile
the intended changes and retry with its revision; never retry a stale model blindly.

```text
report-store/
  current.json                    atomically replaced pointer
  revisions/
    TIMESTAMP-UUID/
      report.html                 complete offline snapshot
      report.md                   full reader export
      report.json                 canonical model
      revision.json               parent, timestamp, export digests
  .writer-lock/                   present only while writing
```

All three exports are rendered before publication. A complete revision is renamed
into place, then the current pointer is atomically replaced under the exclusive
lock. A failed write cannot replace the current report with partial exports.
Revision IDs and digests are validated on reads; no API overwrites old revisions.
History follows published parent links, excluding orphaned crash remnants.

A process crash may leave `.writer-lock` or an unreferenced revision. The CLI
never steals a lock by age or PID guess. Inspect `owner.json`, confirm the writer
has stopped, preserve the store and remove only the stale lock explicitly.
File sync and atomic rename protect process-level updates; this is not a
database-grade guarantee against every filesystem or power failure.

## Preview behavior

The session-owned Node server binds only `127.0.0.1`, accepts read-only requests
with a loopback Host, uses a random available port unless explicitly supplied, and
stops with Ctrl-C. Keep its URL stable for this session; a fixed `--port` can be
reused on restart when available. There is no background service or write endpoint.

The wrapper polls metadata and announces a new revision. It never silently
replaces the reader's report. **Übernehmen** applies the chosen version;
history can also be opened. Stable section anchors, relative scroll position and
open details are restored where the new report still has those elements.
Filters and temporary prototype playback are not persisted across model changes.

Board, flag, prompt and style drafts block replacement. Export the draft, or
explicitly select **Ungesicherten Entwurf verwerfen** before switching. A tab-close
warning provides another best-effort guard; browser termination can still lose
unexported drafts. The standalone snapshot has no connection to the preview server.

## Delivery

Offer a reachable HTTP preview in the ChatGPT/Codex desktop browser tab and
Microsoft Edge where the host supports them. Verify the actual route. A file link,
listening server or DOM loaded from a string is not evidence that the reader's URL
works. Also deliver the standalone HTML and complete exports for offline handoff.

## Browser verification

`node tests/browser-delivery.mjs ws://LOOPBACK/devtools/browser/ID` checks an
already running, isolated Chromium session. It creates temporary reports and a
read-only loopback preview, verifies file URLs with and without JavaScript,
network-free standalone reading, narrow/200% text layouts, reduced motion, local
editors, revision notices and draft protection. It closes its own test tab and
removes its fixtures. It does not install or launch a browser. Edge and native
desktop route observations remain separately recorded.

## Performance

Run `node scripts/benchmark.mjs` from the skill directory. It measures the checked-in
standard mixed report (including automatic layout), a separate cold CLI process,
and warm render/update p95. Its default gate is warm p95 below one second.
Model generation, research and first asset retrieval are excluded and reported as
unmeasured; these must not be hidden inside a claimed end-to-end generation time.
