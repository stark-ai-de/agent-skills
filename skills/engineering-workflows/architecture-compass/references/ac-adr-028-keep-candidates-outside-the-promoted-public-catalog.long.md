# AC-ADR-028: Keep Candidates Outside the Promoted Public Catalog

ID: AC-ADR-028
Title: Keep Candidates Outside the Promoted Public Catalog
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: catalog, incubation, discovery, promotion
Applies when: Creating a skill candidate or deciding whether it belongs in the public install surface.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Keep unpromoted candidates outside normal public discovery and installation.

Variants: [Short](ac-adr-028-keep-candidates-outside-the-promoted-public-catalog.short.md) · **Long, canonical** · [Guide](ac-adr-028-keep-candidates-outside-the-promoted-public-catalog.guide.md)

## Context

A public skill directory is an install and support signal. Experimental folders, maturity prose, or documentation warnings are insufficient when an installer scans recursively or a generated catalog treats every `SKILL.md` as public. Conversely, making a candidate invalid prevents realistic evaluation against the same package contract used after promotion.

## Decision

Only explicitly promoted skills belong in the repository's normal public catalog and install surface.

New, experimental, or insufficiently proven skills start in a structurally distinct incubation boundary outside the promoted catalog. Candidates remain valid skill packages for local evaluation, but default public discovery and installation exclude them through the current installer's supported internal marker, an explicit discovery root, or another validated fail-closed mechanism. Documentation labels alone are not the boundary.

Promotion is an explicit reviewed change that moves or reclassifies the complete skill package, removes candidate-only discovery controls, adds public catalog and release metadata, and supplies the promotion evidence required by the repository. Clean-copy and public-installer checks prove both that every promoted skill is discoverable and that every remaining candidate is absent from the default public result.

If the chosen installer cannot exclude candidates reliably, keep candidate packages outside every scanned public root or publish from a filtered artifact. Do not expose candidates merely to simplify repository layout.

## Invariants

- Public catalog membership and candidate status are unambiguous from repository structure and validated metadata.
- Incubation packages remain evaluable without being advertised as supported.
- Promotion and demotion update package location, discovery controls, catalog entries, eval links, and release surfaces coherently.
- Root-level or recursive discovery is tested rather than assumed.

## Failure handling

Block publication when a candidate appears in the default install list, a promoted skill is missing, or a promotion leaves candidate-only metadata behind. Preserve the candidate boundary until the exact discovery behavior is understood and a clean-copy test passes.

## Consequences

The public install surface communicates reviewed support instead of repository completeness. Maintainers pay for an incubation layout, promotion bookkeeping, and installer-specific leakage checks, but can evaluate real packages before exposing them.
