# Design profiles

Use these profiles as original draw.io style recipes, not as instructions to copy a reference image. Do not reproduce source compositions, text, proprietary artwork, or brand groupings. A profile changes presentation only; architecture content, icon-first coverage, animation policy, routing, accessibility, and validation still apply.

## Contents

- [Selection](#selection)
- [Reference style adaptation](#reference-style-adaptation)
- [Shared guardrails](#shared-guardrails)
- [Operator grid](#operator-grid)
- [Isometric air](#isometric-air)
- [Neon hub](#neon-hub)
- [Aurora story](#aurora-story)
- [Implementation fragments](#implementation-fragments)

## Selection

Record `design_profile: technical | operator-grid | isometric-air | neon-hub | aurora-story | adapted-<short-name>` and `theme_mode: adaptive | light | dark` in the semantic model. `theme_mode` selects the preferred preview/export; keep the editable source adaptive. Explicit user choice wins. Otherwise use `technical`; infer an expressive profile only when the audience and requested artifact clearly call for it. Use one profile across the file unless the user requests a deliberate per-page treatment, and never mix profile cues on one page. Stamp one representative visible cell per page—the background, title, or focus component—with stable id `profile-<name>` and style key `designProfile=<name>`; the marked cell should exhibit the profile, not be hidden metadata.

| Profile         | Best fit                                                                                                   | Avoid or simplify when                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `technical`     | dense architecture, operations, ER/UML, long-lived engineering docs                                        | the user explicitly requests a more expressive presentation                            |
| `operator-grid` | developer workflows, agent/data pipelines, step-focused demos, current-path highlighting                   | formal notation or print density matters more than interaction cues                    |
| `isometric-air` | deployment, infrastructure tiers, topology, capacity/instance views with 5-12 primary nodes                | the graph has heavy fan-out, many cross-links, or more than roughly 12 primary nodes   |
| `neon-hub`      | dark product architecture with one clear hub, team/platform boundaries, high-level slide or README visuals | the output is print-first, has no clear focal subsystem, or needs many semantic colors |
| `aurora-story`  | executive architecture stories, branded integrations, numbered service journeys with 4-8 primary nodes     | the output is a runbook, detailed reference, or dense operational diagram              |

## Reference style adaptation

When the user supplies a diagram or image as a style reference, adapt it for the current task without copying its layout or proprietary assets:

1. Extract only the reusable system: canvas/surface/text/accent colors, type hierarchy, grid and spacing, corner radius, border weight, connector treatment, icon-chip treatment, and limited gradient/shadow use.
2. Map those tokens to editable draw.io styles and `light-dark(...)` pairs. Start from the closest built-in profile, then change only the tokens needed to preserve the reference's visual character.
3. Reapply the shared contrast, icon fidelity, static semantics, animation, routing, and density guardrails. Readability wins over visual similarity.
4. Record the result as `design_profile: adapted-<short-name>` for this delivery. Persist a reusable profile or asset only when the user explicitly asks; otherwise leave no cache or global configuration.

Never reproduce the reference's exact composition, text, logos, illustrations, or branded grouping. Report which tokens were adapted and any accessibility-driven substitutions.

## Shared guardrails

- Keep an 8 px grid, portable fonts, 12 px body/connector text where practical, 14 px component titles, 4.5:1 text contrast, and 3:1 contrast for essential boundaries and controls.
- Use `adaptiveColors="auto"` and intentional `light-dark(...)` pairs on every page, including dark-first profiles.
- Keep logos and native service icons recognizable. Do not recolor them to match a profile; change the chip or card behind them.
- Keep arrowheads, labels, and line roles complete without color, glow, texture, or motion. Animation remains progressive enhancement.
- Profile accents express hierarchy, focus, or sequence; they do not replace status labels, boundaries, or relationship text.
- Do not use an accent token for small text unless that exact foreground/background pair reaches 4.5:1.
- Prefer one profile accent plus semantic exceptions. Never apply gradients, shadows, dashes, or bright colors to every object.

## Operator grid

Translate the adaptive light/dark reference into a technical control-plane aesthetic: faint square grid, outlined cards, compact badges, monospaced IDs/ports/status, and one visibly active route. Keep ordinary titles and body copy in a portable sans-serif; reserve monospace for short technical data.

- Palette: canvas `light-dark(#F5F7FB,#0B0F16)`, surface `light-dark(#FFFFFF,#111827)`, text `light-dark(#111827,#E5ECF8)`, stroke `light-dark(#718096,#5B6B80)`, blue `light-dark(#2563EB,#60A5FA)`, mint `light-dark(#047857,#34D399)`.
- Use `gridSize=8` for alignment. For an exported grid cue, use one original self-contained SVG background cell with a faint 32 px square pattern, tag it `dataRole=decorative`, and keep it in the background layer. Do not create hundreds of individual line cells; omit the visible pattern when print density or accessibility calls for a clean canvas.
- Use a consistent moderate corner treatment, 1 px neutral strokes, 2 px active-path strokes, small number/status badges, and a restrained role legend. Use 24 px page titles, 14 px card titles, and 11-12 px metadata.
- Dim inactive paths only through stroke/fill emphasis; keep all labels above the contrast floor. Do not simulate UI controls that do not explain the diagram.
- Use one plain title color. A multi-color title is optional only for a short presentation tagline and must be built from separate editable text cells.

## Isometric air

Use sparse axonometric or stacked-block geometry, muted navy infrastructure shapes, orange focus outlines, thin dotted dependencies, and generous whitespace. Keep labels horizontal even when geometry is angled.

- Palette: canvas `light-dark(#F7FAFA,#101720)`, surface `light-dark(#FFFFFF,#17212B)`, text `light-dark(#1F2937,#E5E7EB)`, stroke `light-dark(#718096,#6B7D90)`, infrastructure `light-dark(#4C5B7C,#94A3B8)`, accent `light-dark(#C2410C,#FB923C)`.
- Use built-in `shape=isoCube`, `shape=isoCube2`, or `shape=isoRectangle` first; fall back to `shape=cube`, then a small editable three-face block from stock polygons. Do not require a shape index or use a rasterized pseudo-3D scene.
- Put each title and metadata in a separate horizontal label cell below or beside the isometric shape; never let text cross an internal face seam.
- Reserve dotted lines for static dependency or telemetry. Directed runtime/data edges retain arrowheads, labels, animation policy, and stronger contrast.
- Give each component roughly a 140x96 px footprint with at least 56-64 px peer spacing. Use 14-16 px horizontal titles and at least 12 px metadata. Pair recognized products with their real logo/service stencil near the label; use isometric blocks for generic instances, clusters, and deployment units.

## Neon hub

Use a dark-first black/charcoal canvas, one central hub, oversized modular cards, dashed team/system boundaries, gray secondary routes, and one acid-lime focus path. Provide a quiet light companion instead of forcing the dark canvas in every viewer.

- Palette: canvas `light-dark(#F7FAF5,#111311)`, surface `light-dark(#FFFFFF,#191B19)`, text `light-dark(#17211B,#E7E9E7)`, stroke `light-dark(#667085,#647066)`, accent `light-dark(#4D7C0F,#D7FF00)`.
- Use `arcSize=12-16` (a draw.io percentage, not pixels), 1-2 px strokes, large icon/logo areas, and at most one dashed container hierarchy per level.
- Use 24-28 px page titles, a 16 px hub title, 14 px peer titles, and at least 12 px metadata.
- Use the lime accent for the hub and one focus route only. Keep other routes neutral, label all relationships, and use a junction or separated rails when more than three edges attach to one side.
- Do not add glow, hatching, or neon text shadows. Use solid fill/stroke contrast that survives PNG/PDF and reduced-motion output.

## Aurora story

Use a 16:9 dark navy or pale lavender canvas, large rounded service columns, numbered flow steps, brand logos for named products or semantic icons for generic services, and restrained violet/rose/teal accents. This is a presentation profile, not the default architecture reference style.

- Palette: canvas `light-dark(#F3F1FF,#070B2B)`, surface `light-dark(#FFFFFF,#111638)`, text `light-dark(#17112B,#F8FAFC)`, violet `light-dark(#6D28D9,#C084FC)`, rose `light-dark(#BE185D,#F472B6)`, teal `light-dark(#0F766E,#2DD4BF)`, gold `light-dark(#A16207,#FACC15)`.
- Use `arcSize=16` (a draw.io percentage, not pixels), 160-240 px service cards, 28-32 px page titles, 16 px service titles, at least 12 px labels/badges, clear step numbers, and no more than three accent families on a page.
- Allow one subtle same-hue gradient and one shadow tier on primary service cards. Keep `glass=0`; never shadow text or connectors.
- Keep primary routes solid and labelled. Use a dotted accent route only for a clearly named secondary control or discovery flow.

## Implementation fragments

Start from the neutral fragments and opt into a focus/primary fragment only for the limited elements named by the profile:

```text
operator-grid-base: rounded=1;arcSize=12;fillColor=light-dark(#FFFFFF,#111827);strokeColor=light-dark(#718096,#5B6B80);fontColor=light-dark(#111827,#E5ECF8);shadow=0;glass=0;
isometric-air-base: shape=isoCube;fillColor=light-dark(#FFFFFF,#17212B);strokeColor=light-dark(#718096,#6B7D90);fontColor=light-dark(#1F2937,#E5E7EB);shadow=0;glass=0;
isometric-air-focus: shape=isoCube;fillColor=light-dark(#FFF7ED,#431407);strokeColor=light-dark(#C2410C,#FB923C);fontColor=light-dark(#1F2937,#F8FAFC);shadow=0;glass=0;
neon-hub-base: rounded=1;arcSize=14;fillColor=light-dark(#FFFFFF,#191B19);strokeColor=light-dark(#667085,#647066);fontColor=light-dark(#17211B,#E7E9E7);shadow=0;glass=0;
neon-hub-focus: rounded=1;arcSize=14;fillColor=light-dark(#F7FEE7,#242A19);strokeColor=light-dark(#4D7C0F,#D7FF00);fontColor=light-dark(#17211B,#F7FEE7);shadow=0;glass=0;
aurora-story-base: rounded=1;arcSize=16;fillColor=light-dark(#FFFFFF,#111638);strokeColor=light-dark(#6B7280,#7C86A2);fontColor=light-dark(#17112B,#F8FAFC);shadow=0;glass=0;
aurora-story-primary: rounded=1;arcSize=16;fillColor=light-dark(#FFFFFF,#111638);gradientColor=light-dark(#F3E8FF,#312E81);gradientDirection=north;strokeColor=light-dark(#6D28D9,#C084FC);fontColor=light-dark(#17112B,#F8FAFC);shadow=1;glass=0;
```

Implementation capabilities are grounded in the official draw.io [style reference](https://www.drawio.com/docs/reference/diagram-generation/style-reference/), [adaptive-color guidance](https://www.drawio.com/docs/manual/editor/appearance/adaptive-colours/), and [shape-style guidance](https://www.drawio.com/docs/manual/styles/shape-styles/).
