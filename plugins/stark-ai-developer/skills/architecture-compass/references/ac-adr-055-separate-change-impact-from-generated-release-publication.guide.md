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
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-034
Superseded by: none
Guide verified: 2026-08-26
Gist: Review component impact in feature changes, aggregate root release metadata in one generated PR, and keep publication and proof separately protected.

Variants: [Short](ac-adr-055-separate-change-impact-from-generated-release-publication.short.md) · [Long, canonical](ac-adr-055-separate-change-impact-from-generated-release-publication.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls release
impact, generated preparation, publication, and evidence authority.

## Feature pull request checklist

- update every affected component version and canonical host/plugin metadata;
- update public contract, migration/deprecation, eval, catalog, and install
  surfaces owned by the change;
- record patch, minor, or breaking impact in the repository's declared form;
- leave the shared release manifest, root version, and new root changelog
  heading to the configured release preparer; and
- run the owning feature-impact validator.

## Generated release pull request checklist

- authenticate with the repository's scoped automation identity;
- derive one version from reviewed changes and the current manifest baseline;
- change exactly the manifest, root version file, and root changelog;
- preserve historical changelog sections and synchronize all three versions;
- open a reviewable pull request rather than writing the protected branch;
- never create a tag, release, registry publication, deployment, or
  third-party submission.

## Protected publication checklist

1. Bind readiness to the current protected revision and its successful hosted
   validation.
2. Reuse the exact validated artifact bytes and validate identity, size, and
   digest before mutation.
3. Put all write permissions on the downstream job behind the repository's
   protected approval environment.
4. Recheck the approval configuration before the first provider mutation.
5. Reconcile idempotently without replacing mismatched or immutable state.
6. Verify stable latest-state independently after publication.
7. Explicitly dispatch post-release proof after initial publication and every
   allowed state-changing repair.

## Evidence ledger

| Stage         | Subject                       | Required boundary                       |
| ------------- | ----------------------------- | --------------------------------------- |
| source/static | feature impact                | affected component and public contract  |
| local         | integrated candidate          | focused owners plus mandatory aggregate |
| CI            | protected revision            | hosted aggregate and exact artifacts    |
| preparation   | generated release PR          | finite files and synchronized version   |
| publication   | tag/release/assets            | protected approval and remote state     |
| post-release  | published subjects            | exact-tag rebuild and provenance        |
| external      | install or third-party portal | separate authorized observation         |

## Decision lineage

- `adapts`: [ADR-0047](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0047-generate-release-prs-and-protect-publication.long.md).

## Current sources

- [Release Please manifest configuration](https://github.com/googleapis/release-please/blob/main/schemas/config.json).
- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
- [GitHub Releases REST API](https://docs.github.com/en/rest/releases/releases?apiVersion=latest).

## Revisit

Create a reciprocal successor if feature-impact ownership, generated release
file ownership, publication approval, artifact preservation, or post-release
dispatch changes materially. Keep repository-specific workflow names and
commands in local runbooks.
