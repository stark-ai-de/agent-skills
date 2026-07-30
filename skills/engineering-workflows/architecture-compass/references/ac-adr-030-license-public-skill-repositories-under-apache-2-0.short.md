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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prefer Apache-2.0 for public skill repositories that accept its attribution obligations.

Variants: **Short** · [Long, canonical](ac-adr-030-license-public-skill-repositories-under-apache-2-0.long.md) · [Guide](ac-adr-030-license-public-skill-repositories-under-apache-2-0.guide.md)

## Decision summary

A new public skill repository uses Apache License 2.0 for repository-owned public material when its owner has authority to license the content and no higher-priority legal or organizational constraint applies. The explicit patent grant is preferred over MIT's simpler notice, while Apache-2.0 copyright, license, NOTICE, attribution, modification, and redistribution obligations remain part of the release contract.

## Context

Installable public skills invite reuse and contributions, so patent and redistribution terms should be explicit and consistently represented.

## Invariants

- Only authorized, compatible content is distributed under the repository license.
- License files, SPDX metadata, notices, and public documentation remain coherent.
- Legal uncertainty is escalated rather than guessed by an agent.

## Consequences

Downstream users receive an explicit patent license, while maintainers accept more notice and attribution handling than MIT requires.
