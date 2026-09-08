---
name: animated-readme-logo
description: Audit, create, transform, or animate verified logo pipelines for GitHub READMEs. Use when a repository needs a new or reconstructed mark, motion specification, SVG animation master, executable animation recipe, static PNG, animated GIF, README-safe markup, reduced-motion fallback, or compatibility review. Do not use for unrelated app/site motion or generic image generation without a README branding target.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.5.2"
---

# Animated README Logo

## Goal

Audit an existing README logo pipeline or deliver a portable, verified animation from a validated SVG master, deterministic motion specification, and executable repository recipe.

## When to use

- Create, redesign, transform, animate, export, or review a repository or profile-README logo.
- Audit GitHub README logo compatibility, transparency, reduced motion, or local asset references.
- Turn an existing SVG or raster mark into a validated README asset pipeline.

## When not to use

- Ordinary README prose editing with no logo or image concern.
- App/site motion unrelated to repository branding delivery.
- Generic image generation with no README or repository-logo target.

## Workflow selection

Always expose exactly these public workflows:

- `audit`: read-only assessment of existing README logo sources, animation assets, delivery markup, and validation evidence.
- `create`: design a new mark or intentional redesign and deliver the complete verified animation stack.
- `transform`: faithfully recreate or clean up an existing mark and deliver the complete verified animation stack.
- `animate`: use an acceptable existing SVG source and deliver the complete verified animation stack.

There is no `auto` workflow and no public export workflow. Export is an internal rendering stage of every mutating route.

Route from task intent:

- review, compatibility, or quality assessment selects `audit`;
- a new mark or intentional redesign selects `create`;
- faithful work from a raster, screenshot, poster, or unsuitable SVG selects `transform`;
- an acceptable existing SVG that needs motion or raster delivery selects `animate`.

On every activation, show all four workflows, then `Selected`, `Reason`, source evidence, write scope, required outputs, protected originals, and remaining paid/tool/install/overwrite approvals. Proceed after the announcement when intent and mutation authority are unambiguous. A bare invocation, conflicting source evidence, or ambiguity about identity preservation, outcome, scope, or write authority asks the user to choose before substantive inspection. Agent-initiated activation may select `audit`; it may select a mutating workflow only when the existing task explicitly requested that outcome and scope.

Source routing is internal. Provider evaluation is available only within `create`, and selection never authorizes a credit-consuming call or tool installation.

## Inputs to inspect

- Repository identity, public brand copy, target surface, and requested task.
- README markup and root-bounded local asset references.
- Existing logo sources, reference-media fidelity needs, transparency, themes, dimensions, accessibility, and export constraints.
- Live provider, authoring, validator, exporter, and inspector capabilities without assuming availability.

## Workflow

1. Resolve and announce the intent-bound workflow. Stop before inspection only when routing or authority is ambiguous.
2. For `audit`, inspect with an explicit repository root, treat local README references as untrusted and root-bounded, run available read-only validation, report remediation, and write nothing. Return immediately after the audit report; do not continue to the mutating workflow steps below.
3. For a mutating workflow, preserve originals and reserve these deterministic names under the established asset folder, or `docs/assets/` when none exists:

   ```text
   <slug>-logo.svg
   <slug>-logo-motion.md
   <slug>-logo-animation.mjs
   <slug>-logo-static.png
   <slug>-logo-animated.gif
   ```

4. Select the internal source route. Read `references/provider-routing.md` for `create`; Recraft is ineligible for `audit`, `transform`, `animate`, clean existing SVG work, and any identity-preserving task.
5. Produce or verify a self-contained SVG at the static first-frame state. An acceptable animation source is a real, self-contained SVG that preserves the intended identity, has stable named layers, and passes the bundled strict validator. A provider result is design input, not readiness proof.
6. Write the human-readable motion specification: the renderer-independent contract for layers, keyframes, easing, duration, loop point, transparency, and reduced-motion state. This explains what must move and is the durable review surface.
7. Write the executable animation recipe: trusted repository-owned `.mjs` code that deterministically turns the SVG and motion contract into frames for the bundled exporter. This explains how the animation is rendered and is not a separate user workflow.
8. Validate the SVG and run the recipe with `--check`. Then use the bundled exporter to create the static PNG and animated GIF, and inspect the GIF. Read `references/asset-transformation.md`, `references/motion-rubric.md`, `references/export-recipe.md`, and `references/asset-pipeline.md`.
9. If a required exporter or inspector command is missing, present the minimal installation preflight and ask for explicit approval. Stop before installation. If installation is declined, forbidden, or unavailable, retain every verified intermediate that can be produced, create no placeholder PNG/GIF, and report incomplete animation delivery.
10. Choose README and optional web-demo delivery from `references/github-readme-compatibility.md`; include static and reduced-motion fallbacks, dimensions, alt text, transparency checks, and a manual committed-GitHub preview.
11. Report the public status fields below, exact files, validation evidence, fallbacks, and remaining blockers.

## Provider boundary

- Detect live Higgsfield MCP capability, exact `recraft_v4_1` availability, and the exact current cost before offering a provider route. Documentation is not availability evidence, and cost must never be hardcoded.
- Present the sanitized brief, live cost, and fixed generation settings before asking for approval.
- Make no credit-consuming call until the user explicitly approves that exact batch after the preflight.
- On unavailable or indeterminate capability, unavailable model/cost data, or explicit refusal, use the direct local SVG fallback.

