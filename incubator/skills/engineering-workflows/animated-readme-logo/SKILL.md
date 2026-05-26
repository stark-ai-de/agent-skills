---
name: animated-readme-logo
description: Create, transform, or review animated logo asset pipelines for GitHub READMEs, including starter asset creation when no logo exists, transparent-background transformations, SVG/Lottie source choices, README-safe picture markup, reduced-motion fallbacks, GitHub Pages demos, and asset validation. Use when working on README logos, profile README hero images, animated repository branding, or README image compatibility.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# Animated README Logo

## Goal

Design, create, transform, review, or validate animated logo asset plans for GitHub READMEs while preserving transparent backgrounds, accessibility, deterministic fallbacks, and GitHub renderer compatibility.

## When to use

- The user asks for an animated logo, animated README badge/hero, repository branding motion, or profile README logo.
- A README already embeds a GIF, WebP, APNG, SVG, Lottie, dotLottie, or logo image and needs review.
- The user has only a raster/image reference and needs a transformed transparent README logo.
- The user has no logo asset and needs Codex to create a starter asset for README branding.
- The user needs transparent logo animation guidance, reduced-motion fallback markup, or a GitHub Pages demo plan.

## When not to use

- The request is ordinary README text editing with no logo or image-motion concern.
- The user asks for app/site animation unrelated to README or repository branding delivery.
- The user asks for generic AI image generation without a README, profile README, or repository logo target.
- The user asks to publish, install tools, use paid/account-bound services, or overwrite existing brand assets without approval.

## Inputs to inspect

- README or profile README markup that contains the logo/image, if present.
- Referenced local assets under paths such as `docs/assets/`, if present.
- Attached or linked image references that should be transformed into logo assets.
- Target surface: GitHub README, profile README, GitHub Pages, docs site, app, or social preview.
- Transparency, theme, size, file-size, alt text, and reduced-motion requirements.
- Repo name, product name, README copy, brand words, existing colors, and any authoring-tool constraints.

## Workflow

1. Inspect the README logo markup, referenced asset files, and any attached image references.
2. Classify the target surface:
   - GitHub README/profile README: use image-only delivery, usually `<picture>` plus `<img>` fallback.
   - GitHub Pages/docs/app: live animated SVG, Lottie, dotLottie, CSS, or JavaScript may be acceptable.
   - Social preview or static-only target: use static raster/vector output.
3. If an asset exists, audit it for transparency, path complexity, backgrounds, scripts, `foreignObject`, CSS animation, and external references.
4. If only a raster/full-frame reference exists, transform or recreate it into a clean transparent logo source before recommending animation.
5. If no asset exists, create a starter logo source from the repo/product context, using minimal assumptions and reporting them.
6. Choose the delivery pipeline. Prefer clean SVG/source master to animated WebP or APNG to GIF fallback to static fallback for README use.
7. Design subtle deterministic motion with a static reduced-motion equivalent.
8. Produce or update the asset stack, README snippet, optional live-demo plan, validation checks, and risks.
9. Require manual GitHub preview after commit or push before treating README compatibility as verified.

## Safety rules

- Do not promise animated SVG will work as the primary GitHub README delivery format.
- Do not embed scripts, external runtime dependencies, private paths, internal hostnames, secrets, or customer data in README snippets.
- Preserve original source assets; write derived files with new deterministic names unless the user approves overwrites.
- Use available local or built-in image generation/editing tools when the user has asked for logo creation or transformation. Ask before installing tools or using paid/account-bound external services.
- Treat GIF as a compatibility fallback when high-quality transparency matters.
- Warn when SVGs contain `foreignObject`, CSS keyframes, scripts, external references, or full-canvas backgrounds.
- Keep optional proprietary tools optional; provide open or manual alternatives when possible.

## References

Read only the relevant file:

- `references/github-readme-compatibility.md` for GitHub renderer constraints, fallback orders, reduced motion, and manual preview requirements.
- `references/asset-transformation.md` for creating a starter asset, transforming raster references, preserving originals, and writing derived assets.
- `references/asset-pipeline.md` for source/master format selection, transparent export checks, and asset stacks.
- `references/motion-rubric.md` for subtle, deterministic logo-motion guidance.
- `references/readme-snippets.md` for reusable README and GitHub Pages snippets.

## Scripts

- `scripts/audit-readme-logo-assets.mjs --readme README.md` prints a read-only Markdown audit of README image blocks, local assets, SVG risks, dimensions, and reduced-motion coverage.
- `scripts/generate-readme-logo-snippet.mjs --fallback <path> --alt <text> --width <px> --height <px> [options]` prints a README-ready snippet to stdout.

## Output format

Return:

1. Verdict for the target surface
2. Recommended asset stack with exact filenames and roles
3. Asset creation/transformation steps and files created or proposed
4. Motion concept and reduced-motion equivalent
5. README snippet or static fallback
6. Optional GitHub Pages or web-demo plan
7. Validation checklist
8. Risks and compatibility notes

## Completion criteria

- The recommendation distinguishes README delivery from live web/demo playback.
- Missing assets are handled by creating a starter source or reporting the exact assumptions blocking creation.
- Raster/full-frame inputs are transformed or recreated into transparent logo sources before animation is recommended.
- Transparent-background requirements and GIF limitations are called out.
- Animated README snippets include a static reduced-motion path and `<img>` fallback.
- Snippets include meaningful `alt`, `width`, and `height`.
- Validation includes local asset checks and manual GitHub preview.

## Failure modes

- If the target surface is unclear, ask whether the deliverable is for GitHub README, profile README, GitHub Pages, app, or another surface.
- If no source asset exists and brand identity cannot be inferred, create a conservative starter asset from the repo/product name and mark assumptions.
- If an attached image is a poster, screenshot, or black-background render, do not treat it as a transparent master; create a transparent derivative or recreate the mark cleanly.
- If compatibility cannot be verified locally, mark the result as unverified and require GitHub preview.
- If requested output would require overwriting assets, installing tools, or using paid/account-bound services, stop and ask for approval before doing so.
