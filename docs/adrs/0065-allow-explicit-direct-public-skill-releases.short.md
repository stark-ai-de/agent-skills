# ADR-0065: Allow explicit direct public skill releases

ID: ADR-0065
Title: Allow explicit direct public skill releases
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: skills, public-catalog, release, acceptance
Applies when: A maintainer explicitly requests a skill in the public release rather than incubation.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0004, ADR-0006, ADR-0008
Superseded by: None
Guide verified: 2026-10-09
Gist: Explicit public release intent selects the public source tree while evidence claims remain bounded.

Variants: **Short** · [Long, canonical](0065-allow-explicit-direct-public-skill-releases.long.md) · [Guide](0065-allow-explicit-direct-public-skill-releases.guide.md)

## Decision

When the maintainer explicitly requests a public skill release, prepare the skill directly under `skills/<category>/<skill>/`, without `metadata.internal` and without a mandatory incubator stage. Record that scoped public-admission decision and the accepted specification before including the skill in the public catalog and selected bundle. Unselected drafts and experiments still belong in `incubator/skills/` with `metadata.internal: true`.

Assess agent-quality improvement, activation fit, utility and maintenance cost for the behavior actually offered. Ordinary incubator promotion still requires demonstrated improvement and correct activation. For an explicit direct public release, the maintainer may accept the reviewed skill with incomplete behavioral qualification if the admission record discloses those limits. Public admission is a maintainer decision, not a claim that every native-host workflow has been observed. Keep captured behavioral qualification separate: public-admission records must disclose missing observations and cannot satisfy a checker for real agent or native-host evidence. Require actual evidence before advertising automatic startup, installation or cross-skill routing as verified. Structural, projection, archive, installation-smoke and release checks still apply to the final public payload. Acceptance authorizes neither merge nor publication.

## Context

The maintainer requested a regular public skill for the next release. Incubation is useful for drafts, but should not override that explicit release scope.

## Consequences

Explicit release intent selects public placement. Drafts remain internal; test evidence and publication authority remain separate.
