# Shared renderer, decisions and coverage

This reference preserves the version 1 API and 24 technical recipes. For the
current additions, use [model v2](model-v2.md), [Markdown input](markdown-input.md)
and [managed reports](managed-reports.md). The general
[report contract](report-contract.md) remains authoritative for content, evidence,
presentation and delivery. This file owns the model/API, recipe coverage and
implementation-specific checks; it does not redefine the general rules.

## Confirmed decisions and precedence

| Decision                                      | Implementation consequence                                                                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General visual-report skill                   | Preserve lookup, decide, execute, understand/retain; not only product comparisons.                                                                                                                                                                            |
| Comparison first                              | Shared criteria/option matrix and aligned numeric charts are visible immediately; filters refine an existing comparison. No mandatory product-detail navigation or four-option cap.                                                                           |
| 6A: following agents read and evaluate        | Complete source mapping and targeted extraction; a mandatory edit/write-back roundtrip is not imposed.                                                                                                                                                        |
| 7A: HTML + complete Markdown + JSON           | One normalized data snapshot drives all outputs; JSON is also embedded in standalone HTML. Filters do not change exports.                                                                                                                                     |
| 9A: agent selects and combines                | Choose blocks/recipes from the task without a compulsory interview. Ask only about material ambiguity.                                                                                                                                                        |
| 10A: runnable implementation and tests        | This PR includes code, 24 recipe examples and executable tests, not only a specification or comment.                                                                                                                                                          |
| 11A: blocks + optional recipes                | One renderer implements the technical blocks. Recipes only combine them; optional consumer domain profiles supply criteria and validation rules, not invented facts or a second renderer.                                                                     |
| 12B: all 24 use cases in this PR              | Includes presentation, motion, state prototypes, triage, feature flags and prompt editing. This deliberately expands the original report-only boundary.                                                                                                       |
| 13A: selective, reviewed code reuse           | Reuse requires file-level provenance/license review and integration into common blocks. Report blocks and instructions are original. Pinned generator dependencies and selected Lucide icons are bundled with full notices; no external skill text is copied. |
| 14A: current state plus original              | HTML, Markdown and JSON export the same working state; retain one original snapshot and label field-level user edits without re-verifying evidence.                                                                                                           |
| 15A: helpful explanatory motion               | Motion may be offered for explanations; it starts on click, can pause/resume/reset, respects reduced motion and keeps a static explanation.                                                                                                                   |
| 16A: explicit presentations start with slides | Presentation requests set `presentation: "slides"`; the reading toggle and complete no-JavaScript view remain available. Ordinary reports stay reading-first.                                                                                                 |

The October 19 discussion comments are historical decision records, not another
maintained specification. The later 11A/12B/13A answers supersede their unresolved
three-way scope discussion. They do not turn every earlier evaluation suggestion
into an approved design detail. Earlier Obsidian Glass/emissive card experiments
are not defaults for Graphite Grain reports. The quiet, card-free report direction
wins; motion remains optional and explanatory, never decorative autoplay.

