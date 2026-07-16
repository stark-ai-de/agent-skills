---
name: animated-readme-logo
description: Create, transform, or review animated logo asset pipelines for GitHub READMEs, including starter asset creation when no logo exists, transparent-background transformations, SVG/Lottie source choices, README-safe picture markup, reduced-motion fallbacks, GitHub Pages demos, and asset validation. Use when working on README logos, profile README hero images, animated repository branding, or README image compatibility.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.4.0"
---

# Animated README Logo

## Goal

Create a portable, validated SVG logo master and a deterministic motion plan, then export only the artifacts the available tools can verify.

## When to use

- Create, redesign, transform, animate, export, or review a repository or profile-README logo.
- Audit GitHub README logo compatibility, transparency, reduced motion, or local asset references.
- Turn an existing SVG or raster mark into a validated README asset pipeline.

## When not to use

- Ordinary README prose editing with no logo or image concern.
- App/site motion unrelated to repository branding delivery.
- Generic image generation with no README or repository-logo target.

## Inputs to inspect

- Repository identity, public brand copy, target surface, and requested task.
- README markup and root-bounded local asset references.
- Existing logo sources, reference-media fidelity needs, transparency, themes, dimensions, accessibility, and export constraints.
- Live provider, authoring, validator, exporter, and inspector capabilities without assuming availability.

## Workflow

1. Inspect repository identity, README markup, referenced assets, brand constraints, target surface, and available local or connected capabilities.
2. Select exactly one current task mode:
   - `review`: assess existing README logo assets without redesigning them.
   - `create`: design a new mark or intentionally redesign an existing one.
   - `transform`: faithfully recreate or clean an existing mark.
   - `animate-export`: define motion or export an already acceptable source.
3. Select the source route before creating anything. Read `references/provider-routing.md` for every `create` task and whenever external generation is proposed. Recraft is ineligible for `review`, a clean existing SVG, a faithful transformation, or any task that needs reference-media fidelity.
4. Preserve originals. Create deterministic derived filenames under the repository's established asset folder, or `docs/assets/` when none exists.
5. Produce a self-contained SVG locally at the static first-frame state. A provider result is design input, not proof that the SVG is ready. Use `drawio-diagrams` only when geometric, editable construction materially helps; it is not a dependency.
6. Strictly validate the SVG. Do not report completion until it passes the bundled validator. Read `references/asset-transformation.md` for the authoring and validation contract.
7. Write a deterministic motion specification with named layers, explicit keyframes, easing, duration, loop point, and a static reduced-motion state. Read `references/motion-rubric.md`.
8. Choose README and optional web-demo delivery from `references/github-readme-compatibility.md` and `references/asset-pipeline.md`. For static PNG plus animated GIF delivery, keep brand behavior in a trusted repository recipe and use the bundled exporter contract in `references/export-recipe.md`; do not recreate its rasterization and encoding plumbing in the product repository. Read `references/local-tooling.md` before declaring an exporter, inspector runtime, or browser unavailable. When a requested export or inspection needs a missing local command, immediately present the minimal installation preflight and ask for explicit approval; stop before installing. Export animated raster formats only when a detected or approved-and-verified tool can produce them and the result can be inspected. Never invent an artifact or successful export.
9. For an existing README, run the read-only audit with an explicit repository root. Treat every local reference as untrusted and root-bounded. Read `references/readme-audit-safety.md`.
10. Report the public status fields below and the exact files, checks, fallbacks, and remaining blockers.

For a multi-stage request, finish and report one mode before moving to the next mode.

## Provider boundary

- Detect live Higgsfield MCP capability, exact `recraft_v4_1` availability, and the exact current cost before offering a provider route. Documentation is not availability evidence, and cost must never be hardcoded.
- Present the sanitized brief, live cost, and fixed generation settings before asking for approval.
- Make no credit-consuming call until the user explicitly approves that exact batch after the preflight.
- On unavailable or indeterminate capability, unavailable model/cost data, or explicit refusal, use the direct local SVG fallback.

## Safety rules

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
Task mode: review | create | transform | animate-export
Source route: <route>
Provider state: <state>
Approval state: <state>
SVG readiness: <state>
Export status: <state>
```

Then report the asset stack, motion specification, README delivery, validation evidence, and remaining blockers. Use the exact meanings in `references/output-contract.md`.

## Completion criteria

- A complete creation, transformation, or animation path has a self-contained SVG that passes strict validation and a deterministic motion specification.
- A review may finish with a non-ready SVG status only when it reports concrete remediation; it must not claim the asset pipeline is complete.
- Every paid generation is traceable to a live preflight and explicit approval of that exact batch.
- Every claimed raster export exists and passes the relevant inspector.
- Every README-local path stays within the declared repository root after symlink resolution.
- README animation has a meaningful static fallback, reduced-motion delivery, explicit dimensions and alt text, and a required manual GitHub preview.

## Runtime portability

Keep one host-neutral workflow. Do not branch on Codex, Cursor, Claude, or another agent name and do not emit agent-specific commands. Tailoring has no present benefit because source, approval, validation, motion, and output contracts are shared. Reconsider a split only if a host later requires a materially different tool or output contract.

## Failure modes

- If live provider capability, exact model availability, or current cost cannot be confirmed, report the limitation and author the SVG locally.
- If provider approval is pending, stop before generation. If it is declined, record that once and continue locally.
- If strict SVG validation fails, correct the source and rerun validation; do not claim readiness.
- If a required exporter or inspector runtime is missing and installation has not been declined or forbidden, present the exact minimal tool preflight and ask for approval immediately. Use `Export status: blocked` while approval is pending; install nothing yet.
- If installation is declined, forbidden, or unavailable, keep the validated SVG and motion spec, report `Export status: capability-unavailable`, and create no placeholder.
- If Playwright cannot find its expected browser, do not classify the raster exporter as unavailable. Reuse an existing configured Chrome or Chromium executable, then an existing `agent-browser`; request approval before any CLI or browser download.
- If a README asset reference fails root containment, reject it before reading and report the path class.
