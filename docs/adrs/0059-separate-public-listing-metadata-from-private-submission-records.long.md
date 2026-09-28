# ADR-0059: Separate public listing metadata from private submission records

ID: ADR-0059
Title: Separate public listing metadata from private submission records
Status: Accepted
Date: 2026-09-28
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: public-artifacts, openai, privacy, release, issues
Applies when: Publishing the OpenAI listing, building its release archives, or creating a release handoff.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-28
Gist: Keep public OpenAI listing and release handoff data public while private account and portal submission records stay in the maintainer workflow.

Variants: [Short](0059-separate-public-listing-metadata-from-private-submission-records.short.md) · **Long, canonical** · [Guide](0059-separate-public-listing-metadata-from-private-submission-records.guide.md)

## Decision

Repository-tracked OpenAI listing sources, documentation, generated artifacts, and release evidence contain only reviewed public product and developer metadata, public URLs, assets, and non-identifying verification results. Publisher-account identifiers, verification-specific personal identity records, authenticated portal URLs, submission identifiers, and private portal observations remain in the maintainer’s private portal workflow and must not be required by public archive generation or CI. The public handoff for a verified release that changes the installable OpenAI plugin is an automatically generated, idempotent GitHub issue containing only release-bound public information and a manual submission checklist. Maintainers perform OpenAI submission and publication manually and close the issue when complete. No completed submission worksheet is tracked or required. Existing shared listing identity, adapter ownership, protected release publication, and post-release verification remain governed by ADR-0043, ADR-0044, and ADR-0050.

## Why

- Public repositories, package archives, release evidence, and CI need enough information to reproduce and review the product without exposing account-bound portal records.
- A completed worksheet mixes public listing data with private submission state and becomes stale when portal state changes.
- A release-bound issue gives maintainers a durable, visible handoff while keeping authenticated portal work outside the public artifact contract.

## Options

- Chosen: derive public listing and release data from canonical sources, create one idempotent issue after a successful plugin release, and keep portal actions manual.
- Rejected: track a completed worksheet containing account, identity, submission, or authenticated portal fields in the repository.
- Rejected: make package builds, CI, or public release evidence depend on private portal records.
- Rejected: automate portal submission or issue closure; those actions require maintainer review and remain outside the public release contract.

## Consequences

- Good: public archives and release records are safe to publish, reproducible without credentials, and explicit about the remaining manual portal work.
- Tradeoff: maintainers must complete and close a release issue after checking post-release evidence, the archive hash, listing assets, and public installation behavior.
- Risk: portal state can change after issue creation; the checklist therefore records the GitHub release fact and requires a fresh manual verification before upload.

## Follow-up

- The release workflow creates the issue only after successful publication and release-PR lifecycle labeling, reuses the existing GitHub App token, and checks all issue pages for the hidden release marker before writing.
- `release:openai-issue plan|apply` provides an explicit retry path for a concrete published release and refuses invalid or private metadata.
- New reproducibility evidence uses schema version 2 without worksheet paths or hashes. Historical evidence remains unchanged.
