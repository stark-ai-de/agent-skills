# Local helper and Jev contract

Use Node.js 24.18+ and Git supporting `--no-lazy-fetch`. The helper has no install or runtime dependencies.
Run `node <skill-directory>/scripts/change-impact.mjs --help` for commands.
Every operation reads one JSON document on stdin and emits JSON on stdout.
Exit 2 means invalid input, incomplete ranking or an unsuccessful doctor check; it never means a clean review.

## Collect (offline)

Input fields: `root` (absolute Git top-level), `base` (commit/ref), `head`
(commit/ref or `WORKTREE`, default), `scope` (relative files/directories, default
`["."]`), and one to eight `contracts`. A contract contains `id`, `before`,
`after`, and `evidence` entries with `path`, `side` (`before` or `after`), and
`quote`. At least one exact quote from each side must exist in collected source. Git object reads stay offline and have a ten-second command timeout. Missing objects require an explicit fetch outside this helper.

```json
{
  "root": "/path/to/project",
  "base": "main",
  "head": "WORKTREE",
  "scope": ["src", "docs", "tests", "examples"],
  "contracts": [
    {
      "id": "name-scope",
      "before": "Project names are globally unique.",
      "after": "Project names are unique within an organization.",
      "evidence": [
        { "path": "src/projects.mjs", "side": "before", "quote": "return a.name === b.name;" },
        {
          "path": "src/projects.mjs",
          "side": "after",
          "quote": "return a.org === b.org && a.name === b.name;"
        }
      ]
    }
  ]
}
```

Adapt quotations to actual inspected source. Optional `limits` fields and defaults:
`maxFiles: 500`, `maxFileBytes: 65536`, `maxTotalBytes: 1048576`,
`maxCandidates: 400`, `chunkLines: 40`. Their respective ceilings are 2000,
262144, 8388608, 2000 and 120. Oversized line blocks are omitted rather than
silently truncated. These are coverage bounds, not guarantees of relevant recall.

The output packet includes source-backed contracts, candidates, snapshot identity
and coverage omissions. It retains local `options.root` for revalidation; that
absolute root is never included in provider requests. Content hashes represent
the actual scoped files and both revisions. Paths outside scope are not assessed.
Commit targets read Git blobs. WORKTREE reads tracked and nonignored untracked
files, rejects symlinks and binary content, and records deletions in the manifest. Excluded dependency/build/secret paths do not consume the eligible-file budget. File growth and streamed API bodies remain bounded during reading.

## Rank (external API)

Pass the untouched collection packet to `rank --live [--max-requests N]`.
Use existing project permission and provide `TYPESAFE_API_KEY` only through the
environment, or configure `TYPESAFE_API_KEY_FILE` as described in [setup](setup.md). Do not put the key into arguments or JSON. Missing authorization is
not solved by discovering a credential elsewhere.

The helper uses `POST https://api.typesafe.ai/v1/systemone` with Bearer auth and
model `jev-1.13.0`. Each independent Choice compares an excerpt to one contract:
`old_assumption`, `compatible`, `unrelated`, or `uncertain`. Questions explicitly
name their excerpt; question keys themselves carry no inference meaning.
Each serialized request is capped at 24,000 UTF-8 bytes, conservatively below the
documented token limits. Relative paths, excerpt text and old/new contracts leave
the machine. No proxy, custom endpoint, repository upload or remote tools are used.

The output ranks every successfully evaluated pair by
`P(old_assumption) + 0.5 * P(uncertain)`. This heuristic orders investigation; it
is not calibrated error probability or an approval threshold. Nothing is dropped
solely for a low score. The host should inspect uncertain cases and preserve
mandatory context independently.

Default budget: 16 HTTP attempts (hard ceiling 100), 15 seconds per request,
at most two retries for 429/529. Retry-After (seconds or HTTP date) longer than five seconds stops the
pass explicitly. Other HTTP failures, bad schemas, timeouts and redirects stop
without exposing upstream bodies or credentials. Attempts include retries.
`usage.estimatedCostUsd` uses the documented $0.042/M input-token rate; it is a
known-usage estimate, not an invoice. When `costComplete` is false, unknown
attempt costs are missing. No full-workflow savings claim follows from this field.

