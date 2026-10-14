# Synchronize repository knowledge

## Authority and eligible source

Use this route when asked to sync a repository, or when a relevant invocation finds
an already-approved policy for that repository and collection. Without such a policy,
inspect and propose a concrete diff; ask once before first writes. Reuse the grant on
later runs. A request to implement code, read bookmarks or install the skill grants
no collection sync. Never turn every code edit into a repository upload.

Record a private policy through the host's existing configuration owner:

- Intended endpoint/account, repository identity and verified remote URL.
- Allowed source paths and types, exclusion patterns, data classification and whether
  local source text may be sent to Karakeep and the agent provider. Default to selected
  durable docs, ADRs, runbooks and reference URLs; exclude secrets, user data, generated
  output, dependencies, binaries and transient logs. Keep private provenance outside Git.
- Source branch: verified remote default branch, normally `main`; another protected
  canonical branch only when explicitly selected. Branch names alone prove no trust.
- Mode (`preview` or approved `apply`), allowed fields and operations, managed list/tag
  IDs and ownership mapping, maximum items/bytes/writes per run, trigger and retry limits.
- Private receipt/state path, one-writer lock and policy revision. No credentials in it.

Default writes are additive saves and updates to demonstrably skill-owned fields.
Destructive cleanup, changed account/repository/branch, expanded paths, new sensitive
content types or publishing/sharing require a new scoped grant. A denied operation
stays pending; it must not be hidden in the next batch. Ask for grouped concrete
exceptions rather than confirmation for each harmless operation already authorized.

## Main-only snapshot

1. Verify the intended remote and its current default branch using the host's Git
   provider or remote metadata. Fetch that branch through the existing authenticated
   route; record its exact commit OID. A stale local `main`, local commit, PR head,
   uncommitted file or a claim that a PR merged is insufficient. Offline preview may
   describe a cached snapshot explicitly; automatic apply requires fresh remote proof.
2. Read allowed paths from the pinned Git tree, never the working directory. Local
   dirty/unmerged work can coexist but must not leak into the collection. Compare
   only this tree with the last successfully reconciled commit for the same identity.
3. On initial enrollment, inventory all allowed sources and compare the collection;
   do not assume everything is new. On subsequent runs, use rename-aware Git diffs
   and content hashes. Unchanged files may still require reconciliation after a
   policy change, known remote conflict or previous failed/pending operation.
4. If the old source commit is not an ancestor of the new tip, fail closed: show the
   force-push/divergence and request reconciliation approval. If the tip advances
   during a run, finish the pinned snapshot and report that the next run has work;
   never mix revisions. Ignore out-of-scope changes with no collection writes.

Merged does not mean every artifact is worth saving. Capture durable useful knowledge
and relevant references, rather than raw code, every commit or duplicated full trees.
Store exact provenance and a content digest for managed text; a repository overview
can link to the canonical source instead of copying all implementation files.

## Plan, deduplicate and preserve edits

Use a stable source key of repository identity plus logical source path/item identity,
not a title or local checkout path. Store its mapping to bookmark ID, source revision,
representation, last applied managed-field values/digests and successful operations
in the private receipt. Track renames deliberately; never overwrite a similarly titled
entry. Separate link identity from text-snapshot identity.

Paginate the relevant collection scope; search snippets alone do not establish absence.
For links, compare exact functional URLs and inspect candidates: `url:` search is a
substring filter, not a unique key. Preserve query parameters/anchors unless a verified
normalization policy says otherwise. Reuse an existing equivalent bookmark without
claiming its notes, title, tags or membership as owned. No automatic adoption of user
content. Deduplication across repositories should retain each repository's memberships
and provenance; shared content cannot be deleted when one source drops it.

Build a plan of create/update/reuse/unchanged/conflict/retired items with before/after
fields, reason and source OID. Apply a three-way check for each owned field: previous
applied value, current Karakeep value, desired source value. If current differs from
previous and desired, preserve it and ask how to resolve the conflict. If ownership
is unknown, ask before adoption. Re-read before writing and use conditional writes
when the supported API provides them. A local lock prevents these jobs overlapping;
it is not a distributed transaction with human editors. Without server-side compare
and swap, report that race limitation and verify immediately after the write.

## Supported writes and resumable completion

Discover actual callable tools and schemas. Use official `create-bookmark`,
`update-bookmark`, list membership and tagging only for fields that release exposes.
The checked v0.33.2 MCP source can create text bookmarks, but `update-bookmark` does
**not** expose their text-body field. Do not invent a `content` update argument.
If a supported official API exposes that operation and its write path is already
authorized, verify its schema and use it. Otherwise present the capability gap: keep
the old item, or offer an explicitly approved new revision linked to the old one.
Do not silently create a growing duplicate history or delete/recreate the bookmark.
Updating a link's metadata also does not prove its crawled body was refreshed.

For source removal, keep the bookmark by default and report it retired in the receipt.
Do not automatically delete, globally archive, remove human tags or break another
repository's list. A standing grant may remove a demonstrably job-owned membership;
source deletion alone grants none of these changes.

Take one pilot operation before the approved batch. Keep writes serial or within the
service's observed capacity; read back changed fields and memberships. Record each
verified success and uncertain outcome immediately, with IDs and input digests.
After timeouts, inspect the server before retrying creates; do not retry blindly.
Retain failures/pending captures as a retry queue. Advance the fully reconciled source
checkpoint only when all intended operations are verified or explicitly resolved;
otherwise record the attempted OID and partial successes separately. The same snapshot
on the next run must converge without duplicate writes.

Saved URLs can change independently of main. Recrawl only on an authorized freshness
policy, through a verified supported mechanism; never recrawl all links on every sync.
Capture/index success remains separate from bookmark creation and metadata updates.

## Automatic execution boundary

Prefer a host-native post-merge/default-branch trigger or a modest existing scheduled
job when requested. The trigger is a wake-up: fetch and re-verify the branch in the run.
Keep credentials in the owning host, not in a public workflow or saved page. This
skill provides the agent procedure, not a bundled scheduler or deterministic importer.
Persisting a policy enables subsequent authorized invocations; it does not guarantee
the host activates this skill. Verify actual discovery, trigger and a no-op repeat
before claiming automation. Report changes/conflicts/failures; stay quiet on unchanged
background runs unless the user requested status messages.
