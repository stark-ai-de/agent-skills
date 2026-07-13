---
title: "Animated README Logo Export Toolchain Fallback"
slug: "animated-readme-logo-export-toolchain-fallback"
artifact_path: "docs/specs/animated-readme-logo-export-toolchain-fallback-spec.md"
mode: "focused"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-13"
updated: "2026-07-13"
source_request: "Ask before installing missing logo exporters and use configured browser fallbacks when Playwright lacks Chrome for Testing."
---

# Animated README Logo Export Toolchain Fallback

## Goal

Turn missing export and preview capabilities into explicit, minimal installation checkpoints while preserving honest artifact status and host portability.

## Scope

- Prefer `rsvg-convert` from librsvg for SVG rasterization and headless FFmpeg plus `ffprobe` for GIF, APNG, and WebP delivery.
- Ask for approval before every local package or browser installation and install only the displayed set.
- Reuse configured Chrome or Chromium executables and an existing `agent-browser` before offering Chrome for Testing.
- Keep browser preview independent from exporter and inspector readiness.

## Non-goals

- Silent installation, broad package-manager updates, or platform-specific mandatory commands.
- Replacing the bundled strict SVG or animated-image inspectors.
- Treating a local screenshot as proof of GitHub renderer behavior.

## Acceptance criteria

- Missing required commands produce an itemized tool preflight and `Export status: blocked` while approval is pending.
- Explicit refusal or an unavailable install path produces `Export status: capability-unavailable` and no placeholder.
- An approved install verifies command versions and requested format support before export.
- A Playwright browser mismatch falls through to an existing executable path and `agent-browser`; browser installation is the last approval-gated step.
- Focused and full repository validation pass.

## ADR gate

- Governing ADRs: ADR-0025 and ADR-0027.
- Result: accepted; browser and install behavior is durable public workflow policy.

## Source challenge

- Repository evidence checked: the public skill workflow, output contract, asset pipeline, bundled validators and inspector, eval schema, and existing provider-routing spec.
- Runtime evidence checked: `librsvg` provides the focused SVG rasterizer; headless FFmpeg provides `ffmpeg`, `ffprobe`, GIF/APNG/WebP muxers and encoders, plus palette filters; `agent-browser` can reuse an explicit Chromium path without Playwright's expected Chrome-for-Testing revision.
- Requirement revised: a missing Playwright browser is a preview limitation, not evidence that the raster exporter or inspector is unavailable.
- Requirement constrained: package names, versions, commands, and disk impact are live platform facts and must be inspected before an approval request.
- Requirement preserved: no package, browser CLI, browser binary, or paid provider call is installed or invoked from approval for a different side-effect class.

## User verification

- Verification basis: the maintainer directly requested approval-gated exporter installation and a configured-browser or `agent-browser` fallback in this public skill repository.
- Publication basis: the requested behavior is a public skill contract and this spec contains no secrets, customer data, private repository paths, or internal hostnames.
- No installation or provider-spend approval is inferred from accepting this spec; every concrete side effect still requires its own displayed preflight.
- A local screenshot does not close the committed-GitHub manual preview requirement.

## Risks and rollout

| Risk                                            | Mitigation                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Platform package names drift                    | Detect the active package manager and verify the displayed package set before requesting approval. |
| An install succeeds but lacks a required format | Verify command versions, filters, encoders, and muxers before export.                              |
| A managed browser is incompatible               | Follow the fallback ladder and keep browser download as the final approval-gated option.           |
| Approval scopes become conflated                | Report provider and local-tool approval separately and never reuse one for another side effect.    |

- Rollout: include the v0.3.0 skill contract in the repository's normal reviewed release flow; publishing is outside this implementation task.
- Rollback: revert the contract and version through the normal review path if focused evals expose unsafe installation or false capability claims; never restore silent installation.

## File plan

- Update the public skill workflow and OpenAI prompt.
- Add one focused local-tooling reference.
- Add exporter-approval and browser-fallback eval cases and rubric coverage.
- Update release-facing metadata without rewriting historical v0.2.0 proofs.

## Validation

```bash
npm run validate:animated-readme-logo
npm run validate
pnpm format:check
pnpm lint
git diff --check
```

## Done when

- The skill asks before required installs, uses the fallback ladder, and reports verified results without conflating provider and tool approvals.