Both collection and post-request snapshot checks run locally. Queue/report validate the complete ranking against the packet: unique known pairs, probabilities, priority, coverage arithmetic and success status must agree. Edited packets or
changed state must be recollected. Keep API outputs as untrusted advisory data.

## Report (offline)

Input: `{ "packet": <collection>, "ranking": <optional ranking>,
"confirmations": [...] }`. Each confirmation contains
`candidateId`, `contractId`, `status` (`confirmed`, `dismissed`, `unresolved`),
`reason`, and an exact `quote` from the candidate. The host records runtime
commands and actual observations alongside the report when it executed checks.

Accumulate confirmations across batches; one entry per candidate/contract pair is allowed, up to the collected pair count. Replace an unresolved entry when its status changes; duplicate entries are rejected.

The helper verifies source identity and quotations, then separates findings from
reviewed candidates. `pendingPairs`, `unresolvedPairs`, collection omissions and
provider errors remain visible. Confirmation is attributed to the host agent;
the helper does not validate prose reasoning or execute tests. Even `reviewed`
does not mean the code is correct or all repository boundaries were covered.

## Queue and continuation (offline)

Input: `{ "packet": <collection>, "ranking": <optional ranking>,
"confirmations": [...], "requiredPaths": [...], "limit": 10 }`.
The batch limit defaults to ten pairs and may be 1–50. `requiredPaths` must name
collected relative paths; an omitted required artifact must be inspected manually
or recollected with an appropriate scope. Chunks containing the current contract
evidence are mandatory; ambiguous or cross-chunk quotes conservatively include
the whole evidence file. Collected `AGENTS.md`, `AGENTS.override.md` and `CLAUDE.md` files are always
mandatory. Include other known instruction files in `requiredPaths`. Mandatory pairs
precede provider priority. For a host-selected order, optional
`preferredCandidateIds` names existing candidates in preference order. With no
ranking the output explicitly says `host-only-unranked`.

The queue contains source excerpts, relevant contracts and advisory records only
for the selected batch. The full packet stays on disk. Confirmed/dismissed pairs
are excluded from subsequent batches; unresolved pairs remain eligible. Coverage
states how many pairs and mandatory pairs remain, including items outside the
current batch. Reading a queue never changes source or persists confirmations.

For example, after collecting into an ignored review directory:

```bash
node "$SKILL_DIR/scripts/change-impact.mjs" collect < request.json > packet.json
node "$SKILL_DIR/scripts/change-impact.mjs" rank --live < packet.json > ranking.json
```

Create `review.json` containing the packet, ranking, current confirmations and
known required paths. Then:

```bash
node "$SKILL_DIR/scripts/change-impact.mjs" queue < review.json > next-batch.json
node "$SKILL_DIR/scripts/change-impact.mjs" report < review.json > report.json
```

Update confirmations with actually inspected evidence before asking for the next
batch. The commands do not fabricate confirmations. Report status can remain
`incomplete` after a useful bounded pass; its coverage explains the remaining
work. Code packets should not be printed wholesale or published.

## Doctor and diagnostics

`doctor` takes no stdin and checks local runtime/credential configuration.
`doctor --live` additionally sends a fixed synthetic probe with at most three
HTTP attempts. See [setup](setup.md). Structured error codes distinguish stale
snapshots, invalid rankings, missing source evidence, missing live opt-in and
invalid inputs without printing raw input, provider bodies or credential paths.

## Sources

- [System One API](https://docs.typesafe.ai/api)
- [Models and limits](https://docs.typesafe.ai/models)
- [Confidence interpretation](https://docs.typesafe.ai/confidence)
- [Model limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13)

Checked 2026-09-22. Re-evaluate pinned model behavior and pricing before changing
the model version or publishing efficacy claims.

### Observed probability rounding

The API documentation describes probabilities summing to one. Live synthetic
qualification on 2026-09-22 returned two-decimal values summing to 0.99. The
validator permits the maximum aggregate rounding error of 0.005 per option
(0.02 for four options), retains raw values, and still rejects invalid ranges,
missing options, incompatible choices and larger discrepancies. This is an
observed provider response deviation, not a documented accuracy guarantee.
Known input/output usage is retained even if answer validation subsequently
fails; incomplete cost accounting remains explicitly marked.
