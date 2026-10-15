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

**Status:** confirmed usage requirements, with an implementation proposal for review. This documentation does not activate collection writes, change the installed skill, accept a consumer ADR, or authorize implementation.

**Next decision:** review the proposed deterministic helper and select a pilot repository's write capability and adoption policy. Provider availability and cost are not open design questions for this specification.

## Goal and success

Karakeep is primarily a knowledge tool for agents. One owner can use one collection across projects; project and source attribution remain discoverable. Humans continue to read authoritative repository documentation directly, including on GitHub. A repository must remain complete and usable when Karakeep is unavailable.

An agent should be able to answer these questions with source evidence:

- What did we last work on in a particular project?
- Where did we solve a similar problem in another project?
- Which document is authoritative, and which is an unmerged draft?
- Which original sources support a comparison or conclusion?

Karakeep is an editable knowledge collection. It is not the authoritative store for raw agent execution, a complete audit trail, or proof of work duration.

## Scope and decision status

The maintainer confirmed the shared collection, repository authority, agent-invoked workflow, factual session reports, separate drafts, and direct substantive source capture during the specification interview. The instruction to update the existing Karakeep pull request authorizes persistence of this specification. Recommendations below remain proposals; saving this draft does not accept them as implemented behavior.

| Area                | Contract                                                                                                                       | Status                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Knowledge ownership | Repository documents remain authoritative; Karakeep holds attributable knowledge copies                                        | Confirmed                                       |
| Execution           | Reusable skill invoked during agent work; no required background pipeline, scheduler, CI import job, or n8n workflow           | Confirmed                                       |
| Session knowledge   | Save short factual reports directly within an adopted policy; propose new standalone findings and process evaluations first    | Confirmed                                       |
| Unmerged work       | Keep separately identified draft copies beside authoritative documents                                                         | Confirmed                                       |
| Source capture      | Reuse or capture all direct substantive references in adopted documents; mark missing content; deeper traversal only on demand | Confirmed                                       |
| Aggregations        | Support repository-origin and collection-origin artifacts with one owner and traceable inputs                                  | Recommended design                              |
| Reliability         | Add a small on-demand deterministic helper alongside semantic agent instructions                                               | Recommended; implementation choice remains open |
| Native enrichment   | Use available native per-item summaries, topic tagging, and optional semantic retrieval after capability and quality checks    | Recommended configuration, not activated        |

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
| Proposed on-demand helper   | Stable identities, receipts, ownership checks, draft separation, idempotent writes, pending work and readback           | Small dependency-light helper if selected; no daemon                        |
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

Prefer one private project list per recurring project scope and a small cross-cutting vocabulary for role, lifecycle and topics. A bookmark can belong to several lists without duplicating its contents. Topic tags may be AI suggestions; project, role and draft/canonical status must be assigned deterministically. Lists and tags organize retrieval; they are not an authorization boundary.

Examples such as `kind:session`, `kind:synthesis` or `state:draft` are proposed tag labels, not promises about search syntax. Verify the installed parser and tools before creating smart lists. A normal list is not an acceptable silent substitute for an unsupported smart list.

### Provenance and identity

Use a stable repository identity and logical relative document path, never a title or local checkout directory as the sole identity. A source key distinguishes canonical documents, branch/work-context drafts, sessions, sources and derived artifacts. A rename or repository move requires explicit identity reconciliation.

Visible provenance includes source identity, project memberships, origin URL or repository path, revision/content fingerprint, capture/update time and authority state. Store authoritative-document location separately from an ADR's decision status: an accepted ADR in an unmerged branch is still a draft copy of repository content.

Karakeep does not supply an arbitrary application-specific metadata entity for this workflow. Use supported notes/text and controlled tags/lists for visible provenance, with a private receipt for mappings, managed fields, input hashes and operation state. The receipt must contain no credentials. Exact encoding and helper interface are implementation decisions; tests must establish that content and provenance survive updates without overwriting human notes.

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

Support both useful directions without running both for every item:

1. A repository agent consumes Karakeep sources and creates a repository-owned comparison or document. Its Karakeep copy follows the normal document/draft workflow.
2. An agent creates a collection-owned synthesis from several saved sources. A repository may intentionally adopt a version or cite it; project-essential conclusions must also be readable in the repository.

Choose one authoritative owner for each derived artifact. Record original input identities and revisions, creation/update time, synthesis purpose and whether the artifact is a generated view or an adopted document. A mirrored copy retains the original artifact identity and lineage. If a repository intentionally adopts and edits a synthesis as a new document, record that adoption explicitly.

