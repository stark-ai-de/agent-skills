# AC-ADR-034: Keep Release Metadata Coherent With Public Catalog Changes

ID: AC-ADR-034
Title: Keep Release Metadata Coherent With Public Catalog Changes
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: release, changelog, versioning, pull-request
Applies when: Adding, removing, promoting, or materially changing a public skill or catalog contract.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Review release metadata with the public catalog change while keeping publication separately approved.

Variants: [Short](ac-adr-034-keep-release-metadata-coherent-with-public-catalog-changes.short.md) · [Long, canonical](ac-adr-034-keep-release-metadata-coherent-with-public-catalog-changes.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls release coherence and publication authority.

## Change review checklist

- skill frontmatter version and host metadata;
- repository package or catalog version when applicable;
- changelog and migration/deprecation notes;
- public catalog, README, generated-site source, and install examples;
- eval cases and claims tied to the changed revision;
- release-intent marker and focused validation.

## Publication ledger

| Stage         | Subject              | Evidence | Status or limitation |
| ------------- | -------------------- | -------- | -------------------- |
| source/static | reviewed diff        |          |                      |
| local         | working tree         |          |                      |
| CI            | protected revision   |          |                      |
| publication   | tag/release/artifact |          |                      |
| install       | clean public source  |          |                      |

## Decision lineage

- `generalizes`: [ADR-0015](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0015-prepare-releases-in-change-prs.long.md).

## Current references

- [Semantic Versioning](https://semver.org/)
- [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

## Revisit

Create a successor if publication authority or the repository's release unit changes. Keep exact commands and workflow names in repository-local runbooks.
