# Template: use Karakeep for repository knowledge

This is a consumer ADR template for the [shared agent-knowledge specification](karakeep-agent-knowledge-spec.md). It is not an accepted decision of this catalog and is not installed agent instruction. Adapt its identity and representations to the consuming repository's ADR convention. Keep credentials and private endpoint configuration outside public documentation.

## Status

Proposed. Owner: `<repository maintainers>`. Acceptance: `<explicit review evidence or pending>`.

Fill in `<repository identity>`, `<approved knowledge paths>`, `<canonical branch>`, the private policy owner, the pinned/reviewed skill revision and the participating agent hosts before activation. Saving this template does not grant collection writes or enroll a repository.

## Context

Agents need reusable knowledge across the same owner's projects. Repository documentation must remain independently complete and readable when Karakeep is unavailable. A link overview does not preserve the contents of its referenced sources.

## Decision

Use the shared `karakeep-knowledge` skill as an optional knowledge projection of selected repository content. Repository documents remain authoritative. The same owner may share a collection across projects while preserving project/source attribution and access boundaries.

The adopted policy authorizes the agent, during relevant skill invocations, to reconcile approved knowledge documents and all direct substantive references, maintain canonical copies plus separately identified drafts, and save concise factual reports from substantive sessions. New standalone findings and process evaluations are proposed before saving. Already authorized routine writes do not require per-item confirmation.

Canonical copies come from a freshly verified pinned remote canonical revision. Drafts retain branch/work-context and exact-content provenance. Document location and ADR acceptance status are separate. No draft replaces a canonical copy.

Each aggregate or synthesis has one authoritative owner and traceable original inputs. A copy keeps its origin; export/import does not create new evidence or a regeneration loop. Project-essential conclusions remain documented in the repository.

## Scope and authority

The private adoption policy identifies the intended account/collection, repository and approved paths, managed fields/list/tag identities, permitted content destinations, agent write capability and receipt owner. Endpoint or credential changes do not follow from this ADR alone.

Reads remain the default outside that policy. Human edits, unowned fields and other projects' memberships are preserved. Credentials, raw transcripts, sensitive runtime data and unrelated files are excluded. Source removal marks retirement rather than deleting shared knowledge. Public sharing and destructive cleanup require separate authority.

The workflow runs when the agent invokes it; this decision installs no scheduler, daemon, CI job, hook or n8n workflow. On outage, repository work continues and pending synchronization is reported and reconciled on a later invocation. A prompt-based workflow provides no guarantee that every session or crash is recorded.

## Consequences and alternatives

Repository completeness and shared agent retrieval are compatible, at the cost of maintaining attributable copies and visible freshness. Karakeep remains an editable knowledge system, not an immutable audit log. Lists/tags organize content but do not enforce tenant isolation.

Instructions alone are a lower-code option. A shared on-demand helper improves repeatability of identity, receipts and conflict handling but adds maintained code. Record the selected implementation approach separately; this template does not silently select it.

## Adoption and verification

1. Accept this repository-specific decision and resolve its placeholders; link the reviewed skill/spec from short repository guidance.
2. Confirm a supported, appropriately scoped write path and the private policy/receipt location without putting secrets in Git.
3. Pilot canonical/draft separation, direct reference capture, factual session reporting and preservation of human edits.
4. Verify a no-op repeat, outage recovery and cross-project source reuse before expanding the selected paths.

Stop collection writes on unresolved ownership, permissions or conflicts. Disabling the adoption policy rolls back the workflow without deleting repository or collection content. New retention/deletion behavior requires an explicit lifecycle decision.
