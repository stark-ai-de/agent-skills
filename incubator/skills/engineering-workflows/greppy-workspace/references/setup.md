# Guided setup and adoption

1. Establish OS, shell, repository roots, executable paths (`type -a`), package ownership and service manager before changes. Respect Nix or another declarative owner. Capture Git status without changing the index. Resolve an assigned isolated skill worktree under repository rules.
2. Inspect versions and help of `grepai`, `codegraph`, `ast-grep`, `codex`, Docker/Compose and Ollama. Inspect existing watchers and locks. Never stop a process from a fuzzy name match; stop only an adopted service or a process whose ownership is established.
3. Reuse suitable local embedding and storage services. Check Ollama `/api/tags` and `/api/embed`, model identity, returned vector length, and Qdrant collection vector size/distance. A model/dimension change requires an explicit index migration. Bind new Qdrant REST/gRPC ports to loopback, disable telemetry and use a persistent private volume. Pin the approved image digest. Do not recreate an existing Karakeep account or stack.
4. Create a private operations root and private state/config directories (0700, files 0600). Copy and resolve `assets/workspace.example.json`; all example values are placeholders, not adoption. Record authorization in `approval`. Keep the operations root outside `roots` or in `excludePaths` (also excluded intrinsically). Put the canonical skill path in the integration; do not copy a second independent implementation to the operations directory.
5. Discovery uses actual `git rev-parse --show-toplevel`, `.git` directories/files, common Git directories and superproject metadata. It inventories linked worktrees but excludes them by default. Nested Git roots are independently named by stable IDs and excluded from parent indexing. A moved unique repository retains its ID using remote/root-commit identity; ambiguous moves require explicit registry reconciliation. Same-basename roots have distinct names. The original remote contributes only to a legacy identity hash; the registry stores a sanitized origin without user info, query or fragment, plus the selected branch. Local/unsupported remote schemes are omitted. Canonical symlink aliases are deduplicated; out-of-scope targets are not admitted. Missing top-level discovery roots fail closed instead of retiring everything.
6. Review preview results and use `selectedPaths` for the pilot. Setup merges the owned workspace into the existing global workspace file; unrelated workspaces survive. It adds generated `.grepai/config.yaml` per root and generated directory exclusions to `.git/info/exclude`. It does not run `grepai init`, edit tracked `.gitignore`, pull repositories or write AGENTS/CLAUDE files. Existing provider/store differences require a migration decision. Backups are content-addressed under `stateRoot/backups` with adjacent original-path receipts.
7. Configure the supplied systemd templates using actual absolute paths and existing managers. Adopt, back up and reconcile only named units. `setup --apply` reconciles an existing owned watcher, but does not install packages, create services or grant Karakeep write scope by itself. Those are explicit guided setup steps. A second setup should find identical membership/config and retain the watcher PID.

## grepai 1.1 compatibility

The qualified global configuration is `~/.grepai/workspace.yaml`, a map of workspaces with `projects: [{name, path}]`. Multi-project workspaces require Qdrant or Postgres; GOB is not a supported workspace backend. Some official skill examples still describe per-workspace directories/GOB. Verify against `grepai workspace --help` and source matching the installed build before executing them.

Workspace watching loads ignore and watch settings from each project's `.grepai/config.yaml`; adding only a global workspace ignore list does not enforce them. The helper uses supported gitignore-style patterns in the project configuration, disables automatic linked-worktree admission, excludes nested roots, generated indices, dependency/build/cache directories and common secret filenames. Both `vendor` and the observed capitalized `Vendor` directory are excluded. Existing `.grepaiignore` negations are refused because upstream gives them precedence over configured exclusions. Resolve that conflict explicitly, not by silently weakening secret exclusions.

Existing symlinks are excluded during reconciliation. grepai 1.1 can follow a newly created file symlink before the next reconcile: filename exclusions are not a general secret scanner. Keep secrets outside indexed source trees and do not introduce links to private files. Validate the actual indexed payloads in isolated fixtures, including `.env`, key files, dependencies and a link to a private target. Local indices contain source text and require private storage.

## Recovery

Stop only the owned timers and watcher before restoring a config backup. Restore the affected file atomically, then reconcile and restart the owned service. Do not restore unrelated user configuration wholesale. Retired vector namespaces are removed by exact workspace/project prefix, with bounded Qdrant scrolling. If purge fails, the watcher remains stopped. Resolve the storage failure and rerun with the same adopted configuration. The private reconcile-pending.json receipt keeps the pending exclusions and the prior watcher state until successful recovery. Never rebuild or delete another collection as a shortcut.

## Exclusion-scan cost

