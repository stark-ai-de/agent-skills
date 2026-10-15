# Template: use Karakeep for repository knowledge

This is a consumer ADR template for the [shared agent-knowledge specification](karakeep-agent-knowledge-spec.md). It is not an accepted decision of this catalog and is not installed agent instruction. Adapt its identity and representations to the consuming repository's ADR convention. Keep credentials and private endpoint configuration outside public documentation.

## Status

Proposed. Owner: `<repository maintainers>`. Acceptance: `<explicit review evidence or pending>`.

Fill in `<repository identity>`, `<approved knowledge paths>`, `<canonical branch>`, the private policy owner, the pinned/reviewed skill revision and the participating agent hosts before activation. Saving this template does not grant collection writes or enroll a repository.

## Context

Agents need reusable knowledge across the same owner's projects. Repository documentation must remain independently complete and readable when Karakeep is unavailable. A link overview does not preserve the contents of its referenced sources.

## Decision

Use the shared `karakeep-knowledge` skill as an optional knowledge projection of selected repository content. Repository documents remain authoritative. The same owner may share a collection across projects while preserving project/source attribution and access boundaries.

The adopted policy authorizes the agent, during relevant skill invocations, to reconcile approved knowledge documents and all direct substantive references, maintain canonical copies plus separately identified drafts, and save concise factual reports from substantive sessions. It also permits creating and maintaining one factual project overview and refreshing already approved aggregates within their accepted purpose and source scope. New topical dossiers, standalone findings and process evaluations are proposed before saving. Already authorized routine writes do not require per-item confirmation.

Canonical copies come from a freshly verified pinned remote canonical revision. Drafts retain branch/work-context and exact-content provenance. Document location and ADR acceptance status are separate. No draft replaces a canonical copy.

Use one private list per adopted project, reuse source objects across project lists and keep a small vocabulary for content role, lifecycle and topics. Source content remains independently captured; a link overview does not replace its sources.

General cross-project dossiers have their authoritative original in Karakeep. Projects explicitly adopt needed content into their own documentation; project-essential conclusions remain independently readable in the repository. Each aggregate has one authoritative owner and traceable original inputs. A copy keeps its origin; export/import does not create new evidence or a regeneration loop.

During relevant invocations, update affected approved aggregates when inputs changed, preserving their identities and human edits. Keep source revisions and an as-of time visible; incomplete refreshes retain the prior result with a stale/pending indication. Session reports remain separate historical records.

## Scope and authority

The private adoption policy identifies the intended account/collection, repository and approved paths, managed fields/list/tag identities, permitted content destinations, agent write capability, credential reference, designated writing host and shared private receipt/lock owner. Endpoint or credential changes do not follow from this ADR alone.

Reads remain the default outside that policy. Human edits, unowned fields and other projects' memberships are preserved. Credentials, raw transcripts, sensitive runtime data and unrelated files are excluded. Source removal marks retirement rather than deleting shared knowledge. Public sharing and destructive cleanup require separate authority.

The globally available skill is checked when an agent first works in this repository in a session and reconciles eligible changes at substantive completion/handoff. The active global agent instruction or this repository's short instruction reference supplies that behavioral trigger; installing skill files alone does not execute it. Missing project setup is resolved once, without repeating approval of routine writes. The workflow runs when the agent invokes it; this decision installs no scheduler, daemon, CI job, executable hook or n8n workflow. On outage, repository work continues and pending synchronization is reported and reconciled on a later invocation. A prompt-based workflow provides no guarantee that every session or crash is recorded.

## Consequences and alternatives

Repository completeness and shared agent retrieval are compatible, at the cost of maintaining attributable copies and visible freshness. Karakeep remains an editable knowledge system, not an immutable audit log. Lists/tags organize content but do not enforce tenant isolation.

Use the selected shared skill plus its bundled Node `scripts/knowledge.mjs` helper. The agent selects and interprets content, writes reports/syntheses and handles proposals; the helper validates policy and provenance, plans and applies supported API operations, preserves human edits and records resumable outcomes. Run it only during agent invocations, with no background service or helper-side model calls. The shared specification owns its CLI and JSON contracts.

## Adoption and verification

1. On first use, accept this repository-specific decision and resolve its placeholders, reusing existing approval; link the reviewed skill/spec from short repository guidance. This is normal adoption, not a separate pilot project.
2. Confirm a supported, appropriately scoped API write path, the globally installed Node/helper paths, the active start instruction and private policy/receipt/collection-lock location without putting secrets in Git. Verify `check` in a fresh agent session; use one manual setup invocation if automatic discovery is unavailable.
3. Verify canonical/draft separation, direct reference capture, factual session reporting, overview/approved-aggregate maintenance, new-dossier proposal gating and preservation of human edits during authorized normal use.
4. Verify a no-op repeat, outage recovery and cross-project source reuse. Other repositories adopt the same global skill as work reaches them; no initial bulk import is required.

Stop collection writes on unresolved ownership, permissions or conflicts. Disabling the adoption policy rolls back the workflow without deleting repository or collection content. New retention/deletion behavior requires an explicit lifecycle decision.
