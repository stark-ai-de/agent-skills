---
name: dependency-update-review
description: Review dependency updates, package manager changes, lockfile diffs, version bumps, and dependency risk. Use when the user asks whether dependency updates are safe, wants to upgrade packages, or needs a dependency PR reviewed.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# Dependency Update Review

## Goal

Assess dependency and lockfile changes for compatibility, supply-chain risk, package-manager consistency, and targeted validation needs.

## When to use

- A PR updates dependencies or lockfiles.
- The user asks whether an upgrade is safe.
- Package manager, runtime version, or dependency policy changes need review.

## When not to use

- The task is broad security hygiene; use `security-baseline-review`.
- The user asks for a full PR review with dependency changes as one part; use `pr-review`.
- Current vulnerability status is required but advisory data is unavailable.

## Inputs to inspect

- Manifest files, lockfiles, package-manager config, and runtime version files.
- Changelogs or release notes for direct dependency major updates.
- CI results, test coverage, and code paths using upgraded packages.

## Review rubric

Check direct vs transitive changes, major version jumps, package manager consistency, postinstall scripts, binary/native dependencies, lockfile churn, and targeted test coverage. Read `references/dependency-risk-rubric.md` for detail.

## Workflow

1. Identify the package manager and changed dependency files.
2. Separate direct dependency updates from transitive lockfile changes.
3. Flag major upgrades and packages with build, native, auth, or network behavior.
4. Check whether docs, config, or code need migration updates.
5. Recommend targeted validation commands.
6. Do not claim vulnerability status without current advisory evidence.

## Safety rules

- Do not run broad upgrades, lockfile regeneration, or package-manager migrations unless asked.
- Do not claim current vulnerability status without checking current advisory sources.
- Do not print registry credentials or private package URLs from config.

## References

Read only when needed:

- `references/dependency-risk-rubric.md`

## Scripts

No bundled scripts.

## Output format

Return:

1. Dependency change summary
2. Risk assessment
3. Required migration notes
4. Targeted validation
5. Blocking concerns
6. Recommended next action

## Failure modes

- If lockfile tooling is unavailable, review manifests and state that lockfile resolution was not reproduced.
- If advisory data is needed, request permission to query current sources.
- If the update mixes unrelated package-manager changes, recommend splitting.

## Completion criteria

- Direct and transitive changes are separated.
- Upgrade risks are tied to package behavior or version class.
- Validation is specific to affected surfaces.