A changed reconciliation checks every stored point before removing hard-excluded
paths. The helper computes repository nesting and compiles ignore patterns once
per scan, while rechecking filesystem symlinks for every point. It does not cache
a previously safe path. Regression cases cover namespace/nesting boundaries,
glob semantics and paths changed into symlinks between checks. Measure the whole
collection on the actual host; a predicate-only sample is not an end-to-end
performance claim. The bounded scroll must complete before any deletion begins;
reaching its page limit is a failure, not permission to purge a partial result.

## Initial indexing and readiness

The qualified grepai workspace watcher initializes projects sequentially and enters its common event loop after their initial scans. CPU-only local embeddings can take substantial time on large trees. Existing chunks are searchable during warmup, but service `active` is not proof of live event-loop readiness. Doctor checks the current systemd invocation for the `Watching N projects for changes` marker and reports incomplete warmup. An `Embedding 100%` or `Initial scan complete` message can still be followed by `Checking symbol index...`; that later work may leave the vector count flat. Inspect the latest journal step and process activity before diagnosing a stall. `priorityPaths` can put small important repositories first without changing membership. Do not claim complete freshness before that gate. The helper purges already indexed hard-excluded paths during a changed reconciliation so they cannot remain searchable until a long scan finishes.

At the qualified v1.1.0 revision, [saving each symbol file](https://github.com/yoanbernabeu/grepai/blob/dd38459f31a8b25e49b886511a15667caf43478b/trace/store.go#L223) traverses the accumulated symbols, references and call edges, including for a previously unindexed file. The [initial symbol loop](https://github.com/yoanbernabeu/grepai/blob/dd38459f31a8b25e49b886511a15667caf43478b/cli/watch.go#L888) persists after all files and prints no per-file progress. This source-reviewed work can become expensive on large trees. Record this CPU stage separately from embedding latency; its duration alone does not establish that local inference is unusable. Process activity and code inspection do not replace a runtime profile or the completed readiness gate. Recheck newer builds before carrying this version-specific explanation forward.

The same revision calls [`ListDocuments` for every project initial scan](https://github.com/yoanbernabeu/grepai/blob/dd38459f31a8b25e49b886511a15667caf43478b/indexer/indexer.go#L118). The [Qdrant implementation](https://github.com/yoanbernabeu/grepai/blob/dd38459f31a8b25e49b886511a15667caf43478b/store/qdrant.go#L411) scrolls file-path payloads from the whole shared collection; the [project wrapper](https://github.com/yoanbernabeu/grepai/blob/dd38459f31a8b25e49b886511a15667caf43478b/cli/watch.go#L3277) filters the resulting paths afterward. This work also occurs with existing embeddings. A `file_path` keyword index helps exact filtered lookups but does not make this unfiltered collection scroll project-local. Measure the complete restart-to-watchloop interval; embedding cache hits alone cannot predict it. This is confirmed source behavior, not a profiled runtime attribution.

A briefly flat file or point counter alone does not prove a stalled index. Check
current-invocation errors, subsequent point growth and actual inference activity
before changing a running service. Successful HTTP 200 collection-info requests
are normal status polling, not indexing errors. The inspected Qdrant adapter
creates a `content_hash` keyword index for embedding-cache lookups; inspect the
actual `payload_schema` before proposing an additional index.

## Confirmed migration and configuration traps

The model identity lives under the global `index-meta/<workspace>/<project>.json`,
independent of the collection name. Preserve those files with the old workspace
and registry for rollback. Let grepai write the new identity after an actual
successful initial scan; never rewrite a metadata file merely to silence a
model mismatch. Until every selected project's identity matches, an unscoped
search can correctly refuse the workspace. Diagnose with doctor metadata counts
and its captured search error. `grepai status --workspace` is not supported in
the qualified 1.1.0 CLI; use this doctor and the current watcher invocation.

The Go loader requires RFC3339 `watch.last_index_time` values. PyYAML's default
timestamp constructor can turn them into datetime objects and later dump a
space instead of `T`. The helper now preserves timestamp scalars and repairs
that confirmed legacy serialization bug without changing their time value.
An active watcher may skip a project with invalid configuration: readiness must
match the full registered project count, not merely find any watchloop marker.

For Qdrant, opt into `qdrant.filePathIndex: true` after inspecting the collection.
The installed grepai creates a `content_hash` keyword index but performs frequent
exact `file_path` filters without creating that field index. The helper adds the
missing keyword index idempotently once the selected collection exists; it
refuses to replace an existing differently typed index. This changes derived
index structures, not stored source or vector identity. A measured local pilot
showed faster exact-file lookups; measure the actual host instead of assuming a
fixed speedup. [Qdrant payload indexing](https://qdrant.tech/documentation/manage-data/indexing/)
was checked on 2026-10-28.

During a model rebuild, `grepai search --workspace NAME --project READY_PROJECT
--json -n 5 QUERY` can scope a diagnostic search to projects whose metadata and
source samples match. Repeat `--project` for multiple ready roots. This proves
only that selected subset; it does not complete the workspace acceptance gate.

Inspect the actual scanner's supported extensions before admitting a large corpus.
The qualified 1.1.0 scanner omits common suffixes such as `.mjs`, `.cjs` and `.nix`.
The optional `customExtensions` array in the adopted config is normalized and
merged additively into each project's supported `chunking.custom_extensions`;
existing project extensions are preserved. Choose only relevant text-source
suffixes from the inventory. Ordinary ignore, binary/minified and 1 MiB limits
still apply. This expands semantic text indexing, not CodeGraph or grepai trace
parser language support. Qualify actual payloads for the added suffixes. Do not
change a model-comparison corpus between candidates; apply corpus expansion
only after the fixed pilot comparison, then recheck coverage and search.

## Framework compiler availability and repair

Inspect framework warnings even when indexing continues. Doctor reports bounded
current-invocation events separately from watchloop readiness; an unreadable
journal is unverified, not a clean result. In the inspected 1.1.0
Vue processor, missing `@vue/compiler-sfc` falls back to script blocks and style
bindings; compiled template relationships are then absent. The processor caches
that failure until it is recreated. Installing a dependency alone does not repair
already stored embeddings or symbol caches.

Resolve compiler dependencies from the actual watcher process context. The
inspected workspace indexer passes relative source paths; its Node helper searches
file ancestors and the process working directory. A compiler installed only in
the reference repository may therefore remain invisible. Verify the exact helper,
Node path, working directory and both relative/absolute source inputs. Prefer an
existing compatible compiler; if missing, install a pinned private runtime with a
lockfile and disabled install scripts, without changing reference application
manifests. Expose it through an owned module path supported by the actual resolver.
Do not overwrite an existing `node_modules` directory or assume a global install
will be found. Qualify real template compilation and source-line mappings.

For the observed missing-compiler case, finish the running initial scan before a
controlled repair. Under the adopted writer lock, pause owned timers, wait for
owned jobs, and stop only the owned watcher. Acquire the installed indexer's
project writer and symbol-store locks in its documented order before touching
derived state; preserve those lock-file inodes and release the locks before
restarting the watcher. Back up exact affected vector points
including vectors/payloads and the affected generated symbol cache. Verify paths,
current source hashes and the selected collection before removing only those
backed-up derived entries. Preserve lock files, source and model metadata. In the
inspected indexer, a document with no chunks is rescanned despite its old mtime;
unchanged populated documents otherwise skip transformation. Recreate the watcher,
restore previously active timers, then require fresh complete watchloop evidence,
current chunk/source-line checks and no unresolved compiler warning. A prepared
repair or direct compiler probe is not production reindex evidence. Check the
installed CLI help; do not invent `watch --full`, `--project` or `--once` flags.

Source inspection and direct processor qualification were performed on 2026-10-28
against the installed grepai revision. Host-specific repair completion belongs in
the private adoption report, not in a universal support claim.

## Confirmed Vue source-line limitation

The inspected 1.1.0 pipeline can persist generated template line numbers outside
the original Vue file, even with the compiler installed and no warning. An
isolated live index reproduced a result at lines 31–50 of a 25-line source file.
The direct Node helper alone did not reveal the complete pipeline behavior:
additional Go-side processing changes its output. Require actual stored and
returned source-line checks, not only a successful compiler probe.

For this affected build, the qualified workaround is explicit
`"vueProcessing": false` in the adopted configuration. The helper maps it to
`framework_processing.frameworks.vue.enabled: false` in each project's config,
preserving other framework settings. Omit the option to preserve an existing
choice; its value must be a boolean. The mode indexes original Vue source,
including template text. An actual semantic query and original-line readback
passed in the isolated fixture. It does not qualify compiled-template trace
relationships; report that upstream limitation explicitly. Keep the compiler
probe as historical evidence, not a claim that this enhanced mode is usable.

Changing transformation mode also requires controlled regeneration of every
already stored Vue file in the adopted collection, plus the generated symbol
caches of their projects. Preview actual stored paths, preserve source/model
identity, back up exact points/configs/caches, hold the existing writer/store
locks and restart only the owned watcher. Newly discovered repositories receive
the same explicit choice. A config-only update leaves unchanged old chunks
cached. Re-enable processing only after an upstream fix passes real source-line
and relationship qualification; do not patch around invalid lines by clamping
or fabricate source mappings.

The [upstream framework contract](https://yoanbernabeu.github.io/grepai/contributing/)
requires original source paths and 1-based mappings. The live defect and qualified
raw-source workaround were verified on 2026-10-28; private receipts retain the
exact installed revision and source hashes.
