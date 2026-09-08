---
name: release-manager
description: Prepare and operate repository releases through a finite, approval-gated hosted workflow. Use when the user asks to inspect release status, check setup, record component impact, create a generated release PR, plan or approve publication, dispatch post-release evidence, or prepare the OpenAI handoff.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: repo-maintenance
  version: "0.2.1"
---

# Release Manager

## Goal

Prepare and operate a release through repository-owned hosted workflows without creating local tags or releases.

## When to use

- The user asks to prepare, review, or draft a release.
- Release setup, component impact, generated version PRs, protected publication,
  evidence, or OpenAI handoff needs review or execution.

## When not to use

- The user wants a PR review before merge; use `pr-review`.
- The user wants a repository-wide maintenance audit; use `repo-health-audit`.
- The repository has no explicit hosted release contract; first inspect its native
  instructions and ADRs.

## Inputs

- Requested command and its exact arguments.
- Repository release configuration, manifest, component versions, hosted runs,
  release environment policy, and publication evidence.

## Inputs to inspect

- Inspect the repository-native `release:manage` surface before selecting a route.
- Check accepted ADRs, current branch/SHA, release history, component versions,
  hosted validation, environment policy, and evidence by layer.

## Process

1. Select exactly one supported workflow from the finite set below.
2. Verify repository identity, protected state, and the requested command's authority.
3. Run the repository-owned command. Read-only commands need no mutation approval;
   every hosted dispatch or approval must include `--confirm`.
4. Report local, hosted, publication, evidence, and portal state separately.
5. Stop at the next approval or manual portal boundary.

## Workflow

The complete workflow set is:

- `status` — read-only release and workflow state.
- `setup-check` — read-only App, secret, lifecycle-label, environment, branch,
  and workflow preflight.
- `impact --kind patch|minor|breaking [--skill <name>]` — read-only component-impact guidance.
- `release-pr --confirm` — dispatch Release Please to create or update its draft PR.
- `publish-plan [--recovery-release-sha <sha>] --confirm` — dispatch the read-only hosted publication plan; the optional full SHA selects guarded pre-publication recovery.
- `publish [--recovery-release-sha <sha>] --confirm` — dispatch protected publication and wait for environment approval.
- `approve --run-id <id> [--recovery-release-sha <sha>] --confirm` — approve the waiting `release` environment deployment, repeating the exact recovery SHA when applicable.
- `post-release --tag vX.Y.Z --confirm` — dispatch tag-bound evidence on protected `main`.
- `openai-handoff --tag vX.Y.Z` — read-only handoff checklist after verifying the latest three-asset release and a newer successful exact-tag Evidence run.

On a bare or materially ambiguous invocation, show this set and ask which outcome
the user wants. When intent and authority are clear, announce the selected route
and proceed.

## Decision points

- Feature PRs raise affected component versions; Release Please alone changes the
  root manifest, package version, and release changelog section.
- `publish-plan` proves readiness only; `publish` additionally crosses the protected
  environment boundary.
- Retry a transient failure through the original workflow run. Use the explicit
  recovery SHA only when an immutable controller defect blocked publication before
  any target tag or Release existed; the protected replacement SHA becomes the
  release and attestation revision after exact payload-equivalence proof.
- Post-release evidence and OpenAI portal publication are distinct completion layers.

## Safety rules

- Never create a tag or GitHub Release locally.
- Never bypass `--confirm`, the hosted workflow, or the protected environment.
- Never use recovery to absorb feature, dependency, root release metadata, or public
  payload changes into an existing version.
- Do not include secrets or private incident details in release notes.
- Do not claim hosted validation, publication, evidence, or portal completion unless
  verified at that exact layer and revision.
- OpenAI upload and portal asset edits remain manual external actions unless the
  user separately authorizes them.

## References

Read only when needed:

- `references/release-checklist.md` for preflight.
- `references/changelog-template.md` for changelog entries.

## Scripts

No bundled scripts.

## Output format

Return:

1. Selected workflow and exact command
2. Current state by evidence layer
3. Result or blocker
4. Next approval/manual action

## Failure modes

- Missing App, secret, Release Please lifecycle labels, or environment
  configuration blocks hosted mutations.
- A missing successful Validate run blocks publication.
- Recovery blocks unless the original App-owned release, protected ancestry,
  fixed path allowlist, absent tag/Release, both hosted validations, and exact ZIP
  equivalence all pass.
- Mismatched or immutable release assets block without clobber.
- If portal state cannot be inspected, mark OpenAI completion as manual and unverified.

## Completion criteria

- The requested finite workflow completed at its own evidence layer.
- Every later hosted, publication, evidence, and portal boundary remains explicit.
- No local tag or release was created.
