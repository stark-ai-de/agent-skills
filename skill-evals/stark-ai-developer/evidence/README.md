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

`release-subject.json` is the versioned metadata contract for the published
`openai.zip` and `portable.zip` subjects. Validate it with
`npm run validate:release-subject-file -- --directory <subject-directory>`.
The schema binds status, source revision, release/plugin versions, archive
profile, subject digests, byte sizes, and differences. Historical tags may
produce legacy evidence internally, but the current release action normalizes
that evidence into this JSON contract. Standalone skill archives are a
separate projection and may retain their own checksum file.
