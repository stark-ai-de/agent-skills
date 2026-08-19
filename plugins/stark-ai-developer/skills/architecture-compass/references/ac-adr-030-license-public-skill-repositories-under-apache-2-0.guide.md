# AC-ADR-030: License Public Skill Repositories Under Apache-2.0

ID: AC-ADR-030
Title: License Public Skill Repositories Under Apache-2.0
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: license, apache-2-0, patent, attribution
Applies when: Establishing the license for a new public skill repository or changing its distribution terms.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prefer Apache-2.0 for public skill repositories that accept its attribution obligations.

Variants: [Short](ac-adr-030-license-public-skill-repositories-under-apache-2-0.short.md) · [Long, canonical](ac-adr-030-license-public-skill-repositories-under-apache-2-0.long.md) · **Guide**

This guide is non-normative and is not legal advice. The canonical Long decision controls repository architecture; qualified counsel controls legal interpretation.

## Adoption checklist

- Confirm the repository owner and contributors can license every in-scope file.
- Add the unmodified Apache-2.0 license text and use SPDX identifier `Apache-2.0` in metadata.
- Inventory third-party files, notices, generated assets, copied examples, and contribution terms.
- Determine from the actual inputs whether a `NOTICE` file is required and preserve applicable notices in redistributions.
- Verify archives, package manifests, generated documentation, and skill metadata carry coherent license information.

MIT remains the simpler permissive alternative when a repository deliberately prioritizes minimal notice administration and accepts the absence of Apache-2.0's explicit patent grant. Do not describe either license as universally safer.

## Decision lineage

- `adapts`: [ADR-0005](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0005-adopt-apache-2-license.long.md).

## Current references

- [Apache License 2.0 text](https://www.apache.org/licenses/LICENSE-2.0.txt)
- [Apache Software Foundation licensing guidance](https://www.apache.org/legal/apply-license)
- [MIT License text](https://opensource.org/license/mit)

## Revisit

Create a successor for a license change. Re-check notices and third-party provenance on every material public-content addition.
