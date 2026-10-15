---
title: "Karakeep as shared agent knowledge"
slug: "karakeep-agent-knowledge"
artifact_path: "docs/specs/karakeep-agent-knowledge-spec.md"
mode: "deep"
status: "draft"
owner: "stark-ai-de maintainers"
repo: "agent-skills"
created: "2026-10-15"
updated: "2026-10-15"
---

# Karakeep as shared agent knowledge

**Outcome:** extend the existing `karakeep-knowledge` skill so agents can reuse knowledge across an owner's projects while every repository remains independently understandable.

**Status:** confirmed usage requirements and selected skill-plus-Node-helper architecture; the implementation contract below is specified for review. This documentation does not activate collection writes, change the installed skill, accept a consumer ADR, or authorize implementation.

**Next decision:** select a pilot repository's write connection, private policy/state owner and eligible paths; the on-demand helper and its responsibility split are selected. Provider availability and cost are not open design questions for this specification.

## Goal and success

Karakeep is primarily a knowledge tool for agents. One owner can use one collection across projects; project and source attribution remain discoverable. Humans continue to read authoritative repository documentation directly, including on GitHub. A repository must remain complete and usable when Karakeep is unavailable.

An agent should be able to answer these questions with source evidence:

- What did we last work on in a particular project?
- Where did we solve a similar problem in another project?
- Which document is authoritative, and which is an unmerged draft?
- Which original sources support a comparison or conclusion?

Karakeep is an editable knowledge collection. It is not the authoritative store for raw agent execution, a complete audit trail, or proof of work duration.

## Scope and decision status

The maintainer confirmed the shared collection, repository authority, agent-invoked workflow, factual session reports, separate drafts, direct substantive source capture, project-list organization, bounded aggregation maintenance, Karakeep-owned cross-project dossiers and a bundled on-demand Node helper without a background service during the specification interview. The instruction to update the existing Karakeep pull request authorizes persistence of this specification. Recommendations below remain proposals; saving this draft does not accept them as implemented behavior.

| Area                      | Contract                                                                                                                                        | Status                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Knowledge ownership       | Repository documents remain authoritative; Karakeep holds attributable knowledge copies                                                         | Confirmed                                            |
| Execution                 | Reusable skill invoked during agent work; no required background pipeline, scheduler, CI import job, or n8n workflow                            | Confirmed                                            |
| Session knowledge         | Save short factual reports directly within an adopted policy; propose new standalone findings and process evaluations first                     | Confirmed                                            |
| Unmerged work             | Keep separately identified draft copies beside authoritative documents                                                                          | Confirmed                                            |
| Source capture            | Reuse or capture all direct substantive references in adopted documents; mark missing content; deeper traversal only on demand                  | Confirmed                                            |
| Organization              | One private project list per project, shared source objects and a small vocabulary for role, lifecycle and topics                               | Confirmed                                            |
| Aggregation maintenance   | Maintain one factual project overview and already approved aggregates during relevant invocations; propose new topical dossiers first           | Confirmed                                            |
| Derived-content ownership | Repository documents stay repository-owned; general cross-project dossiers are authoritative in Karakeep, with traceable adoption into projects | Confirmed                                            |
| Reliability               | Bundled Node helper owns deterministic planning, API reconciliation and recovery; the invoking agent owns semantic work                         | Confirmed; implementation specified, not implemented |
| Native enrichment         | Use available native per-item summaries, topic tagging, and optional semantic retrieval after capability and quality checks                     | Recommended configuration, not activated             |

Quality and useful coverage take precedence over token cost and performance optimization at the current scale. Revisit these choices after observed problems. Bounded retries, finite traversal and resumable work still prevent loops and incorrect completion claims; they must not silently discard requested content.

### Non-goals

- No new always-running service, custom Karakeep UI, database schema, scheduler, CI synchronization job, n8n workflow, or Hermes cron job.
- No automatic upload of entire repositories, secrets, raw transcripts, tool-output streams, dependencies, or generated build artifacts.
- No automatic publication, cross-owner sharing, global taxonomy migration, destructive cleanup, or replacement account/collection.
- No activation of these proposals through this specification-only change, and no unqualified claim that a prompt guarantees every session will be recorded.

## Existing implementation and extension boundary

The baseline is `karakeep-knowledge` 0.2.0 in PR #148 at commit `7944a191e85e6db2d520473e689f165dda21ef2f`. Its four routes cover setup/connection, use, repository synchronization, and curation. It already specifies remote-default-branch snapshots, ownership receipts, conflict preservation, uncertain-write reconciliation, and capability checks.

The current sync route is **main/default-branch only**. This proposal adds a distinct draft channel; it does not reinterpret dirty work as authoritative content. The current skill also does not bundle a deterministic synchronization helper or implement the session-report and aggregation contracts below. Those are future work.

Reuse the existing skill instead of introducing a second competing Karakeep skill. Preserve its setup, credential handling, recovery, and ordinary read routes. Ordinary use remains read-only unless the invocation or a standing project policy authorizes a bounded write workflow. A request to research or implement code alone grants no collection upload.

## Responsibilities

