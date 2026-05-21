# ADR-0011: Use manual release workflows

Status: Accepted  
Date: 2026-05-21  
Owner: stark-ai-de  
Gist: Releases should be automated but explicitly triggered.

## Decision

We will use manual GitHub Actions workflows to prepare release PRs, create tags, and publish GitHub Releases.

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
- Tradeoff: Maintainers still approve each release step.
- Risk: Generated release PRs may need manual validation unless a GitHub App token is added.

## Follow-up

- Revisit custom archives only if a real installer needs them.
