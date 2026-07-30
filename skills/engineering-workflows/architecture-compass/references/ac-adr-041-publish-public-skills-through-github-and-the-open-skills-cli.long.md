# AC-ADR-041: Publish Public Skills Through GitHub and the Open Skills CLI

ID: AC-ADR-041
Title: Publish Public Skills Through GitHub and the Open Skills CLI
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: github, skills-cli, publishing, installation
Applies when: Choosing or validating the public source, discovery, installation, and release path for a public skill repository.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep GitHub as the reviewed source and verify public discovery and installation through the open Skills CLI.

Variants: [Short](ac-adr-041-publish-public-skills-through-github-and-the-open-skills-cli.short.md) · **Long, canonical** · [Guide](ac-adr-041-publish-public-skills-through-github-and-the-open-skills-cli.guide.md)

## Context

A public skill needs a canonical review surface, immutable release identity, and an installer path users can inspect. A proprietary registry or generated leaderboard can improve discovery but should not become the only source of the package contract. GitHub source presence alone does not prove installer discovery, host linkage, or a released tag, and a CLI list result does not prove a selected skill was installed correctly.

## Decision

A public skill repository uses a public GitHub repository as the canonical reviewed source for promoted skill packages, repository ADRs and policies, eval evidence, release metadata, and contribution history.

Promoted skills conform to the open Agent Skills specification and are discoverable and installable directly from the GitHub repository through the open `skills` CLI. The documented path supports listing without installation, selecting an exact skill, choosing an explicit project or user scope and target host, and verifying the resulting package or host link. Generated catalogs, skills.sh pages, badges, and search indexes are secondary discovery views; they do not redefine package content or quality.

Publication begins only after the repository's release-coherence gate and separate explicit approval. It uses the exact validated protected revision, creates or verifies immutable tag and release identity where the repository uses them, and never silently repairs source metadata during publication. Public source availability, GitHub release state, CLI listing, clean installation, installed package contents, and host linkage are separate evidence stages and are reported separately.

Installation guidance avoids non-interactive confirmation bypass by default, distinguishes project from global scope, names the target host when relevant, and warns that installed skills are executable context. Maintainers verify candidate exclusion, exact promoted inventory, links, licenses, secrets and public provenance, update behavior, and removal instructions against the current CLI. Telemetry or third-party catalog behavior is disclosed from current sources and does not become a hidden publication requirement.

## Invariants

- The public GitHub revision is the source that reviewers and users can inspect.
- Installer-facing identity derives from conforming `SKILL.md` packages.
- Candidate and private content remain outside default public discovery.
- Release, list, install, package-content, and host-link claims each have direct evidence.
- Publication and user-level installation require explicit authority at their own boundaries.
- A third-party index cannot silently replace repository quality or promotion governance.

## Failure handling

Block publication when the protected revision, release metadata, public inventory, candidate exclusion, license, or public-safety checks disagree. If the CLI cannot list or install the exact promoted package from the public source, report publication as incomplete and preserve the last valid release. Do not work around discovery failure by exposing incubator content or copying packages into an unreviewed registry.

## Consequences

Users receive a transparent source and a common multi-host install path, while maintainers keep control of review and release authority. The repository must continuously verify GitHub and CLI behavior and describe third-party discovery limits honestly.