## Safety rules

- Do not inspect while workflow selection is ambiguous, and do not mutate unless the user's request authorizes the selected mutating outcome and scope.
- Do not install tools, overwrite brand assets, spend credits, publish, or change remote state without the required approval.
- Keep provider approval and local-tool installation approval as separate checkpoints. Approval of one never authorizes the other.
- Do not expose secrets, private paths, internal hostnames, hidden metadata, or customer data in a prompt, asset, snippet, or report.
- Do not send reference media to Recraft or claim it preserves an existing identity.
- Reject absolute, UNC, root-escaping traversal, and symlink-escaping README asset references.
- Do not promise animated SVG, Lottie, or a raster format will work in GitHub README rendering without a compatible fallback and manual GitHub preview.
- Preserve transparency unless the user explicitly requests a background.

## References

Read only what the task needs:

- `references/provider-routing.md`: live Recraft eligibility, cost preflight, approval, fixed settings, and fallback.
- `references/output-contract.md`: exact public fields and status values.
- `references/asset-transformation.md`: direct SVG authoring, transformation, validation, and mutation boundaries.
- `references/asset-pipeline.md`: canonical assets, export capability gates, and transparency checks.
- `references/export-recipe.md`: trusted repository recipe boundary and reusable static-PNG/animated-GIF exporter contract.
- `references/local-tooling.md`: minimal exporter selection, installation approval, verification, and browser-preview fallback routing.
- `references/motion-rubric.md`: deterministic motion specification and reduced-motion requirements.
- `references/github-readme-compatibility.md`: README versus web delivery and renderer fallbacks.
- `references/readme-audit-safety.md`: root-bounded README asset inspection.
- `references/readme-snippets.md`: accessible README and demo markup.

## Scripts

- `scripts/validate_logo_svg.py <svg>` strictly validates the canonical SVG.
- `scripts/inspect-animated-image.mjs <asset>` verifies a generated, metadata-clean GIF, APNG, or animated WebP without modifying it.
- `scripts/export-readme-logo-animation.mjs --root <repo> --recipe <relative.mjs> [--check] [--replace]` validates a trusted repository recipe, then exports a static PNG and animated GIF through approved local tools with validate-before-commit and commit-time no-clobber checks. The exporter modifies only absent declared outputs unless `--replace` is explicit; `--check` performs no exporter-controlled writes, but the trusted recipe still executes.
- `scripts/audit-readme-logo-assets.mjs --root <repo-root> --readme <root-relative-readme>` audits bounded, root-contained README references and fallback roles without modifying files.
- `scripts/generate-readme-logo-snippet.mjs --fallback <path> --alt <text> --width <px> --height <px> [options]` prints markup to stdout.

Run a script with `--help` before relying on optional flags.

## Output format

Always report these fields for an activated task:

```text
Workflow: audit | create | transform | animate
Source route: <route>
Selection: <task evidence and rationale>
Write scope and protected originals: <scope>
Provider state: <state>
Approval state: <state>
Motion readiness: <state>
Animation delivery: <state>
```

Then report the asset stack, motion specification, README delivery, validation evidence, and remaining blockers. Use the exact meanings in `references/output-contract.md`.

## Completion criteria

- All four workflows were exposed and selection was either announced from clear intent or requested for ambiguity.
- `audit` remained strictly read-only.
- Successful `create`, `transform`, and `animate` routes produced and verified the SVG master, motion specification, animation recipe, static PNG, and animated GIF.
- A mutating route with missing tooling retained verified intermediates but reported incomplete delivery rather than success.
- Every paid generation is traceable to a live preflight and explicit approval of that exact batch.
- Every claimed raster export exists and passes the relevant inspector.
- Every README-local path stays within the declared repository root after symlink resolution.
- README animation has a meaningful static fallback, reduced-motion delivery, explicit dimensions and alt text, and a required manual GitHub preview.

## Runtime portability

Keep one host-neutral workflow. Do not branch on Codex, Cursor, Claude, or another agent name and do not emit agent-specific commands. Tailoring has no present benefit because source, approval, validation, motion, and output contracts are shared. Reconsider a split only if a host later requires a materially different tool or output contract.

## Failure modes

- If live provider capability, exact model availability, or current cost cannot be confirmed, report the limitation and author the SVG locally.
- If provider approval is pending, stop before generation. If it is declined, record that once and continue locally.
- If strict SVG or recipe validation fails, correct the source and rerun validation; do not claim motion readiness.
- If a required exporter or inspector runtime is missing and installation has not been declined or forbidden, present the exact minimal tool preflight and ask for approval immediately. Use `Animation delivery: blocked` while approval is pending; install nothing yet.
- If installation is declined, forbidden, or unavailable, keep the validated SVG, motion specification, and checked recipe when possible, report `Animation delivery: incomplete`, and create no placeholder raster.
- If Playwright cannot find its expected browser, do not classify the raster exporter as unavailable. Reuse an existing configured Chrome or Chromium executable, then an existing `agent-browser`; request approval before any CLI or browser download.
- If a README asset reference fails root containment, reject it before reading and report the path class.
