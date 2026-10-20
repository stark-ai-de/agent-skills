---
name: visual-reports
description: Create and update compact visual HTML reports, comparisons, explainers and local prototypes using purpose templates, domain profiles, diagrams and complete HTML/Markdown/JSON exports. Use when richer output helps an authorized answer or the user asks for a visual report; keep small answers in chat. Not production application UI or clinical advice.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "1.0.0"
---

# Visual Reports

## Goal

Make the answer, decision or next action easy to find. Use the shared renderer,
clear hierarchy, short lists and meaningful visuals. Preserve facts, evidence
states, sources and decisive limitations. Do not invent quantities to fill charts.

## When to use

Use reports for comparisons, multi-step plans, relationships and data-rich findings
within the authorized answer. Keep tiny answers in chat.

## When not to use

Do not use for production application UI, unrelated artwork, external service
operation or medical/clinical advice.

## Workflow

| Route                | Authorized outcome                                             | Read when selected                                                         |
| -------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Create or update     | Complete report from the same source snapshot                  | [Selection](references/selection.md), [v2 model](references/model-v2.md)   |
| Preview and continue | Stable local URL, version history, explicit revision switching | [Managed reports](references/managed-reports.md)                           |
| Present or prototype | Slides, opt-in motion or validated state simulation            | [Legacy blocks and 24 recipes](references/renderer.md)                     |
| Edit locally         | Board, flags or prompt draft with separate export              | [Editor contract](references/renderer.md#browser-state-exports-and-safety) |
| Explore styles       | Current, balanced and calm previews with identical facts       | [Presentation](references/report-contract.md#presentation-and-styles)      |
| Adopt preference     | Persist an explicitly selected style in ignored local state    | [Preference contract](references/report-contract.md#local-preference)      |

For clear intent, announce the route and proceed. For a bare invocation or options
request, show the complete inventory; options alone authorize no execution.
Choose a report automatically when it improves the authorized answer, especially
comparisons, relationships, multi-step plans or data-rich findings. Keep one fact
or a short action in chat. Do not impose an interview or a chart-count quota.

## Inputs to inspect

Inspect the reader question, authoritative sources, current model/revision, evidence
gaps, reviewed assets, repository policy and explicitly selected preferences.

### Work quickly from existing context

1. Identify the reader's question and use `--templates` to select one of eight
   purpose templates and five domain profiles. Read only the needed references,
   profile requirements and examples. Do not load an external catalog per report.
2. Inspect source authority and evidence gaps. For a continuation, read the current
   model/revision and reuse its IDs, reviewed assets and sources. Keep consumer
   source registers authoritative; do not replace them for a presentation change.
3. Lead with takeaway, decisive caveats and next action. Use bullets and meaningful
   headings. Put supplementary evidence in details; keep necessary conditions open.
4. Compose registered blocks freely. Use comparison matrices for common criteria,
   automatic diagrams for structure and data charts for quantities. Use labeled
   bundled icons and verified product logos when they clarify the content.
   Preserve units, scale, direction, nulls and status semantics.
5. Render with `scripts/render-report.mjs`. JSON v2 is canonical; v1 remains
   supported. Optional [Markdown input](references/markdown-input.md) compiles to
   the same model. Do not execute MDX or infer evidence from typography.
6. Produce HTML, full Markdown and JSON from one snapshot. Use an exclusive output
   directory or a managed store with expected-base updates. HTML remains readable
   offline without JavaScript. No per-report dependency installation or network.
7. For requested visual delivery/iteration, start the session-owned loopback preview
   and verify the actual URL. Offer the desktop browser tab and Microsoft Edge
   where available. New versions require Apply; unsaved drafts block replacement.
8. Check fidelity, relevant interactions and delivery. Use the bounded owning tests
   when changing the renderer; ordinary report content changes need only the
   relevant validation/visual checks. Report measured speed separately from model
   generation, research, cold start and first asset retrieval.

## Scripts

From the skill directory, with Node.js:

```sh
node scripts/render-report.mjs --templates
node scripts/render-report.mjs --starter comparison --profile software --id options
node scripts/render-report.mjs --input /absolute/report.md --output /absolute/new-report
node scripts/render-report.mjs --create /absolute/report-store --input /absolute/report.json
node scripts/render-report.mjs --update /absolute/report-store --input /absolute/report.json --base REVISION
node scripts/render-report.mjs --preview /absolute/report-store
node scripts/render-report.mjs --extract /absolute/report.html --section comparison
node scripts/render-report.mjs --gallery /absolute/new-gallery
```

`--current` and `--history` read a managed store. `--help` prints the full CLI.
`node --test tests/*.test.mjs` validates the skill with temporary local fixtures.
`node scripts/benchmark.mjs` measures the mixed fixture and enforces warm p95 < 1 s.
`scripts/export-assets.mjs` exports only explicitly requested, committed,
digest-pinned consumer bundles; `--check` is read-only. It does not update pinned
consumers automatically.

`scripts/cache_icon.py` fetches only an explicitly selected reviewed public asset
into an already ignored cache, with identity, source, retrieval date and digest.
Inspect it before embedding. The renderer never fetches assets. Original code is
Apache-2.0; bundled dependencies retain their [notices](assets/vendor/NOTICE.txt).
No external skill text is copied.

## Safety rules

- Unknown is not zero or absent. Planned is not delivered; fictional is not measured.
  A healthy-sample fraction is not elapsed-time availability.
- Browser filters never alter source exports. Local editor drafts never mutate
  source files or external services. Export or explicitly discard before switching.
- Motion is opt-in, stoppable and suppressed for reduced-motion preferences.
- Generation and loopback preview do not authorize deployment, upload, production
  mutations or permanent preference changes.
- Treat markup and SVG as untrusted. Reject unsupported input with its field/line;
  never delete data or fabricate values just to pass validation.
- If a source or logo is unavailable, mark the gap and retain the readable name.
  If a stale update fails, inspect the new current model and reconcile deliberately.
- Keep caches, preferences, private sources and report stores out of commits.
  No clinical, WCAG-compliance or universal host-compatibility claims from fixtures.

## Output format

Deliver the verified preview/opening route plus standalone HTML and complete
exports. State significant source gaps and actual verification limits. If files
changed, include a concise verified affected-file tree with added/changed/moved/
deleted/context labels and maintained/generated/local ownership as described in
[filesystem handoff](references/filesystem-handoff.md).

## Completion criteria

Confirm source fidelity, visible caveats, full exports and the actual opening route.
Record unrun gates without implying they passed.

## Failure modes

Reject invalid input with field/line diagnostics. Reconcile stale bases before
retrying. Preserve unsaved drafts and report blocked preview routes explicitly.

## References

The [general report contract](references/report-contract.md) governs source
fidelity and reader presentation. [Comparisons](references/comparisons.md) adds
shared-criteria and evidence rules; [selection provenance](references/selection.md)
records independent mdxcn-inspired choices and upstream references.
