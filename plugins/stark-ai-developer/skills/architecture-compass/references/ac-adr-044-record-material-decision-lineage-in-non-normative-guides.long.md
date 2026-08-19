# AC-ADR-044: Record Material Decision Lineage in Non-Normative Guides

ID: AC-ADR-044
Title: Record Material Decision Lineage in Non-Normative Guides
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: decision-lineage, provenance, adr, validation
Applies when: Creating or maintaining an Architecture Compass ADR triplet or its repository-ADR derivation record.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Keep only material public decision relationships in Guides and validate a complete lineage disposition inventory.

Variants: [Short](ac-adr-044-record-material-decision-lineage-in-non-normative-guides.short.md) · **Long, canonical** · [Guide](ac-adr-044-record-material-decision-lineage-in-non-normative-guides.guide.md)

## Context

Architecture Compass Guides have used `Source provenance` for several different concerns: public repository decisions from which a provider decision was derived, current technical sources, required attribution, assertions that a decision was new, and unpublished maintainer review history. Those meanings have different authority and disclosure boundaries. The mixed heading obscures useful architectural ancestry, encourages low-value originality boilerplate, and can publish context that consumers cannot verify.

Removing every relationship would also discard useful information. A reader benefits from knowing that one provider decision consolidates several repository decisions, broadens a repository-specific rule, or deliberately does not retain an older decision's framing. That genealogy is maintenance context, not part of the provider decision's normative meaning.

## Decision

Architecture Compass records repository-decision ancestry only when a public relationship materially explains the formation or boundary of an AC-ADR. The relationship appears only in the non-normative Guide under `## Decision lineage` and uses one or more of these typed relations:

- `adapts`: retains the source decision's core outcome with bounded provider-specific changes;
- `consolidates`: combines multiple source decisions into one provider decision;
- `generalizes`: removes repository-specific constraints or broadens the source decision's applicability; or
- `diverges-from`: identifies a public predecessor whose material framing or outcome the provider decision deliberately does not retain.

An AC-ADR with at least one such relationship has disposition `material` and includes the section. An AC-ADR without such a relationship has disposition `independent` and omits it; the Guide does not add claims such as “new,” “original,” or “not copied.” Every AC-ADR ID receives exactly one disposition in a complete machine-validated manifest stored outside the installed skill payload. The manifest is derived maintenance metadata, not another prose policy layer.

Each lineage source links to the public canonical Long repository ADR and uses only verifiable repository-decision identity. It must be a formal predecessor decision for the same concern, not merely a named comparison or inspiration target. Private repositories or paths, anonymous or unpublished drafts, review participants, raw comparison notes, and unverifiable approval history are excluded.

Decision lineage remains separate from:

- official or current sources needed to apply or verify the Guide;
- copyright, license, notice, and attribution obligations;
- AC-ADR `Supersedes` and `Superseded by` metadata; and
- the provider-to-local ADR mapping produced by Architecture Compass Setup and Apply.

The canonical Long decision stays self-contained. A lineage edge never introduces, relaxes, or justifies a normative obligation that is absent from Long, and removing a lineage edge cannot change the decision's meaning.

## Invariants

- `Decision lineage` occurs only in a Guide whose manifest disposition is `material`.
- Every listed relation and source matches the validated manifest; an `independent` Guide omits the section.
- Short and Long variants never carry repository-decision lineage sections.
- Public technical sources and required attribution remain in their own source or attribution sections.
- AC-ADR succession and provider-to-local mapping retain their existing authorities and are not duplicated as decision lineage.
- Maintainer-private or unverifiable history never enters the installed payload.

## Conflict resolution

AC-ADR-001 continues to define Long as the sole normative variant and the catalog as the routing surface. AC-ADR-004 and repository ADR-0030 continue to control public/private disclosure and required public evidence. AC-ADR-031 continues to govern evaluation evidence, AC-ADR-034 continues to govern release coherence, and AC-ADR-048 continues to govern provider-to-local mapping. If lineage would weaken or duplicate any of those contracts, omit the lineage content and preserve the controlling contract.

## Failure handling

Treat a missing disposition, an unknown relation, a private or unverifiable source, a material/independent mismatch, a Guide relation that differs from the manifest, or the legacy `Source provenance` heading as a blocking library defect. Do not infer lineage from prose or repair an accepted Short or Long decision to make a relationship fit; correct the non-normative Guide and derived manifest, or create a successor when the canonical decision itself must change.

## Acceptance criteria

- Every AC-ADR in the validated inventory has exactly one `material` or `independent` manifest disposition.
- Every material disposition has at least one allowed typed relationship to an existing public canonical repository Long ADR.
- Material Guides contain the exact manifest relationships under `Decision lineage`; independent Guides omit the section.
- No Short or Long variant contains a decision-lineage section.
- No Architecture Compass Guide retains the `Source provenance` heading, originality boilerplate, or unpublished maintainer history.
- Negative fixtures prove that incomplete and mismatched lineage data fail validation.

## Consequences

The library preserves useful architectural genealogy while reducing installed prose, ambiguous terminology, and disclosure risk. Maintainers must update a Guide and the repo-only manifest together when material lineage changes. Independent decisions remain quiet in the public payload but explicit in validation evidence.