| Owner                       | Responsibility                                                                                                          | Configuration or implementation needed                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Native Karakeep             | Bookmark persistence, supported content capture and assets, lists/tags, search, available per-item inference            | Configure the existing instance; inspect actual release and effective tools |
| Agent instructions          | Select relevant knowledge, interpret sources, synthesize results, produce factual reports, propose findings/evaluations | Extend `karakeep-knowledge`; adopt it explicitly in each repository         |
| On-demand Node helper       | Stable identities, receipts, ownership checks, draft separation, idempotent writes, pending work and readback           | Implement the skill-local knowledge.mjs contract below; no daemon           |
| Repository ADR and guidance | Canonical-document ownership, eligible paths, standing workflow scope, references to shared behavior                    | Adopt a repository-specific ADR and a short instruction link                |
| External orchestration      | Scheduled refresh or multi-step unattended processing if later justified                                                | Deferred; n8n/Hermes can invoke the same contract later                     |

Native rules and webhooks are available in self-hosted Karakeep. Rules can classify or route items through supported events/actions; they do not implement repository reconciliation or maintained multi-document synthesis. No additional UI plugin is required merely to obtain these native features. A feature's existence in the product does not prove that the currently connected MCP tools can manage it.

For AI enrichment, an existing OpenAI-compatible provider such as LiteLLM is a deployment input. Do not reopen provider availability or cost research. Verify configuration and representative output when implementation is authorized. Native summaries remain per-item summaries and do not replace original content.

## Knowledge structure

Use native link, text, and supported asset bookmarks. The following roles are a convention over native objects, not invented Karakeep record types:

| Role             | Stored content                                                             | Ownership and treatment                                                        |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Original source  | Actual captured web/PDF/image content with its original address            | Reuse the same source across project lists; preserve capture and source status |
| Project document | Useful document content plus repository/path/revision provenance           | Canonical copy and drafts have distinct identities                             |
| Session report   | Brief factual account of substantive research, decisions or implementation | Session/task identity; factual outcomes and evidence only                      |
| Finding          | A reusable standalone insight with supporting sources                      | Propose before creating as a new independent artifact                          |
| Synthesis        | Comparison, overview, summary, or aggregated dataset                       | Derived content with one authoritative owner and explicit input revisions      |

Use one private project list per adopted project and a small cross-cutting vocabulary for role, lifecycle and topics. Reuse an existing matching list and existing source objects instead of creating a parallel folder hierarchy or duplicate content per project. A bookmark can belong to several lists without duplicating its contents. Topic tags may be AI suggestions; project, role and draft/canonical status must be assigned deterministically. Lists and tags organize retrieval; they are not an authorization boundary.

Examples such as `kind:session`, `kind:synthesis` or `state:draft` are proposed tag labels, not promises about search syntax. Verify the installed parser and tools before creating smart lists. A normal list is not an acceptable silent substitute for an unsupported smart list.

### Provenance and identity

Use a stable repository identity and logical relative document path, never a title or local checkout directory as the sole identity. A source key distinguishes canonical documents, branch/work-context drafts, sessions, sources and derived artifacts. A rename or repository move requires explicit identity reconciliation.

Visible provenance includes source identity, project memberships, origin URL or repository path, revision/content fingerprint, capture/update time and authority state. Store authoritative-document location separately from an ADR's decision status: an accepted ADR in an unmerged branch is still a draft copy of repository content.

Karakeep does not supply an arbitrary application-specific metadata entity for this workflow. Use supported notes/text and controlled tags/lists for visible provenance, with a private receipt for mappings, managed fields, input hashes and operation state. The receipt must contain no credentials. The helper contract below defines the JSON interface, visible provenance and private receipts; tests must establish that content and provenance survive updates without overwriting human notes.

### Canonical documents and drafts

For canonical copies, retain the existing requirement to freshly verify the remote canonical branch and read one pinned Git tree. An offline or cached view cannot silently become a newly verified canonical state.

For drafts, record the branch or work context, base revision and exact content fingerprint. Multiple branches must not overwrite one another. Dirty local work is eligible only within the explicitly adopted paths/data policy and is always labeled as a draft. The draft path may operate while remote verification is unavailable, but must report that limitation and must not promote anything to canonical.

After merge, reconcile the canonical document from the verified remote tree. Mark an equivalent draft superseded by that canonical revision; retain its provenance. Do not delete drafts or alter unrelated bookmarks as a side effect. Abandoned drafts remain visibly non-canonical until explicitly retired under the owning policy.

## Link collections and direct source capture

A text document containing links stores that document, not the target contents. An overview is useful for navigation but cannot replace the sources it lists. Native Karakeep lists are useful because their members are separately captured bookmarks.

For each eligible knowledge document, enumerate all **direct substantive references**: sources cited for a decision, comparison, technical claim or selected reference set. Ordinary website navigation, login links and unrelated boilerplate are not substantive sources. Ambiguous references remain visible for review rather than disappearing silently.

Resolve repository-relative links against the document's source revision and authorized repository scope. Resolve external relative links only when their base is known. A source document's links do not authorize credentials, new private systems, unrelated repositories or access bypasses. Record out-of-scope or inaccessible references as pending/missing with their reason.

Before creating a bookmark, paginate the relevant scope and reconcile existing functional URLs and identifiers. Preserve meaningful query parameters and fragments. Reuse equivalent sources without taking ownership of human fields. A source used by multiple projects retains all memberships and attribution.