Never treat an exported copy as a new independent original, and never use an artifact or its mirrors as fresh evidence to regenerate itself. Existing syntheses can be discovery aids, but claims must remain traceable to original sources. A plain list of URLs is not a content-preserving aggregate.

For aggregated datasets, retain the useful records or a supported content representation together with a schema description, source mapping and completeness limits. Large or unsupported original files stay in their authoritative repository/artifact store; the Karakeep representation must clearly state what it contains and cannot imply a full copy. Per-record source lineage may be represented compactly where identical provenance applies to a defined group.

Refresh an aggregate during an agent task or explicit refresh when its inputs changed. Mark known outdated inputs as stale; an incomplete refresh preserves the prior result and reports pending work. Maintain no collection-wide automatic dossier or scheduled refresh by default. Native per-source summaries may run on ingestion independently of task-specific multi-source synthesis.

## Agent invocation and failure behavior

An adopted workflow checks relevant changed knowledge and pending receipts at meaningful completion/handoff points. Compare with the last successfully reconciled snapshot, not merely the last local commit. Review selected durable docs, ADRs, runbooks, useful design/research notes and their sources; do not interpret "project content" as every file.

The procedure is: inspect authority and capabilities; plan creates/reuse/updates/conflicts; reconcile sources and canonical/draft documents; record factual session work; propose independent findings/evaluations; verify writes and report pending outcomes. These are agent-invoked actions. Repository guidance does not install a host trigger or CI job.

Preserve the baseline's three-way field ownership checks. Re-read before updates and after writes; use conditional writes only where the actual API supports them. A local lock is not a distributed transaction with other hosts or human editors. Uncertain creates must be reconciled before retrying. Multiple hosts need a qualified writer/coordination policy before overlapping automated writes can be claimed safe.

If Karakeep is unavailable, normal repository work continues. Keep a private pending receipt when possible and disclose unsaved work; resume on the next invocation. Do not mark a complete checkpoint while required items remain unresolved. Authentication/capability failures do not authorize a second account, different service, broader token or undocumented endpoint.

Source removal retires its managed provenance by default. It does not delete the shared bookmark, erase human notes or remove another project's membership. A later destructive retention or taxonomy change requires its own concrete scope and recovery plan.

## Alternatives and proposed implementation

| Choice                       | Benefit                                                                | Tradeoff and disposition                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Instructions alone           | Minimal code and immediate adaptation to available tools               | Identity, reconciliation and recovery rely on repeated agent execution; viable pilot, no deterministic guarantee |
| Skill plus on-demand helper  | Repeatable identity, receipts, content checks and resumable operations | Additional maintained code; recommended for reliable cross-project writes, still awaiting selection              |
| Native rules only            | Built-in classification and routing                                    | Insufficient for Git provenance, sessions, conflicts or multi-source synthesis                                   |
| n8n/Hermes orchestration now | Provides explicit unattended triggers                                  | Not requested for this phase; can later reuse the same contract                                                  |

If a helper is selected, follow ADR-0014's preference for dependency-free `.mjs` when standard APIs suffice. Preserve the existing Python setup helpers; a broad rewrite is outside scope. Do not add a second archive database, a replacement MCP protocol, a custom Karakeep record schema or a new global executable. Detect command-name collisions before assuming that a local `karakeep` command is the upstream bookmark CLI.

## Architectural decisions

No new catalog-wide ADR is needed for this scoped extension. Existing ADRs [0014](../adrs/0014-prefer-node-skill-helper-scripts.long.md), [0029](../adrs/0029-keep-linked-worktrees-inside-the-repository.long.md), [0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) and [0060](../adrs/0060-allow-intent-bound-workflow-disclosure.long.md) govern helper choice, isolated writes, validation and intent-bound workflows. Existing publication/admission rules remain unchanged.

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

The checked v0.33.2 MCP baseline does not expose text-body updates or smart-list creation through every corresponding operation. An authorized official API may support more, but its schema and write authority must be verified. A read-only connection must remain read-only. No live collection mutation, provider configuration, restart, restore or integration qualification was performed for this documentation change.

## File and module plan

