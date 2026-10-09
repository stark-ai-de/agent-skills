# ADR-0065: Allow explicit direct public skill releases

ID: ADR-0065
Title: Allow explicit direct public skill releases
Status: Accepted
Date: 2026-10-10
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: skills, public-catalog, release, acceptance
Applies when: A maintainer explicitly requests a skill in the public release rather than incubation.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0004, ADR-0006, ADR-0008
Superseded by: None
Guide verified: 2026-10-10
Gist: Explicit public release intent selects the public source tree while evidence claims remain bounded.

Variants: [Short](0065-allow-explicit-direct-public-skill-releases.short.md) · **Long, canonical** · [Guide](0065-allow-explicit-direct-public-skill-releases.guide.md)

## Decision

When the maintainer explicitly requests a public skill release, prepare the skill directly under `skills/<category>/<skill>/`, without `metadata.internal` and without a mandatory incubator stage. Record that scoped public-admission decision and the accepted specification before including the skill in the public catalog and selected bundle. Unselected drafts and experiments still belong in `incubator/skills/` with `metadata.internal: true`.

Assess agent-quality improvement, activation fit, utility and maintenance cost for the behavior actually offered. Ordinary incubator promotion still requires demonstrated improvement and correct activation. For an explicit direct public release, the maintainer may accept the reviewed skill with incomplete behavioral qualification if the admission record discloses those limits. Public admission is a maintainer decision, not a claim that every native-host workflow has been observed. Keep captured behavioral qualification separate: public-admission records must disclose missing observations and cannot satisfy a checker for real agent or native-host evidence. Require actual evidence before advertising automatic startup, installation or cross-skill routing as verified. Structural, projection, archive, installation-smoke and release checks still apply to the final public payload. Acceptance authorizes neither merge nor publication.

## Why

A release-ready authoring request should not create an incubator-only artifact that is absent from the requested release. The maintainer's explicit 2026-10-10 instruction accepts direct public inclusion and the related specification/ADRs. Test outcomes remain separate facts; changing placement must not turn unrun evaluations into passing evidence.

## Options

- Chosen: explicit public admission with disclosed limits and the normal release checks.
- Retained for drafts: incubation until public release is selected.
- Rejected: compulsory incubation for every skill, or treating acceptance as behavioral proof.

## Consequences

The public catalog and bundle can contain the intended skill in the same PR. Reviewers can inspect acceptance, structural validation and remaining host observations separately. The source is installable, so capability descriptions must stay within the authored and observed scope.