Inspect actual captured content. Bookmark existence or a successful HTTP response does not prove that the article was captured; login pages, anti-bot responses, empty bodies and truncated results must remain visible. Saving a URL, completing a crawl and making the content searchable are separate outcomes. Read long content through supported retrieval limits so that important tail content is not silently excluded.

Do not follow the captured source's own links recursively by default. Deeper exploration is task-driven. A document with many direct references may be processed in resumable batches, but completion means every required reference has a verified capture or an explicit missing/pending/excluded result.

## Session reports

After a substantive unit of research, decision-making or implementation, the adopted skill may create or update one brief factual report for that logical session/task segment. Repeated reconciliation must not create duplicate reports. Use a host/session identifier when exposed; otherwise establish a stable local operation identifier in the receipt.

Record the objective, work actually performed, results, project/branch, relevant source or commit/PR references, checks actually run, unresolved work and next action. Capture start/end timestamps or token counts only when the host exposes measured values. Elapsed session duration is not active working time; missing measurements remain unknown.

Distinguish proposed, implemented, tested, merged, published and deployed outcomes. An agent saying that an operation happened is not a substitute for its evidence. User decisions can be reported as facts; agent-generated process ratings and new generalized insights are proposals first.

Do not upload full transcripts or every tool call. Raw history remains in the owning agent runtime/logging system. A skill cannot guarantee recording on crashes, forced shutdown or an invocation that never occurs. Report this limitation instead of presenting the collection as a complete audit log.

## Aggregations and summaries

### Standing maintenance scope

Within an adopted write policy, relevant skill invocations may create and maintain **one factual overview per project** and refresh **already approved aggregates** without per-item confirmation. Propose a new topical dossier before creating it. New independent findings and process evaluations still require a proposal first, including when they arise while maintaining an existing aggregate. Refresh authority covers the approved artifact's purpose and source scope; it does not authorize unrelated dossiers or broader access.

The project overview is a concise derived entry point in Karakeep: project goal, evidence-backed current state, confirmed decisions, open work and source references. It has a stable project identity and an explicit as-of time. Keep unmerged work visibly separate from the canonical state. Session reports retain the factual history; do not replace them with an ever-growing overview or treat a historical session result as current status without checking its sources. Project-essential documentation remains complete in the repository.

### Authority and both creation directions

Support both useful directions without running both for every item:

1. A repository agent consumes Karakeep sources and creates a repository-owned comparison or document. Its Karakeep copy follows the normal document/draft workflow.
2. An approved general, cross-project dossier is created and maintained with its authoritative original in Karakeep. No separate knowledge repository is required. A project may explicitly adopt the needed content into its own repository documentation or cite the dossier; project-essential conclusions must also be readable in that repository without Karakeep.

Each derived artifact has one authoritative owner. Record original input identities and revisions, creation/update time, synthesis purpose and whether the artifact is a generated view or an adopted document. A mirrored copy retains the original artifact identity and lineage. If a repository intentionally adopts and edits a dossier as a new document, record that adoption explicitly; its repository-owned content does not silently overwrite the Karakeep-owned dossier or transfer its ownership.

Never treat an exported copy as a new independent original, and never use an artifact or its mirrors as fresh evidence to regenerate itself. Existing syntheses can be discovery aids, but claims must remain traceable to original sources. A plain list of URLs is not a content-preserving aggregate.

For aggregated datasets, retain the useful records or a supported content representation together with a schema description, source mapping and completeness limits. Large or unsupported original files stay in their authoritative repository/artifact store; the Karakeep representation must clearly state what it contains and cannot imply a full copy. Per-record source lineage may be represented compactly where identical provenance applies to a defined group.

### Refresh and incomplete work

During relevant skill invocations or an explicit refresh, compare inputs with the last successful aggregate state and update affected approved artifacts when inputs changed. Retain their logical identities, preserve human edits and apply the same ownership/conflict checks as other writes. Repeated reconciliation must not create a new overview or dossier merely because another session ran.

Mark known outdated inputs as stale; an incomplete refresh preserves the prior result with its prior source state and reports pending work. Do not claim collection-wide freshness from checking one project's inputs. Maintain no collection-wide automatic dossier or scheduled refresh by default. Native per-source summaries remain a separate configuration proposal and never replace original content.

## Agent invocation and failure behavior

An adopted workflow checks relevant changed knowledge and pending receipts at meaningful completion/handoff points. Compare with the last successfully reconciled snapshot, not merely the last local commit. Review selected durable docs, ADRs, runbooks, useful design/research notes and their sources; do not interpret "project content" as every file.

The procedure is: inspect authority and capabilities; plan creates/reuse/updates/conflicts; reconcile sources and canonical/draft documents; record factual session work; maintain the project overview and affected approved aggregates; propose new topical dossiers and independent findings/evaluations; verify writes and report pending outcomes. These are agent-invoked actions. Repository guidance does not install a host trigger or CI job.

Preserve the baseline's three-way field ownership checks. Re-read before updates and after writes; use conditional writes only where the actual API supports them. A local lock is not a distributed transaction with other hosts or human editors. Uncertain creates must be reconciled before retrying. Multiple hosts need a qualified writer/coordination policy before overlapping automated writes can be claimed safe.

