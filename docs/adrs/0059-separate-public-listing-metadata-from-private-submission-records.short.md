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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-28
Gist: Keep public OpenAI listing and release handoff data public while private account and portal submission records stay in the maintainer workflow.

Variants: **Short** · [Long, canonical](0059-separate-public-listing-metadata-from-private-submission-records.long.md) · [Guide](0059-separate-public-listing-metadata-from-private-submission-records.guide.md)

## Decision

Repository-tracked OpenAI listing sources, documentation, generated artifacts, and release evidence contain only reviewed public product and developer metadata, public URLs, assets, and non-identifying verification results. Publisher-account identifiers, verification-specific personal identity records, authenticated portal URLs, submission identifiers, and private portal observations remain in the maintainer’s private portal workflow and must not be required by public archive generation or CI. The public handoff for a verified release that changes the installable OpenAI plugin is an automatically generated, idempotent GitHub issue containing only release-bound public information and a manual submission checklist. Maintainers perform OpenAI submission and publication manually and close the issue when complete. No completed submission worksheet is tracked or required. Existing shared listing identity, adapter ownership, protected release publication, and post-release verification remain governed by ADR-0043, ADR-0044, and ADR-0050.

## Context

The public listing contract needs a reproducible release handoff, while authenticated portal records belong to the maintainer performing the submission. This decision defines that boundary without changing the shared identity, adapter, or protected release decisions.

## Consequences

- Good: public artifacts can be built and reviewed without private portal data.
- Tradeoff: portal submission and final issue closure remain manual.
- Risk: the portal may change after issue creation, so maintainers must perform the checklist against the exact published archive.
