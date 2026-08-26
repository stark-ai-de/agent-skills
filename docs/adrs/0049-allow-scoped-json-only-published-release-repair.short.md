# ADR-0049: Allow scoped JSON-only published release repair

ID: ADR-0049
Title: Allow scoped JSON-only published release repair
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, artifacts, attestations, evidence
Applies when: A mutable published catalog release is missing exact validated release metadata or an installable ZIP.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Repair exact release metadata without inventing ZIP provenance while keeping ZIP repair attestation-gated.

Variants: **Short** · [Long, canonical](0049-allow-scoped-json-only-published-release-repair.long.md) · [Guide](0049-allow-scoped-json-only-published-release-repair.guide.md)

## Decision

Published repair will distinguish installable ZIP subjects from their metadata document. A mutable release missing only the exact fully validated `release-subject.json` may add that JSON without an existing Publish Release ZIP attestation. The no-attestation repair is complete only when both ZIP assets are provably earlier than publication and the JSON asset is provably later than publication. Equal, missing, or invalid timestamps are ambiguous and block. A repair containing either ZIP still requires the existing valid Publish Release attestation, and an attestation observation error always blocks.

JSON-only repair creates no ZIP and no attestation. Every permitted repair explicitly dispatches fresh post-release evidence from protected `main`. Successful post-release evidence and the later OpenAI handoff continue to require their own exact-tag provenance checks, so unavailable ZIP attestations can still block those later boundaries.

## Context

Metadata-only recovery does not replace installable bytes, but it must not
silently weaken the stronger provenance requirement for ZIP repair. A complete
asset set alone cannot prove which files were added after publication.

## Consequences

- JSON metadata can be restored without manufacturing ZIP provenance.
- ZIP recovery retains its existing attestation prerequisite.
- Unknown or equal timestamps remain fail-closed.
- Later evidence and third-party handoff may remain blocked after repair.
