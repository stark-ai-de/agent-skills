# Sanitized evidence policy

The plugin inventory is the durable evidence artifact for repository-local
review. No account transcript, customer content, private path, token, cookie,
internal hostname, or private reviewer message belongs here.

Current evidence is structural and fixture-based:

- bundle membership and listing mappings are checked against repository sources;
- routing and skills-only exclusions are checked by validators;
- portable, OpenAI, and standalone projection bytes are compared;
- local marketplace paths are tested in disposable temporary clones;
- live ChatGPT/Codex product behavior, account availability, and workspace
  policy remain explicit external observations.

Portal identifiers and directory observations live in
[`docs/listing/openai/stark-ai-developer-first-publication.md`](../../../docs/listing/openai/stark-ai-developer-first-publication.md).

Telegram Serverless has separate [offline behavioral comparisons and promotion evidence](../../telegram-serverless/runs/2026-10-08-offline-promotion.md). Those text/artifact trials complement this structural inventory; they do not establish hosted CHAT/CODEX discovery or live Telegram behavior.

## Post-release receipts

The post-release workflows upload sanitized, machine-readable receipts as
workflow artifacts. Validate them against
[`post-release-receipt.schema.json`](post-release-receipt.schema.json) with
`npm run validate:post-release-receipt -- --file <receipt.json>`.

Receipts distinguish `pass`, `blocked`, `not_run`, `retrospective`, and
`not_applicable`. `pre_release_archive` records the attested subjects before
publication; `post_release_archive` records tag-bound verification after
publication. They bind repository evidence to a release tag, source commit,
archive digest, attestation status, client/surface, tests, counts, lifecycle
operations, and reasons. They must not contain API keys, cookies, session data,
private endpoints, raw prompts or transcripts, or unnecessary personal data.
Reason, blocker, lifecycle-reason, and command-family fields use short
machine-readable codes rather than free text.

Schema v1 keeps common client and lifecycle fields across receipt types.
Archive receipts use `not_a_client_lifecycle_receipt`.

Focused receipt and release-sequencing fixtures live in
[`scripts/validation/test-post-release-receipt.mjs`](../../../scripts/validation/test-post-release-receipt.mjs).
They combine executable receipt, contract-copy, exact-tag, legacy-tag,
published-asset tamper, missing-asset, and cleanup fixtures
with source-contract assertions for workflow event and permission boundaries.
They do not simulate GitHub-hosted release events or replace live product
evidence.

The receipt schema and
[`manual-client-lifecycle-receipt.template.json`](manual-client-lifecycle-receipt.template.json)
live here. Fill receipts from [`docs/publishing.md`](../../../docs/publishing.md)
Operator follow-up.

## Release subjects

Tags `v0.21.0` through `v0.31.0` use the historical single-listing contract:
`openai.zip`, `portable.zip`, and a schema-v1 `release-subject.json`.
`v0.20.1` is the earlier two-asset boundary and has no release-subject asset.
Historical tag names and their original contracts remain unchanged.

Starting with `v0.32.0`, each stable release carries both existing OpenAI
listings as separate subjects: `openai-skills-only.zip` for **stark AI
Developer**, `openai-tools.zip` for **stark AI Developer Tools**, and
`portable.zip`, plus a schema-v2 `release-subject.json`. The subject binds each
archive's name, SHA-256 digest, byte size, profile identity, and release source.
All three ZIPs are attested. Post-release receipts record all three published
archive digests and sizes and their matching attestation subjects. The two
OpenAI listings use separate profile-specific handoffs; `portable.zip` is not
uploaded to either listing.

Validate release subjects with
`npm run validate:release-subject-file -- --directory <subject-directory>`.
Historical tags may produce legacy evidence internally, but the current
release action normalizes that evidence into the versioned JSON contract.
Standalone skill archives are a separate projection and may retain their own
checksum file.