If Karakeep is unavailable, normal repository work continues. Keep a private pending receipt when possible and disclose unsaved work; resume on the next invocation. Do not mark a complete checkpoint while required items remain unresolved. Authentication/capability failures do not authorize a second account, different service, broader token or undocumented endpoint.

Source removal retires its managed provenance by default. It does not delete the shared bookmark, erase human notes or remove another project's membership. A later destructive retention or taxonomy change requires its own concrete scope and recovery plan.

## Selected implementation and alternatives

| Choice                       | Benefit                                                                | Tradeoff and disposition                                                            |
| ---------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Instructions alone           | Minimal code and adaptation to available tools                         | Not selected: mechanical identity, reconciliation and recovery belong in the helper |
| Skill plus on-demand helper  | Repeatable identity, receipts, content checks and resumable operations | Selected: bundled Node script, semantic agent instructions, no background process   |
| Native rules only            | Built-in classification and routing                                    | Insufficient for Git provenance, sessions, conflicts or multi-source synthesis      |
| n8n/Hermes orchestration now | Provides explicit unattended triggers                                  | Not requested for this phase; can later reuse the same contract                     |

The selected helper follows ADR-0014's preference for dependency-free `.mjs` using Node.js standard APIs. Preserve the existing Python setup helpers; a broad rewrite is outside scope. Do not add a second archive database, a replacement MCP protocol, a custom Karakeep record schema or a new global executable. Detect command-name collisions before assuming that a local `karakeep` command is the upstream bookmark CLI.

## On-demand helper contract

### Implementation and responsibility split

The selected implementation is a dependency-free Node.js ESM helper at `skills/engineering-workflows/karakeep-knowledge/scripts/knowledge.mjs`, shipped with the skill. Use the repository's Node baseline (`>=24.18.0`) and built-in modules; there is no TypeScript compilation, runtime package installation, global CLI, daemon, watcher or scheduler. The agent executes the installed script through its host's terminal/command tool because `SKILL.md` instructs it to do so. A Markdown skill cannot execute a process by itself or guarantee invocation after every session.

| Responsibility          | Helper                                                                                                                                 | Skill instructions and agent                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Select knowledge        | Enumerate allowed Git documents, hashes, existing mappings and known pending work                                                      | Decide usefulness, read the content and identify every direct substantive reference; classify exclusions and uncertain captures              |
| Preserve source state   | Read one verified canonical Git tree or a separately identified draft snapshot; enforce allowed paths, identities and authority labels | Decide whether proposed work belongs in a canonical document, draft, factual session report, finding or aggregate                            |
| Prepare derived content | Validate supplied content, provenance, source versions and approved purpose; detect changed inputs and known lineage cycles            | Write session reports, project overviews and syntheses; distinguish facts from interpretations and propose new dossiers/findings/evaluations |
| Reconcile storage       | Paginate inventory, deduplicate, compute creates/reuse/updates/conflicts, preserve human fields, apply supported writes and read back  | Review the resulting plan against the user's scope; resolve semantic conflicts or request only genuinely missing authority                   |
| Recover and report      | Persist operation receipts, uncertain writes, missing captures and checkpoints; resume deterministically                               | Interpret incomplete results, inspect content quality, prepare revised material when needed and report the next action                       |

The helper makes no model calls and does not launch another agent. Native per-item inference remains Karakeep configuration; semantic synthesis uses the invoking agent. Mechanical checks can establish successful storage, input hashes and supported capture status, but cannot prove that an article was faithfully captured or a conclusion is correct. Agent assessments include the inspected content version and evidence; a guessed Boolean is not capture proof.

### CLI and invocation

The following is the specified future interface; the script is not implemented by this documentation change. Resolve `kk_helper` to the absolute `scripts/knowledge.mjs` path of the installed, reviewed skill. `kk_policy` is the approved private policy, `kk_repo` the native repository root, and `kk_run` a private operation directory under the policy's state root. These are task-specific variables, not new environment-wide settings. Commands never depend on the caller's working directory.

```bash
node "$kk_helper" inspect --repo "$kk_repo" --policy "$kk_policy" --out "$kk_run/inspection.json"
# The agent reads the sources and writes intent.json plus any derived text files.
node "$kk_helper" plan --inspection "$kk_run/inspection.json" --intent "$kk_run/intent.json" --policy "$kk_policy" --out "$kk_run/plan.json"
node "$kk_helper" apply --plan "$kk_run/plan.json" --policy "$kk_policy" --expect-plan "<plan-sha256>"
node "$kk_helper" status --policy "$kk_policy"
node "$kk_helper" resume --operation "<operation-id>" --policy "$kk_policy"
```