| Phase                     | Owning locations                                                          | Boundary                                                                          |
| ------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| This documentation change | This spec, adoption template, `docs/specs/README.md`                      | Planning only; existing skill behavior remains unchanged                          |
| Future skill extension    | `skills/engineering-workflows/karakeep-knowledge/`                        | Concise route changes plus references for drafts, sources, sessions and synthesis |
| Future helper/evaluations | Skill-local `scripts/` if selected; `skill-evals/karakeep-knowledge/`     | Deterministic operations and meaningful behavioral fixtures                       |
| Future generated package  | `plugins/stark-ai-developer/` through `pnpm run sync:agent-plugin`        | Never edit generated skill copies by hand                                         |
| Consumer adoption         | Consumer ADR, short instruction link and private endpoint/policy/receipts | No blanket modifications to all repositories                                      |

## Acceptance criteria and validation

The future implementation must demonstrate these cases with synthetic fixtures and then an authorized pilot:

| Case                                                                | Observable result                                                                                    |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Shared source used by two projects                                  | One source bookmark, both project relationships preserved                                            |
| Canonical document plus two unmerged branches                       | Canonical content unchanged; two distinguishable drafts with exact provenance                        |
| Merged draft and repeated reconciliation                            | Canonical update from verified remote revision; draft marked superseded; no duplicate writes         |
| Reference document with existing, new and inaccessible direct links | Existing sources reused, reachable content inspected, missing content explicit, no recursive crawl   |
| Substantive session repeated or resumed                             | One attributable factual report per logical segment; no invented metrics or automatic process rating |
| Human edit, timeout or missing write capability                     | Human content preserved; uncertain writes reconciled; unsupported actions reported pending           |
| Karakeep outage                                                     | Repository work remains usable; pending work is visible and later resumable                          |
| Repo-origin and collection-origin synthesis                         | Original-source lineage survives both directions; mirrors do not form feedback loops                 |
| Long source with relevant content near its end                      | Full retrieval or explicit truncation; summaries and retrieval do not imply untested coverage        |
| No adopted write policy                                             | Ordinary reads remain read-only; no enrollment, upload or background task                            |

For this documentation-only change, validate formatting of the changed Markdown, relative links, source/ADR references, absence of private data and the scoped diff. Use `git diff --check` and the repository-pinned Oxfmt executable with `--check` on the changed files. Hosted PR CI remains separate.

For future runtime changes, select owning checks: `pnpm run validate:karakeep`, `pnpm run validate:skills`, and `pnpm run validate:projections` after generated changes, plus behavioral evaluations for the cases above. Run `pnpm run validate:adrs` only when actual catalog ADR artifacts change. Existing setup tests do not prove the new knowledge workflows. Full release/aggregate gates apply according to ADR-0041; this spec does not introduce a release.

## Rollout, rollback and risks

Start with one explicitly adopted repository and a small representative set containing a canonical doc, draft, reference collection, factual session report and synthesis. Inventory existing bookmarks before import. Review the planned reuse/update/conflict operations, perform one authorized pilot write, read it back, and verify an unchanged repeat before broader adoption.

If adoption fails, disable that project's write policy and preserve repository documentation and collection data. Keep pending receipts for diagnosis; do not delete bookmarks or reverse unrelated human edits. Existing saved knowledge stays readable. Destructive rollback would require its own reviewed preservation plan.

Material risks are stale copies, incomplete capture, conflicting writers, duplicate identities and misleading derived conclusions. The provenance, readback, missing-content, conflict and lineage requirements above address them. Full-text indexing, semantic retrieval and native inference remain separate quality checks. Actual unattended behavior cannot be inferred from skill installation.

## Open choices and done-when

1. Select instructions-only for an initial pilot or the recommended on-demand helper; define its narrow interface before coding.
2. Adopt the first repository's eligible paths, taxonomy and standing write scope, with a real supported write connection.
3. Qualify native enrichment and source retrieval on representative long and short content; exact models are deployment configuration.
4. For a hosted agent consumer, separately select reachability, credential ownership and service lifecycle. One owner's shared collection does not grant access across tenants.

Specification delivery is complete when the agreed requirements and explicit proposals are saved, linked, reviewed for provenance/privacy and included in the requested PR update. Implementation completion additionally requires the selected proposals/ADRs, meaningful acceptance evidence, an authorized pilot and distinct runtime/publication evidence.

## Codex execution handoff

After a separate implementation instruction, read this spec, the existing `karakeep-knowledge` routes and repository ADRs. Resolve only the open choices governing the requested slice. Extend the existing skill; preserve main-only canonical proof while adding an explicitly separate draft path. Implement no scheduler, CI import, custom database, blanket uploads or live service changes outside that instruction. Add meaningful fixtures for identity, conflicts, reference capture, session facts, lineage and outage recovery. Generate package projections through repository scripts, run the owning checks and report implementation, local checks, hosted CI and live qualification separately.
