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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep GitHub as the reviewed source and verify public discovery and installation through the open Skills CLI.

Variants: **Short** · [Long, canonical](ac-adr-041-publish-public-skills-through-github-and-the-open-skills-cli.long.md) · [Guide](ac-adr-041-publish-public-skills-through-github-and-the-open-skills-cli.guide.md)

## Decision summary

A public skill repository uses a public GitHub repository as its reviewed canonical source and makes promoted skills discoverable and installable through the open `skills` CLI using the repository source directly. Publication follows a separately approved release from the exact validated protected revision. Source, GitHub release, CLI list, clean install, and host linkage are verified as separate evidence stages; no proprietary registry metadata replaces the conforming skill package.

## Context

Users need a stable reviewable source and a portable install path without making a third-party catalog the authority for skill content.

## Invariants

- Git history and reviewed files remain the canonical source.
- CLI discovery exposes promoted skills only.
- Publication and installation are independently verified and explicitly authorized.

## Consequences

Skills remain inspectable and installable through common public tooling, while maintainers own GitHub release hygiene and ongoing CLI compatibility checks.