| Command   | Contract and side effects                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inspect` | Validate policy/connection/runtime, inventory eligible source snapshots and Karakeep objects, and expose pending work and changed aggregate inputs. Read-only against Karakeep and repository files/index; a canonical inspection may fetch Git objects through the existing authenticated route without checkout/merge/index changes. Writes only its explicitly selected private inspection/snapshot files. `--offline` produces a clearly unverified local inspection and cannot qualify canonical writes. |
| `plan`    | Validate the agent's intent, original-source relationships and standing authority; read current remote fields and produce a deterministic, reviewable operation plan. Writes private plan/payload files only. No implicit apply.                                                                                                                                                                                                                                                                              |
| `apply`   | Require an explicit plan and its digest; recheck current policy, source evidence, account, capabilities, managed-field baselines and writer lock. Apply only eligible planned operations, record partial results, read back and exit. `--expect-plan` binds the operation to exact bytes; it is not a substitute for authorization and does not require another user prompt for already approved writes.                                                                                                      |
| `status`  | Read local receipts and report completed, pending, conflicted and uncertain work. No network or mutation by default; `--online` may perform diagnostic reads. This complements, rather than replaces, the existing Python setup probe.                                                                                                                                                                                                                                                                        |
| `resume`  | Reload one recorded operation, revalidate policy/inputs and inspect uncertain server outcomes before continuing permitted work. Reuse operation/item identities; never regenerate semantic text or blindly repeat a create. Stale plans return `needs_replan`.                                                                                                                                                                                                                                                |

`--help` and `--version` are offline and side-effect free. Use explicit JSON contracts: one result object on stdout and bounded, redacted diagnostics on stderr, without progress text mixed into JSON. Results include `schemaVersion`, `operationId`, `status`, planned/applied/unchanged/conflicted/pending/failed counts, item reason codes, the receipt reference and next action. Exit `0` means the requested command completed (a plan may still contain blocked items); exit `2` means apply/resume remains partial or needs agent/user resolution; exit `1` means invalid input or a fatal configuration/capability/transport failure. The agent must inspect item statuses, not infer synchronization success from a planning exit code.

For an approved collection-only dossier, omit `--repo` and use a collection-scoped policy. That inspection performs no Git operations and cannot authorize repository document/draft writes. Project workflows require the explicit repository root and its matching grant.

### Policy, input and stored representation

Use versioned JSON with explicit validation of required fields, enums, path containment and size bounds; reject unknown security-relevant fields and unsupported versions. No generic shell-command or arbitrary HTTP-request field is accepted.

| Artifact            | Required contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private policy      | Stable policy ID/revision; repository identity, verified remote and canonical branch for project scopes, or an explicit collection-only scope; eligible paths/exclusions and content kinds; intended service/account; authorized operations and managed fields/list/tag IDs; approval evidence for dossiers; supported API profile; credential reference; state root, designated writer and bounded retry settings. The helper consumes this existing grant and never approves, creates or broadens it itself. |
| `inspection.json`   | Schema/inspection ID, policy digest, repository/source channels and pinned revisions, content fingerprints, relevant bookmark/list/tag inventory, account/capability evidence, known pending operations and aggregates whose input hashes changed. Captured content and snapshots remain in the private operation directory.                                                                                                                                                                                   |
| Agent `intent.json` | Schema/inspection ID; selected item/source keys; kind and authority; desired content reference; project relationships; all direct substantive references and explicit missing/excluded reasons; original aggregate input IDs/versions; purpose and any required approval reference. Repository documents reference helper-captured source bytes; derived/session text uses a contained UTF-8 file whose hash is verified.                                                                                      |
| `plan.json`         | Stable operation ID; policy/inspection digests; exact payload hashes; ordered create/reuse/update/no-op/conflict/pending/retired operations with before/after managed fields, reasons, source identities and dependencies. Planning records out-of-scope proposals without turning them into eligible writes.                                                                                                                                                                                                  |
| Private receipts    | Format version; source-key to bookmark mapping; canonical/draft identities; last verified managed fields and input hashes; approved aggregate lineage; attempted versus fully reconciled revisions; operation states and missing/uncertain outcomes. No credentials.                                                                                                                                                                                                                                           |

Derive source keys from versioned JSON tuples hashed with SHA-256, so delimiters in URLs or paths cannot collide. Canonical documents use stable repository ID plus logical path; drafts additionally use their persistent branch/work-context ID. External sources use the full functional URL, preserving meaningful query/fragment components. Session keys use a stable host/session/segment ID (or a receipt-owned UUID when unavailable); project overviews use the project ID, and dossiers retain a UUID allocated once at proposal/adoption. Renames and intentionally adopted copies require explicit identity reconciliation rather than title matching.

For new helper-owned text items, preserve the document body verbatim and place provenance in the supported `note` field, in a visibly labeled `Karakeep knowledge provenance` section containing a fenced JSON object. Include `schemaVersion`, stable source key, kind, authoritative owner, source/channel/revision, content hash and as-of time; derived objects also list original input identities/versions. Keep human note text outside the managed section and preserve it. Duplicate or manually changed managed sections are conflicts. For reused human-owned sources, retain provenance in the private mapping and the owning documents instead of claiming their notes. A metadata marker alone is not ownership or authorization proof.

The agent identifies substantive links by reading the entire eligible document, including reference-style/relative links. The helper validates supplied URL/path resolution and records coverage; it does not claim semantic completeness from a URL regex. Each direct reference must reach a verified, missing, pending or explicitly excluded outcome. Native Karakeep captures external content; the helper does not add a browser, replacement crawler or recursive web spider.

Create/reconcile original sources first. An aggregate may cite only source versions actually inspected by the agent; missing sources can be explicit gaps, never supporting evidence. When captures finish after the original preparation, return `needs_agent` for dependent synthesis so the agent reads those sources and supplies revised content. No helper-side LLM callback runs after the CLI exits.

### API, runtime and credential boundary

Use the official Karakeep REST API for the helper's deterministic reads/writes, with an explicitly authorized connection to the same intended account. Keep ordinary agent search/content retrieval on the existing official MCP connection. The Node process cannot directly call tools exposed only inside its parent agent's MCP session. No new MCP server or client-runtime replacement is required.

The current source baseline supports bookmark creation and partial updates through `/api/v1/bookmarks` and `/api/v1/bookmarks/{id}`. Text creates use `type: "text"` plus `text`; text-body updates use the verified `text` field, not an invented generic `content` parameter. Follow response cursors for inventory, request content where needed and qualify list/tag/asset operations against the actual service. Keep the HTTP adapter isolated and validate responses. A missing write capability leaves that operation pending; no database writes, browser-login bypass or delete/recreate fallback is permitted.

Use built-in `fetch` with an overall abort deadline, bounded response reading, serial mutation and no implicit authenticated redirects. Only the configured service origin receives the bearer key. Read existing private credentials through their owner: either the current literal `KARAKEEP_API_ADDR`/`KARAKEEP_API_KEY` file format or explicitly configured environment variable names. Implement compatible literal parsing without shell evaluation and exercise the existing parser's valid/invalid fixtures. Never put secret values in CLI arguments, JSON intents, receipts or logs, or automatically repurpose a read-only key as a write key. Account verification must use a qualified identity read or approved account-bound sentinel; an empty bookmark list alone proves no account identity.

Initially qualify execution on Linux/NixOS/WSL with the existing native Node and Git. Keep `.mjs` code portable, but do not claim native Windows file-secret support until equivalent private-access checks are qualified. Match the existing setup's loopback HTTP(S) boundary for the first local pilot; support for a hosted/private remote endpoint requires the separate connection contract and must not weaken the current Python launcher. Use `node:child_process.execFile` with argument arrays for Git; do not evaluate a shell string, change branches, stage files or modify repository documents. Read canonical bytes from one freshly verified remote tree; keep local drafts in a separate snapshot with branch/work context and hashes. A remote tip advancing during the run does not mix trees; report the later revision as subsequent work. Divergence or stale/unverifiable authority blocks canonical writes.

### State, concurrency and recovery

Keep operation files and receipts in a private, host-owned state directory, conventionally below `$XDG_STATE_HOME/karakeep/knowledge` (the normal XDG fallback applies). Group shared source mappings and the writer lock by service/account, then project and operation records below that identity. Do not store mutable state in the installed skill, Git or a second archive database. On POSIX use private directories/files and safe no-follow file handling; reject path escapes and credential/state symlinks.

The first qualified implementation uses one designated writing host and one shared local state root per collection. All agent processes on that host acquire the same exclusive collection lock before any remote mutation. Other hosts may read/prepare work but cannot apply independently with unrelated receipts. Do not introduce a lock server, background coordinator or automatic cross-host takeover. A hosted writer is selected only after the consumer's connection/coordination contract is qualified.

Persist an intent before each mutation and a verified receipt after readback using atomic same-directory replacement and flushes where supported. A crash can leave an operation uncertain: resume reconciles source identity, the embedded creation marker and current server fields before deciding whether anything should be retried. Ambiguous matches remain conflicts. Release a lock only when its ownership is established; a leftover lock is reported for explicit recovery after verifying the previous process stopped, never stolen merely because time elapsed.

The lock coordinates helper processes, not human edits or other clients. Preserve the existing three-way field checks, re-read immediately before updates, use server preconditions only if actually supported and read back afterward. Without server compare-and-swap there remains a race with unrelated writers; the helper must not claim atomic multi-client safety. Pending crawl/index work uses a bounded in-process check and then persists for a later invocation, with no timer or process surviving exit. Required failures keep the full-sync checkpoint pending while verified individual successes remain reusable.

### Modules and verification

Keep one public CLI with small internal modules; these are future implementation locations:

| Path relative to the installed skill | Responsibility                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `scripts/knowledge.mjs`              | CLI dispatch, argument validation and structured results                                     |
| `scripts/knowledge/git.mjs`          | Pinned canonical snapshots, allowed-path checks, drafts and content hashes                   |
| `scripts/knowledge/karakeep.mjs`     | Official API adapter, credential loading, pagination, response/capture checks                |
| `scripts/knowledge/reconcile.mjs`    | Identities, lineage, change planning, managed-field conflicts and apply/resume state machine |
| `scripts/knowledge/state.mjs`        | Policy/intent/receipt validation, private files, shared mappings and local writer lock       |

Update the existing sync/curation instructions and add one focused helper reference during implementation; ordinary use and the Python setup/recovery tools retain their roles. Build the agent's normal sequence as inspect, source reading/intent preparation, plan review, apply/readback, and factual reporting; re-enter semantic preparation when the helper reports missing content or changed inputs. The agent reuses standing grants rather than asking for approval of every plan.

Add Node built-in tests at `skill-evals/karakeep-knowledge/helper.test.mjs`: snapshot/allowlist isolation; canonical versus multiple drafts; source reuse across projects; exact-body/metadata preservation; changed input or stale plan rejection; manual edits; no-op repeat; interrupted create/resume; lock contention; a read-only/incorrect account; missing capture and delayed content; proposal-only new dossiers; and source lineage/cycle rejection. Test CLI behavior against a synthetic local HTTP service, never personal data. Prove that inspect/plan make no remote writes, unsupported/out-of-scope input sends no mutation, secrets are redacted and installing the skill starts no process. Retain the existing Python setup tests; they do not substitute for these new cases.

Run `node --test skill-evals/karakeep-knowledge/helper.test.mjs` plus the owning script/skill/projection checks after implementation. Qualify one authorized real pilot, a no-op repeat and outage recovery separately. Neither this design nor mocked API tests establish deployed connectivity, complete source capture or native enrichment quality.

## Architectural decisions

No new catalog-wide ADR is needed for this scoped extension. Existing publication/admission rules remain unchanged. The relevant catalog decisions are:

- [ADR-0014](../adrs/0014-prefer-node-skill-helper-scripts.short.md) ([Long, canonical](../adrs/0014-prefer-node-skill-helper-scripts.long.md) · [Guide](../adrs/0014-prefer-node-skill-helper-scripts.guide.md)): helper choice.
- [ADR-0029](../adrs/0029-keep-linked-worktrees-inside-the-repository.short.md) ([Long, canonical](../adrs/0029-keep-linked-worktrees-inside-the-repository.long.md) · [Guide](../adrs/0029-keep-linked-worktrees-inside-the-repository.guide.md)): isolated writes.
- [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)): validation.
- [ADR-0060](../adrs/0060-allow-intent-bound-workflow-disclosure.short.md) ([Long, canonical](../adrs/0060-allow-intent-bound-workflow-disclosure.long.md) · [Guide](../adrs/0060-allow-intent-bound-workflow-disclosure.guide.md)): intent-bound workflows.

Consumer adoption changes a repository's knowledge ownership and agent-write policy, so it needs a repository-specific decision. Use the [adoption ADR template](karakeep-project-adoption-adr-template.md), adapted to that repository's ADR conventions. The template itself is not an accepted ADR and grants no writes. Product/service consumers additionally own their access, lifecycle and reachability contract; never copy private consumer configuration into this public spec.

Implementation is blocked only where an unresolved proposal or unaccepted consumer decision governs that slice. Specification persistence does not accept any such decision.

## Source challenge

Repository evidence: the baseline skill and its `references/sync.md`, `curation.md`, `use.md`, `mcp.md` and `operations.md`; `docs/specs.md`; the ADRs above; and `package.json`. The baseline's public payload already exists on the PR, although older local checkouts can still show only an incubator candidate.

| Primary source                                                                                                                                                                                    | Design consequence                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [Advanced workflows](https://docs.karakeep.app/using-karakeep/advanced-workflows/) and [v0.33.2 rule types](https://github.com/karakeep-app/karakeep/blob/v0.33.2/packages/shared/types/rules.ts) | Native rules/webhooks exist; they do not supply the proposed knowledge workflow or multi-document synthesis            |
| [Lists](https://docs.karakeep.app/using-karakeep/lists/) and [bookmarking](https://docs.karakeep.app/using-karakeep/bookmarking/)                                                                 | Lists organize independent bookmarks; a link collection does not capture targets                                       |
| [MCP integration](https://docs.karakeep.app/integrations/mcp/) and [v0.33.2 bookmark types](https://github.com/karakeep-app/karakeep/blob/v0.33.2/packages/shared/types/bookmarks.ts)             | Upstream feature support, actual MCP schemas, API scopes and native object types must be distinguished                 |
| [Configuration](https://docs.karakeep.app/configuration/environment-variables/)                                                                                                                   | Inference and embedding context limits can truncate long sources; enabling a feature is not full-content quality proof |
| [Official agentic skills](https://docs.karakeep.app/integrations/agentic-skills/) and [CLI](https://docs.karakeep.app/integrations/command-line/)                                                 | Reuse supported interfaces; installed command identity still needs checking                                            |
| [Hermes sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions)                                                                                                                 | Native session history owns detailed execution; available measurements require runtime verification                    |

The helper design additionally checks the [official partial-update API](https://docs.karakeep.app/api/update-bookmark/) against the pinned bookmark schema, [Node child-process APIs](https://nodejs.org/api/child_process.html) for direct Git execution, and [Node 24 filesystem APIs](https://nodejs.org/docs/latest-v24.x/api/fs.html) for private receipts and local locking. These sources support the implementation primitives; they do not qualify the actual service connection.

The checked v0.33.2 MCP baseline does not expose text-body updates or smart-list creation through every corresponding operation. An authorized official API may support more, but its schema and write authority must be verified. A read-only connection must remain read-only. No live collection mutation, provider configuration, restart, restore or integration qualification was performed for this documentation change.

## File and module plan

| Phase                     | Owning locations                                                                            | Boundary                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| This documentation change | This spec, adoption template, `docs/specs/README.md`                                        | Planning only; existing skill behavior remains unchanged                          |
| Future skill extension    | `skills/engineering-workflows/karakeep-knowledge/`                                          | Concise route changes plus references for drafts, sources, sessions and synthesis |
| Future helper/evaluations | Skill-local `scripts/knowledge.mjs` and internal modules; `skill-evals/karakeep-knowledge/` | Deterministic operations, Node tests and existing setup coverage                  |
| Future generated package  | `plugins/stark-ai-developer/` through `pnpm run sync:agent-plugin`                          | Never edit generated skill copies by hand                                         |
| Consumer adoption         | Consumer ADR, short instruction link and private endpoint/policy/receipts                   | No blanket modifications to all repositories                                      |

## Acceptance criteria and validation

The future implementation must demonstrate these cases with synthetic fixtures and then an authorized pilot:

| Case                                                                | Observable result                                                                                                                 |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Shared source used by two projects                                  | One source bookmark, both project relationships preserved                                                                         |
| Canonical document plus two unmerged branches                       | Canonical content unchanged; two distinguishable drafts with exact provenance                                                     |
| Merged draft and repeated reconciliation                            | Canonical update from verified remote revision; draft marked superseded; no duplicate writes                                      |
| Reference document with existing, new and inaccessible direct links | Existing sources reused, reachable content inspected, missing content explicit, no recursive crawl                                |
| Substantive session repeated or resumed                             | One attributable factual report per logical segment; no invented metrics or automatic process rating                              |
| Human edit, timeout or missing write capability                     | Human content preserved; uncertain writes reconciled; unsupported actions reported pending                                        |
| Karakeep outage                                                     | Repository work remains usable; pending work is visible and later resumable                                                       |
| Repo-origin and collection-origin synthesis                         | Original-source lineage survives both directions; mirrors do not form feedback loops                                              |
| First adopted invocation and unchanged repeat                       | One factual project overview with source state; repeat reuses its identity and preserves session reports                          |
| Changed source of an approved aggregate                             | The same artifact is refreshed within its accepted scope, or visibly stale/pending; human edits survive                           |
| New topical dossier, independent finding or process evaluation      | Proposal only until approved; an existing aggregate is not used to bypass that boundary                                           |
| General dossier adopted by a project                                | Original remains authoritative in Karakeep; adopted project content is independently readable and authoritative in its repository |
| Aggregated dataset with incomplete inputs                           | Useful records, schema, source mapping and coverage limits are retained; a URL list alone is insufficient                         |
| Long source with relevant content near its end                      | Full retrieval or explicit truncation; summaries and retrieval do not imply untested coverage                                     |
| No adopted write policy                                             | Ordinary reads remain read-only; no enrollment, upload or background task                                                         |

For this documentation-only change, validate formatting of the changed Markdown, relative links, source/ADR references, absence of private data and the scoped diff. Use `git diff --check`, `pnpm run validate:adrs` for the ADR references, and the repository-pinned Oxfmt executable with `--check` on the changed files. Hosted PR CI remains separate.

For future runtime changes, select owning checks: `node --test skill-evals/karakeep-knowledge/helper.test.mjs`, `pnpm run validate:scripts`, `pnpm run validate:karakeep`, `pnpm run validate:skills`, and `pnpm run validate:projections` after generated changes, plus behavioral evaluations for the cases above. Run `pnpm run validate:adrs` when catalog ADR artifacts or references to them change. Existing setup tests do not prove the new knowledge workflows. Full release/aggregate gates apply according to ADR-0041; this spec does not introduce a release.

## Rollout, rollback and risks

Start with one explicitly adopted repository and a small representative set containing a canonical doc, draft, reference collection, factual session report and synthesis. Inventory existing bookmarks before import. Review the planned reuse/update/conflict operations, perform one authorized pilot write, read it back, and verify an unchanged repeat before broader adoption.

If adoption fails, disable that project's write policy and preserve repository documentation and collection data. Keep pending receipts for diagnosis; do not delete bookmarks or reverse unrelated human edits. Existing saved knowledge stays readable. Destructive rollback would require its own reviewed preservation plan.

Material risks are stale copies, incomplete capture, conflicting writers, duplicate identities and misleading derived conclusions. The provenance, readback, missing-content, conflict and lineage requirements above address them. Full-text indexing, semantic retrieval and native inference remain separate quality checks. Actual unattended behavior cannot be inferred from skill installation.

## Open choices and done-when

1. Adopt the first repository's eligible paths and standing write scope; select its supported write connection, designated host/private state owner and concrete project-list/tag identifiers. The helper consumes that policy without granting itself authority.
2. Qualify native enrichment and source retrieval on representative long and short content; exact models are deployment configuration.
3. For a hosted agent consumer, separately select reachability, credential ownership, writer coordination and service lifecycle. One owner's shared collection does not grant access across tenants.

Specification delivery is complete when the agreed requirements and explicit proposals are saved, linked, reviewed for provenance/privacy and included in the requested PR update. Implementation completion additionally requires the selected proposals/ADRs, meaningful acceptance evidence, an authorized pilot and distinct runtime/publication evidence.

## Codex execution handoff

After a separate implementation instruction, read this spec, the existing `karakeep-knowledge` routes and repository ADRs. Resolve only the open choices governing the requested slice. Extend the existing skill with the specified `scripts/knowledge.mjs` interface and internal modules; preserve main-only canonical proof while adding an explicitly separate draft path. Keep semantic selection/reporting/synthesis in the invoking agent, with no helper-side model call or unattended trigger. Implement no scheduler, CI import, custom database, blanket uploads or live service changes outside that instruction. Add meaningful fixtures for identity, conflicts, reference capture, session facts, overview/approved-aggregate maintenance, dossier proposal gates, source lineage and outage recovery. Generate package projections through repository scripts, run the owning checks and report implementation, local checks, hosted CI and live qualification separately.
