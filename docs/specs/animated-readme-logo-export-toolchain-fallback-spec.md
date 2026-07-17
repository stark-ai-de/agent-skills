---
title: "Animated README Logo Reusable Exporter and Toolchain Fallback"
slug: "animated-readme-logo-export-toolchain-fallback"
artifact_path: "docs/specs/animated-readme-logo-export-toolchain-fallback-spec.md"
mode: "focused"
status: "accepted"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-07-13"
updated: "2026-07-14"
source_request: "Ask before installing missing logo exporters, use configured browser fallbacks, and move reusable README-logo export mechanics out of the product repository while leaving brand behavior there."
---

# Animated README Logo Export Toolchain and Reusable Exporter

## Goal

Turn missing export and preview capabilities into explicit, minimal installation checkpoints, and provide one reusable exporter so product repositories keep only their brand-specific motion recipe.

## Scope

- Prefer `rsvg-convert` from librsvg for SVG rasterization and headless FFmpeg plus `ffprobe` for GIF, APNG, and WebP delivery.
- Ask for approval before every local package or browser installation and install only the displayed set.
- Reuse configured Chrome or Chromium executables and an existing `agent-browser` before offering Chrome for Testing.
- Keep browser preview independent from exporter and inspector readiness.
- Ship a dependency-free Node exporter for static PNG plus animated GIF delivery from a trusted, repository-owned JavaScript recipe.
- Root-bound the recipe, canonical SVG, and output paths; validate the recipe without exporter-controlled writes through a `--check` mode.
- Keep source selection, layers, palette, motion, dimensions, timing, and repository-specific size limits in the product recipe.

## Non-goals

- Silent installation, broad package-manager updates, or platform-specific mandatory commands.
- Replacing the bundled strict SVG or animated-image inspectors.
- Treating a local screenshot as proof of GitHub renderer behavior.
- Shipping a Stark AI brand recipe, executing remote recipes, or making a product repository depend on an author-home skill path.
- General APNG or animated WebP encoding in the first reusable-exporter revision.

## Acceptance criteria

- Missing required commands produce an itemized tool preflight and `Export status: blocked` while approval is pending.
- Explicit refusal or an unavailable install path produces `Export status: capability-unavailable` and no placeholder.
- An approved install verifies command versions and requested format support before export.
- A Playwright browser mismatch falls through to an existing executable path and `agent-browser`; browser installation is the last approval-gated step.
- The exporter accepts only a root-relative, regular recipe; its source and outputs remain inside the declared repository root after symlink resolution.
- `--check` loads the trusted recipe, validates its contract, renders every frame twice within a cumulative SVG-byte budget, and rejects any per-frame difference; export reuses the verified first-pass bytes and performs no third recipe pass. Check mode performs no exporter-controlled writes or raster-tool calls and does not sandbox the trusted recipe.
- Failure reports omit recipe, tool, temporary-directory, and canonical-root diagnostics that could disclose private paths or data.
- A successful export parses every self-contained SVG frame as XML, removes disallowed or hidden PNG metadata, creates an infinite-loop GIF, validates its per-frame centisecond schedule against recipe fps with the bundled animated-image inspector, and commits both outputs only after every check passes.
- Without `--replace`, each destination is claimed atomically at the commit point, and a destination that appears after preflight is preserved byte-for-byte. If that collision follows an earlier public hard link, the partial link and stage directories remain for manual recovery rather than risking deletion of concurrently modified shared-inode data.
- Output-parent creation, stage writes, commit operations, and cleanup stay anchored to held directory descriptors; raced symlinks and renamed lexical ancestors cannot redirect mutations outside the declared root. A mutating export fails closed on platforms without a descriptor-directory view, while read-only `--check` remains available.
- When `--replace` moves an existing destination to backup, a successful commit reports retained recovery and keeps the stage directories, validated staged links, and prior-output backups for manual inspection. Automatic backup deletion is forbidden because a writer can still hold the renamed inode open.
- A failed tool invocation or invalid artifact before commit preserves existing outputs and removes staged files. If a commit or replacement rollback is incomplete, partial links, staged artifacts, or prior-output backups remain in the declared output parents for manual recovery.
- Focused tests exercise the exporter with deterministic fake tools, including path rejection and failure atomicity, without requiring system packages in CI.
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
- Boundary revised: the public skill owns deterministic export mechanics; each target repository owns a small reviewed recipe. The recipe is executable repository code and is therefore trusted input, not a sandbox boundary.

## User verification

- Verification basis: the maintainer directly requested approval-gated exporter installation and a configured-browser or `agent-browser` fallback in this public skill repository.
- Publication basis: the requested behavior is a public skill contract and this spec contains no secrets, customer data, private repository paths, or internal hostnames.
- No installation or provider-spend approval is inferred from accepting this spec; every concrete side effect still requires its own displayed preflight.
- A local screenshot does not close the committed-GitHub manual preview requirement.

## Risks and rollout

| Risk                                            | Mitigation                                                                                                                                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform package names drift                    | Detect the active package manager and verify the displayed package set before requesting approval.                                                                                |
| An install succeeds but lacks a required format | Verify command versions, filters, encoders, and muxers before export.                                                                                                             |
| A managed browser is incompatible               | Follow the fallback ladder and keep browser download as the final approval-gated option.                                                                                          |
| Approval scopes become conflated                | Report provider and local-tool approval separately and never reuse one for another side effect.                                                                                   |
| A recipe escapes the target repository          | Require root-relative paths and verify existing files and output ancestors against the real root.                                                                                 |
| Encoding or replacement fails                   | Validate both artifacts first, atomically reject each no-replace collision, and retain partial links or recovery files whenever automatic rollback cannot prove it owns the data. |
| A recipe contains unreviewed executable code    | Run only a trusted repository-owned module and state that boundary in the reference and CLI help.                                                                                 |
| A tool or recipe error includes private data    | Return bounded error codes and sanitized messages without forwarding subprocess or exception text.                                                                                |

- Rollout: include the v0.4.0 skill contract in catalog v0.12.0 through the repository's normal reviewed release flow; publishing is outside this implementation task.
- Rollback: revert the contract and version through the normal review path if focused evals expose unsafe installation or false capability claims; never restore silent installation.

## File plan

- Update the public skill workflow and OpenAI prompt.
- Add the dependency-free exporter and a focused recipe-contract reference.
- Add deterministic exporter tests without expanding the fixed behavioral eval-case set.
- Update the existing toolchain reference, ADR, release metadata, and changelog without rewriting historical proofs.

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
