---
name: release-manager
description: Prepare repository releases. Use when the user asks to draft release notes, update changelog, check semver, verify CI, create a release checklist, or decide whether a public repo is ready to tag and publish.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# Release Manager

## Goal

Prepare a release with clear versioning, changelog coverage, validation status, release notes, and approval gates before any irreversible publish action.

## When to use

- The user asks to prepare, review, or draft a release.
- A changelog, semver bump, tag, or release note needs review.
- CI and package readiness need preflight checks.

## When not to use

- The user wants a PR review before merge; use `pr-review`.
- The user wants a repository-wide maintenance audit; use `repo-health-audit`.
- The user asks to publish immediately but version, changelog, or validation state is unknown.

## Inputs

- Changelog, package manifests, tags, commits since last release, and merged PRs.
- CI status, test results, docs changes, migration notes, and breaking-change signals.
- Publishing workflow and maintainer approval policy.

## Inputs to inspect

- Inspect release history, current version, changelog, package metadata, CI state, and validation output.
- Check docs or migration notes for user-facing changes.

## Process

1. Identify the last release and changes since then.
2. Classify changes as added, changed, fixed, deprecated, removed, or security.
3. Recommend a semver bump with reasoning.
4. Check changelog, docs, CI, package metadata, and release workflow.
5. Draft release notes and a preflight checklist.
6. Ask for explicit approval before tagging, pushing, publishing, or creating a release.

## Workflow

Follow the process above, then stop at a release-ready draft unless the user explicitly approves tag, push, publish, or release creation.

## Decision points

- Breaking changes require major version notes or explicit migration instructions.
- Security fixes require careful disclosure language.
- Failed or missing CI blocks release readiness unless the maintainer accepts risk.

## Safety rules

- Do not tag, publish, push, or create releases without explicit approval.
- Do not include secrets or private incident details in release notes.
- Do not claim CI passed unless verified.

## References

Read only when needed:

- `references/release-checklist.md` for preflight.
- `references/changelog-template.md` for changelog entries.

## Scripts

No bundled scripts.

## Output format

Return:

1. Release readiness verdict
2. Recommended version bump
3. Changelog draft
4. Release notes draft
5. Preflight checklist
6. Approval needed

## Failure modes

- If the previous release cannot be identified, say which tags or versions were inspected.
- If CI cannot be checked, mark release readiness as unverified.
- If the changelog and commits disagree, block release readiness until reconciled.

## Completion criteria

- Version, changelog, validation status, and risks are explicit.
- Release notes are ready for maintainer editing.
- Irreversible actions are gated behind approval.
