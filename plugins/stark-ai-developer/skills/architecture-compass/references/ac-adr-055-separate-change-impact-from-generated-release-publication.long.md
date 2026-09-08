# AC-ADR-055: Separate Change Impact From Generated Release Publication

ID: AC-ADR-055
Title: Separate Change Impact From Generated Release Publication
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: release, changelog, versioning, pull-request, approval, evidence
Applies when: A repository aggregates reviewed public-skill changes into generated release preparation and separately approved publication.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-034
Superseded by: none
Guide verified: 2026-08-26
Gist: Review component impact in feature changes, aggregate root release metadata in one generated PR, and keep publication and proof separately protected.

Variants: [Short](ac-adr-055-separate-change-impact-from-generated-release-publication.short.md) · **Long, canonical** · [Guide](ac-adr-055-separate-change-impact-from-generated-release-publication.guide.md)

## Context

AC-ADR-034 coupled every public catalog change to its root repository version
and changelog entry. That is coherent for repositories which release each
change independently, but it creates conflicting ownership when several
reviewed feature pull requests queue before one catalog release. A later
generated release pull request can safely aggregate root metadata only if it
does not hide feature impact, expand its file set, or acquire publication
authority.

Publication has a different risk and authority boundary from release
preparation. Merging reviewed metadata must not silently create a tag, mutate a
release, replace validated artifacts, or claim post-release and third-party
proof.

## Decision

A target repository may separate affected-component impact from root release aggregation when deterministic automation and repository validation enforce the complete boundary.

Each feature pull request reviews and updates every affected skill, plugin, package, host manifest, catalog source, compatibility note, migration or deprecation note, evaluation claim, and install contract required by that change. It records semver impact without guessing or editing a shared root release version, release manifest, or root changelog section.

Exactly one configured release preparer is the sole writer of a generated release pull request. That pull request aggregates the already reviewed change history and changes only the repository's declared release manifest, root release version, and root changelog. Those three surfaces identify one version exactly, preserve historical entries, and are reviewed and validated before merge. The generator never creates or moves a tag, GitHub Release, registry publication, deployment, or third-party submission.

Publication is a separate explicit action from the exact validated protected revision. The mutation-capable job begins only after the repository's protected approval boundary passes, rechecks its own approval configuration before mutation when the provider permits it, preserves validated artifact bytes, refuses ambiguous or mismatched remote state, and verifies the intended stable release state independently. Initial publication and every allowed repair that changes release state explicitly start the repository's post-release proof path.

Feature review, generated release preparation, protected publication, post-release verification, public installation, and third-party handoff use separate evidence receipts. Success at one stage never grants authority or proof for a later stage.

## Invariants

- Feature pull requests contain complete affected-component and public-contract
  impact without competing for shared root release metadata.
- One configured generator owns the finite root release file set.
- The generated pull request is reviewable and cannot tag or publish.
- Publication uses the exact validated protected revision and an independently
  enforced approval boundary.
- Published artifacts are checked against the validated subject and never
  silently replaced on mismatch.
- Initial publication and material repair explicitly trigger post-release
  verification.
- Local, CI, preparation, publication, install, and third-party evidence remain
  distinct.

## Failure handling

Block the feature change when affected component versions or public-contract
surfaces disagree. Block the release pull request when it changes an undeclared
file, root version/manifest/changelog identity diverges, history is rewritten,
or the source change set is ambiguous. Block publication when approval policy,
revision identity, artifacts, remote state, stable-release observation, or
post-release dispatch cannot be proved. Preserve immutable published state and
correct it through an explicit successor release rather than moving or
clobbering public artifacts.

## Consequences

- Benefit: Feature authors review real component impact without coordinating a
  speculative shared root version.
- Benefit: One generated pull request presents the exact aggregate release and
  preserves explicit human review.
- Benefit: Approval, artifact integrity, and post-release evidence stay outside
  the generator's authority.
- Tradeoff: Repositories must maintain generator authentication, a finite
  changed-file validator, and a protected publication boundary.
- Risk: Loose file ownership or implicit event routing could hide release drift
  or skip proof; exact file-set, revision, approval, artifact, remote-state, and
  explicit-dispatch checks fail closed.
