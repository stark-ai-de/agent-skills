# Synchronize agent knowledge

## Ownership and activation

One private collection serves the owner's projects. Repository documents remain
canonical and complete without Karakeep. General cross-project dossiers are owned
in Karakeep; explicit adoption into a repository creates repository-owned text.
Karakeep is an editable knowledge collection, not a raw transcript or audit log.

Use this route for an authorized sync, a session-start instruction, or meaningful
completion under an adopted project policy. Reuse standing authorization. A missing
policy produces `needs_setup`: inspect candidate paths and use the consumer ADR
process once. Do not silently enroll every repository or import whole trees.
Recommended scope is durable README/docs/ADRs/runbooks/research, with explicit
exclusions for secrets, private user data, generated files, dependencies and logs.
Keep runtime grants, credentials, hashes and receipts outside the repository.

Use the [Node helper contract](helper.md). `check` is a bounded read-only readiness
probe, not a full sync or proof of remote branch freshness. `ready` permits normal
work; `pending` leads to reconciliation at an appropriate point; `needs_setup`
requires one-time adoption; `conflict` needs evidence-based resolution; `unreachable`
leaves pending work visible and does not block repository work. Installation adds
no daemon, scheduler, CI upload job or guaranteed host hook.

## What the agent decides

Read the documents and select useful knowledge; the helper cannot infer relevance,
extract every substantive reference, assess source quality or write a synthesis.
For each selected document, enumerate **all direct substantive references** and
attest coverage against its exact content hash. Include referenced local documents
within the adopted scope. Reuse/save direct web sources, inspect the captured full
content, and label unavailable, pending or excluded references with a reason.
A saved link list is only an index: it does not preserve the articles behind it.
Do not recursively follow links beyond this direct layer without a reason/grant.
Never call a login page, excerpt or failed capture a verified original source.

Save a short factual session report directly when research, decisions or
implementation occurred under policy. Use a stable session/segment ID on retries.
Record objective, actual work, decisions, affected artifacts, observed checks and
remaining work. Use measured duration only when reliable timestamps exist. Propose
new independent findings and process evaluations before saving them as knowledge.
Do not copy raw conversations, command output or entire source trees.

Maintain one factual overview per project and already approved aggregates. New
cross-project dossiers, thematic comparisons and datasets need a scoped adoption
of identity, purpose and original-source inputs. Synthesized artifacts include
readable content plus original source/version references, not just link lists.
A summary is not evidence for another summary. No circular aggregation or feedback
loop from exporting and re-importing the same artifact. A repository may adopt a
version of a Karakeep dossier, and may also publish a repository-owned synthesis;
record ownership, lineage and the original versions in either direction.

For complex independent evidence reads, the optional [handoff recipe](handoffs.md)
keeps unique step identities and dependency results. It grants no extra writer or
upload authority and does not replace helper inspection, source hashes or receipts.

## Canonical documents and drafts

`inspect` verifies the remote identity and current default branch, pins its commit,
and reads canonical files from that Git tree. Local content is separately marked
`draft` and keyed by project, path and work context. It cannot replace the canonical
copy. Offline inspection is explicitly unverified and cannot authorize apply.

Preserve exact text and original links. The helper rejects a changed remote tip or
changed local inputs between inspection and apply; inspect/plan again. Rewritten
history needs explicit reconciliation. Removal retires provenance without deleting
the bookmark. A draft matching the canonical bytes becomes superseded. Path renames
require deliberate identity reconciliation; do not infer identity from titles or
silently delete the previous object. The helper retains the old object as retired
and creates the new path identity until that reconciliation is approved.

## Plan, apply and recover

Inspect → prepare semantic intent → plan → review the concrete operations → apply
its exact digest within the standing grant. No separate pilot project is required.
The helper paginates inventory, reuses exact functional URLs, separates managed
fields from human notes and keeps one local writer per collection. Shared sources
retain memberships from different projects. Manual title/body/provenance conflicts
remain unresolved instead of being overwritten. Unowned objects are reused without
adopting their title, notes or content. Tags and memberships are additive.

Use the verified official REST API for text-body updates where MCP lacks that field;
keep ordinary MCP reads and their existing read key. Store a separate scoped writer
credential locally. All writes are read back and recorded immediately. Creation
success and readable-content capture are distinct outcomes. Inspect private capture
files, add an assessed full-content hash, then plan again for source-backed work.

Before each dependent mutation, the helper requires current-pass complete source
reads matching every bound original input and verified reference hash. A missing,
changed or incomplete capture blocks dependent creates, updates and assignments;
independent work may continue. Earlier successful receipts do not replace these reads.

After an uncertain write, use `resume` with the recorded operation ID before a new
plan. It finds the created object by exact URL or operation provenance; ambiguous
results require resolution. Never blindly retry creation. A same-host dead lock can
be recovered explicitly; no time-based lock stealing. If inputs changed, preserve
the receipt and re-establish source/ownership before replanning. The helper never
removes a remote object. A local lock does not serialize human UI edits: the REST
API has no compare-and-swap for this workflow, so before/after checks narrow but
cannot eliminate that race. Report that limitation when resolving a conflict.

An explicitly rejected create (HTTP 400/401/403/429 at the create request) or a local
pre-dispatch refusal is recorded as failed, not applied. Correct its cause, then use
one explicit `resume` attempt or a fresh plan. A later readback 403 does not establish
that creation failed. Empty inventory after timeout likewise does not permit replay.

Complete only after readback; pending sources, conflicts and failures remain visible.
Repeated reconciliation converges without remote writes for unchanged objects.
Runtime/provider enrichment is optional native per-item functionality; it does not
replace the agent's document selection or maintained multi-source synthesis.
