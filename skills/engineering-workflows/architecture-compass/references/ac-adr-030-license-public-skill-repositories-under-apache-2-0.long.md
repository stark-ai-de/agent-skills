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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prefer Apache-2.0 for public skill repositories that accept its attribution obligations.

Variants: [Short](ac-adr-030-license-public-skill-repositories-under-apache-2-0.short.md) · **Long, canonical** · [Guide](ac-adr-030-license-public-skill-repositories-under-apache-2-0.guide.md)

## Context

Public skill repositories distribute instructions, examples, templates, assets, and sometimes code to broad downstream audiences. A permissive license supports reuse, but the repository must choose whether the simplicity of MIT or Apache-2.0's explicit patent terms better fits its contribution and distribution model. The choice cannot grant rights the repository owner does not hold, and copied or generated material still needs a compatible provenance review.

## Decision

A new public skill repository adopts Apache License 2.0 for repository-owned public material when the repository owner has authority to license that material and no governing legal, contractual, foundation, or organizational requirement selects another license.

The explicit patent license and patent-termination terms are material benefits for a reusable contribution surface and outweigh the additional notice and attribution administration relative to MIT. The repository treats the full Apache-2.0 text, required copyright and license notices, preservation of applicable notices, changed-file marking, redistribution conditions, and any required `NOTICE` handling as part of its release contract.

License identity remains coherent across the root license file, package metadata, skill metadata where supported, generated sites, contribution guidance, source headers where the project requires them, release artifacts, and copied third-party material. Third-party content keeps its own compatible notices and is not relabeled as repository-owned. Agents provide source-backed implementation help but do not make legal determinations; unresolved ownership or compatibility questions stop the affected publication for qualified review.

## Invariants

- The repository distributes only content it may license and preserves third-party obligations.
- Public metadata uses the same SPDX identity as the governing license file.
- A `NOTICE` file is maintained when applicable content or attribution requires it; it is not invented as a substitute for legal review.
- A license change is an explicit repository decision and migration, not a mechanical search-and-replace.
- This ADR is architectural guidance, not legal advice.

## Failure handling

Stop publication when content ownership, license compatibility, required attribution, patent implications, or notice obligations are unresolved. Keep the last valid license state, identify the affected files without reproducing restricted material, and obtain qualified review before changing or distributing them.

## Consequences

Contributors and downstream users receive clearer patent terms and broad permissive reuse rights. Maintainers take on Apache-2.0's notice, attribution, modification, and redistribution bookkeeping and must keep every public artifact consistent.
