# ADR-0011: Use manual release workflows

ID: ADR-0011
Title: Use manual release workflows
Status: Superseded
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, automation, superseded
Applies when: Reviewing the repository's former release workflow.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0015
Guide verified: 2026-07-28
Gist: Releases should be automated but explicitly triggered.

Variants: [Short](0011-use-manual-release-workflows.short.md) · **Long, canonical** · [Guide](0011-use-manual-release-workflows.guide.md)

## Decision

We will use manual GitHub Actions workflows to prepare release PRs, create tags, and publish GitHub Releases. Pull requests with release-intent metadata must pass release validation before merge.

## Why

- Release version changes should be reviewable before tags exist.
- The `skills` CLI installs from GitHub source, so no registry publish is needed.
- A single publish workflow avoids brittle workflow recursion from `GITHUB_TOKEN` pushes.

## Options

- Chosen: Manual prepare and publish workflows.
- Rejected: Auto-release on merge, because promotion needs maintainer judgment.
- Rejected: Custom skill archives, because source installs are the current distribution path.

## Consequences

- Good: Releases become repeatable and auditable.
- Good: Partial release preparation fails at the PR gate.
- Tradeoff: Maintainers still approve each release step.
- Risk: Generated release PRs may need manual validation unless a GitHub App token is added.

## Follow-up

- Revisit custom archives only if a real installer needs them.
