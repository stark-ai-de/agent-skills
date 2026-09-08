# ADR-0052: Allow scoped JSON-only published release repair

ID: ADR-0052
Title: Allow scoped JSON-only published release repair
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, artifacts, attestations, evidence
Applies when: A mutable published catalog release is missing exact validated release metadata or an installable ZIP.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Repair exact release metadata without inventing ZIP provenance while keeping ZIP repair attestation-gated.

Variants: [Short](0052-allow-scoped-json-only-published-release-repair.short.md) · **Long, canonical** · [Guide](0052-allow-scoped-json-only-published-release-repair.guide.md)

## Decision

Published repair will distinguish installable ZIP subjects from their metadata document. A mutable release missing only the exact fully validated `release-subject.json` may add that JSON without an existing Publish Release ZIP attestation. The no-attestation repair is complete only when both ZIP assets are provably earlier than publication and the JSON asset is provably later than publication. Equal, missing, or invalid timestamps are ambiguous and block. A repair containing either ZIP still requires the existing valid Publish Release attestation, and an attestation observation error always blocks.

JSON-only repair creates no ZIP and no attestation. Every permitted repair explicitly dispatches fresh post-release evidence from protected `main`. Successful post-release evidence and the later OpenAI handoff continue to require their own exact-tag provenance checks, so unavailable ZIP attestations can still block those later boundaries.

## Why

- The JSON subject describes already published ZIP bytes; repairing only that
  validated metadata does not modify the installable subjects.
- Missing ZIP provenance is materially different from missing metadata and
  keeps its stronger attestation prerequisite.
- Asset chronology prevents later un-attested ZIP uploads from being
  misclassified as metadata-only repair.

## Options

- Chosen: Permit only chronology-proved JSON-only repair without ZIP
  attestations and dispatch fresh evidence.
- Rejected: Require attestations for metadata-only repair, because that blocks
  restoration without improving the unchanged ZIP bytes.
- Rejected: Permit any missing asset without attestation, because a ZIP repair
  would introduce public installable bytes without proven publication origin.
- Rejected: Infer repair from a complete exact asset set alone, because that
  cannot prove which assets were added after publication.

## Consequences

- Good: Exact metadata can be restored without manufacturing a
  post-publication ZIP attestation.
- Good: ZIP repair remains gated by existing valid provenance.
- Tradeoff: Equal or unavailable provider timestamps block even a legitimate
  fast repair.
- Risk: JSON repair may complete while later provenance-dependent proof remains
  unavailable; evidence and handoff must report that boundary.

## Follow-up

- Keep JSON-only, ZIP-repair, immutable, chronology, retry, and evidence
  fixtures distinct.
- Verify both ZIP creation times as well as the JSON creation time.
- Treat an observed missing attestation as permitted only for the proven
  JSON-only path, create no attestation there, and retain mandatory successful
  verification for initial and ZIP paths.