For guided tabbed reading, the later
[layout and navigation contract](report-contract.md#guided-layout-and-navigation)
supersedes fixed-height panels, inner tab scrollbars, separated active tab/panel
surfaces and redundant large Back/Next controls. A functional connected tab outline
is compatible with quiet reports. Standalone wide comparisons/trees keep their
scoped horizontal-scroll option; explicit slide presentations and the optional
configurator remain distinct modes. This instruction update does not add a tab
block to the model/API or claim those modes share one navigation implementation.

The accepted October 20 completion plan authorizes public preparation, plugin
inclusion and local installation. It does not authorize push, merge, publication,
deployment, external writes or permanent preference changes.

## Architecture and ownership

```text
Consumer's authoritative sources + evidence + source-to-model adapter
                         |
                normalized report model v1
                         |
    optional domain checks + optional recipe composition
                         |
        one shared renderer / validated technical blocks
                         |
         +---------------+----------------+
         |               |                |
    standalone HTML   complete Markdown   JSON
    + full JSON       field index         same current state
         |
    browser-only enhancements
    filters / styles / presentation / explicit motion / local editors
         |
    current exports plus separate immutable original snapshot
```

The consumer owns facts, source reconciliation and genuine reviewed assets. It
may retain its source adapter, but must not fork the shared renderer for each
report. Existing consumer models can be adapted without replacing their source
registers. A theme-only change does not authorize rewriting their data model.

`assets/report-recipes.mjs` exports a finite catalog and `exampleReport(id)`.
Examples are deliberately fictional starting models, not product datasets.
An agent can use a recipe's block composition or combine any registered blocks
directly. Domain checks run in the consumer before `renderReport`; a profile can
require cost period/currency/scope or evidence dates, but must not supply made-up
values, weights or a universal score.

## Run locally

Run these commands from the skill directory with the repository-supported Node
runtime. No package install, network access or build step is performed by the
renderer. Output directories must be new; the CLI refuses existing destinations.

```sh
# Generate 24 examples and an index: 24 × (HTML + Markdown + JSON) + index.
node scripts/render-report.mjs --gallery /absolute/new-gallery

# Generate a real report from a consumer-produced model.
node scripts/render-report.mjs --input /absolute/report.json --output /absolute/new-report

# Read the snapshot from a single forwarded HTML without executing its JavaScript.
node scripts/render-report.mjs --extract /absolute/report.html
node scripts/render-report.mjs --extract /absolute/report.html --section comparison

# Pure model / rendering tests; no source writes.
node --test tests/*.test.mjs

# Optional browser checks with an already installed Playwright and Chromium.
python tests/browser-smoke.py /absolute/new-gallery /absolute/chromium
```

`renderReport(model)` returns `{ html, markdown, json }` without writing files.
`writeReport(model, newDirectory)` explicitly creates a directory and three files.
`validateReport(model)` checks the versioned contract and rejects invalid input.
`extractReport(html)` reads and validates only the inert JSON snapshot.

The gallery writes examples and an HTML index; no server is started. The normal
report command writes only the named destination. Neither command publishes,
fetches assets, installs a dependency or persists browser preferences. Generation
failure can leave an incomplete new output directory; remove only your own failed
output before retrying. Never overwrite a source file to repair an export.

## Report model v1

Required top-level fields are `schemaVersion: 1`, stable `id`, `title`, `goal`,
`takeaway`, `criticalCaveats`, `sources`, and `sections`. `style` accepts `current`,
`balanced` or `calm`. IDs start with a lowercase ASCII letter and contain only
lowercase letters, digits and hyphens. Duplicate source/section IDs are rejected.
Unknown extension fields survive the JSON and full Markdown field index; do not
hide decisive conditions in an extension field instead of visible caveats.

Each source has `id`, `label`, `state`, optional `url` and `asOf`. Only HTTP(S)
source links without embedded credentials are accepted. The renderer does not
verify the truth, freshness or licensing of a link; the author must do that.
Each section has `id`, `kind`, `title`, `sourceIds`, `caveats`, and `data`. Known
source references are validated. Critical caveats are visible beside conclusions.

| Block        | `data` structure and behavior                                                                                                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`       | `paragraphs: string[]`; escaped prose, not executable Markdown/HTML.                                                                                                                                                                                                                     |
| `comparison` | `options: [{id,label,note}]`, `criteria: [{id,label,unit,context,direction,values}]`; one explicit cell per option/criterion. Each cell has `value`, `state`, `note`, `sourceIds`. Numeric axes share a range per criterion and include zero; unknown values are null with dashed marks. |
| `table`      | `columns: [{id,label}]`, `rows: [{id,cells}]`; every row supplies exactly the declared scalar/null cells. Static rows exist before JavaScript; optional search and numeric/text sorting.                                                                                                 |
| `code`       | `blocks: [{label,code,notes}]`; adjacent escaped code and explanations. No code execution.                                                                                                                                                                                               |
| `diff`       | `before`, `after`, `notes`; labeled before/after code with non-color change cues. This is not a patch parser or inline comment service.                                                                                                                                                  |
| `graph`      | `nodes: [{id,label,x,y}]`, `edges: [{from,to,label}]`; generated SVG plus equivalent readable node/edge text. Coordinates are editorial layout, not measurements. No Mermaid/CDN dependency or automatic graph layout.                                                                   |
| `timeline`   | `tasks: [{id,label,owner,start,end,progress}]`, `dependencies: [{from,to}]`; ISO calendar dates or exact UTC timestamps on one shared axis, milestone label and textual dependencies. Do not mix precisions. V2 allows unknown `progress: null`. Not a scheduling solver.                |
| `steps`      | `items: [{label,action,success,recovery}]`; required success and failure/recovery conditions remain visible.                                                                                                                                                                             |
| `metrics`    | `items: [{label,value,unit,context,state}]`; scoped facts, explicit unknown values, no invented score.                                                                                                                                                                                   |
| `figure`     | `src`, `alt`, `caption`; reviewed embedded PNG/JPEG/WebP only. Arbitrary downloaded SVG/HTML and remote image loading are rejected; generated diagrams use `graph`.                                                                                                                      |
| `variants`   | `items: [{label,text,status,tone,progress}]`; restrained neutral/mint/gold variants, independent textual status and numeric progress.                                                                                                                                                    |
| `motion`     | `distance`, `duration`, `easing`; play/stop and temporary duration/easing controls, static endpoint, no autoplay, reduced-motion suppression.                                                                                                                                            |
| `prototype`  | `states`, `initial`, `transitions: [{from,to,label}]`; local validated state transitions and reset. No external effects.                                                                                                                                                                 |
| `slides`     | `slides: [{id,title,text,caveats}]`; full reading view plus opt-in presentation, previous/next, arrow keys and Escape. Print restores all slides.                                                                                                                                        |
| `board`      | `columns: string[]`, `cards: [{id,label,column,priority,description}]`; browser-local drag-and-drop plus keyboard-accessible column selector.                                                                                                                                            |
| `flags`      | `flags: [{id,label,scope,enabled,rollout}]`; local boolean/rollout edits, no feature-flag service connection.                                                                                                                                                                            |
| `prompt`     | `system`, `user`, `temperature`, `maxTokens`; live request preview and local edits. No model request, fake generated answer or credential field.                                                                                                                                         |
| `fileTree`   | `entries: [{path,status,role,from?}]`; added/changed/moved/deleted/context labels, source/generated/cache roles and prior path for moves.                                                                                                                                                |

Evidence states are `measured`, `documented`, `partial`, `absent`, `unknown`,
`planned`, `assumed`, `editorial`, `fictional`. Unknown numerical values are null,
never zero. Documented coverage, plans and estimated quality are not interchangeable.
The runtime validates structure, not semantic comparability; the author must
supply genuinely comparable units, contexts, versions and denominators.

The Markdown output is an unfiltered, labeled field index of the complete model,
including source references, code, data, caveats and extensions. It is not a
separately edited executive summary. HTML exposes readable Markdown/JSON in native
details even without JavaScript; critical report content is never confined there.

## Browser state, exports and safety

HTML, Markdown and JSON downloads always describe the same complete working state.
UI filtering, sorting and presentation do not remove facts. User edits carry
field-level `user-edited` provenance and retain one immutable original snapshot;
edits never inherit source evidence as proof of the change. Invalid editor input
blocks current-state downloads. The original JSON remains separately available.
Node writes an `.original.json` beside edited reports; managed revisions preserve
the original metadata in their revision JSON.

Local editor changes live only in the current tab and disappear when it closes
unless explicitly exported. Exported HTML materializes the current bounded editor
fields, retains the embedded current model and readable ledgers, and reopens as a
complete static report without JavaScript. There is no automatic persistence,
collaboration, authentication or production backend. Browser editor scope is
separate from 6A's read/evaluate agent workflow. Style changes use a single
document and preserve content/focus; the settings download is a proposed
preference, not an automatic write to `.cache/show-html/preferences.json`.

Source text is escaped; JSON script-breakout characters are encoded. The generated
page has a CSP restricting script execution to the exact bundled runtime hash,
denying network connections, remote resources, forms, plugins and base changes.
There is no eval, dynamic source-code compilation or runtime import. Only trusted
owned CSS/runtime is inlined. CSP and escaping are defense in depth, not a claim
that every browser or consumer wrapper has been audited.

The managed preview bridge detects unsaved editor/style changes and blocks Apply
after a newer revision until explicit discard. It captures and restores scroll
position and expanded details while remaining an offline local reader.

`assets/graphite-grain/` remains the existing optional DOM-specific configurator
with its ten controls and A/B/standalone export workflow. It is not silently wired
to arbitrary new renderer HTML. Its documented DOM/font/base-report preconditions
still apply. `assets/report-shell.html` remains a smaller independent starter,
not the source-data renderer. Both are retained for compatibility; new generated
reports use this shared renderer and its three presets by default.

## All 24 reference use cases

The pinned reference catalog is
[Show-HTML at 67b01f7](https://github.com/GoDiao/show-html/blob/67b01f7a219a4fa76bd1c2232adb8c7dca95d51c/show-html/SKILL.md).
Numbers below are coverage identifiers, not imported implementation paths.
Every row has a runnable original model, renderer test and browser smoke route.
Coverage means the described use case works through our components, not pixel or
feature parity with every upstream page or a full upstream code/license audit.

| Upstream | Recipe | Composition                  | Interaction / acceptance focus                                        |
| -------- | ------ | ---------------------------- | --------------------------------------------------------------------- |
| 01       | r01    | comparison + code            | Shared criteria, aligned values, filters retain complete exports.     |
| 02       | r02    | variants + comparison        | Equivalent content, restrained alternatives, joint comparison.        |
| 03       | r03    | diff + table + fileTree      | Labeled before/after, findings, affected paths and roles.             |
| 04       | r04    | code + graph                 | Escaped code, annotations and readable data-flow relationships.       |
| 05       | r05    | table + variants             | Tokens, font fallback and consistent variants.                        |
| 06       | r06    | variants + table             | Same content/progress, independent status and visual tone.            |
| 07       | r07    | motion + text                | No autoplay; play/stop; reduced motion; static explanation.           |
| 08       | r08    | prototype                    | Valid transitions, disabled impossible actions, reset.                |
| 09       | r09    | slides                       | Complete initial view, opt-in navigation, keyboard exit.              |
| 10       | r10    | graph + text                 | Original SVG illustration, labels and equivalent text.                |
| 11       | r11    | metrics + steps              | Denominators, unknowns, next actions and recovery.                    |
| 12       | r12    | timeline + text + steps      | Chronology, impact/uncertainty and follow-up.                         |
| 13       | r13    | graph                        | Decision branches including unknown/failure route.                    |
| 14       | r14    | graph + text                 | Feature explanation with visible limitations.                         |
| 15       | r15    | graph + text + steps         | Worked explanation and optional recall prompt, no efficacy claim.     |
| 16       | r16    | timeline + steps             | Phases, dependencies, observable success and recovery.                |
| 17       | r17    | diff + fileTree + steps      | Why/what changed, affected files, reviewer/test guidance.             |
| 18       | r18    | board                        | Local triage editing, keyboard alternative and separate draft export. |
| 19       | r19    | flags                        | Local toggles/rollout; no external production action.                 |
| 20       | r20    | prompt                       | Safe live request preview; no model execution.                        |
| 21       | r21    | metrics + comparison + table | Scoped dashboard and jointly visible criteria, not card sprawl.       |
| 22       | r22    | table                        | Initial static tbody, search, numeric sort and unchanged exports.     |
| 23       | r23    | graph + table                | Labeled topology plus inventory, no runtime dependency.               |
| 24       | r24    | timeline + table             | Shared dates, progress, milestones and explicit dependencies.         |

## Verification and limits

`tests/render-report.test.mjs` exercises every recipe plus model failures,
source IDs, unknown values, unsafe markup/URLs, deterministic rendering, embedded
JSON extraction, all styles, raster acceptance/rejection, explicit writes and
existing-destination refusal. The raster fixture is a test image, not a product
screenshot. The renderer tests use only Node built-ins and the shared runtime assets.
`tests/export-assets.test.mjs` additionally builds isolated local Git fixtures to
check committed bundle digests, read-only verification, offline execution, dirty
source refusal, source-directory exclusion and symlink redirection. It neither
stages nor modifies files in the real source repository. Fixture licenses are
explicit test placeholders, not distributed licenses or actual-release evidence.

`tests/browser-smoke.py` checks all 24 examples, all three styles, 390px page
containment, no-JS reading, immutable downloads, comparison filtering, table
sorting, state transitions, presentation keyboard navigation, local editor
exports, escaping and reduced-motion handling. It blocks and records HTTP(S)
requests. It uses already installed tooling and does not install anything.

The current local run used Node 22.16.0 and an already installed system Chromium
controlled through Playwright; 35 Node tests and all 24 browser routes passed. Repository engines require a newer
Node runtime, so this is not a supported-runtime/full-repository CI qualification.
The browser test loads HTML content directly. The environment blocked file URL
navigation; no successful file://, named proxy, Windows or HTTP delivery route is
claimed. A consumer must test the actual route it hands to a reader.

These are bounded regression checks, not exhaustive testing, full accessibility
conformance, usability/ADHD effectiveness, cross-browser qualification, upstream
license approval or production-editor readiness. Hosted CI and repository-level
gates remain separate. Do not label an unrun gate as passed.
