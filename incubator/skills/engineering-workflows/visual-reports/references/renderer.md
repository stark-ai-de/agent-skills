# Shared renderer, decisions and coverage

This reference owns the runnable model/API, recipe coverage and implementation
checks for PR #156. The [report contract](report-contract.md) remains canonical
for general content, evidence, presentation and delivery rules. The starter and
legacy configurator remain compatibility assets, not a second report renderer.

## Confirmed decisions and precedence

| Decision | Implementation consequence |
| --- | --- |
| General visual-report skill | Preserve lookup, decide, execute, understand/retain; not only product comparisons. |
| Comparison first | Shared criteria/option matrix and aligned numeric charts are visible immediately; filters refine an existing comparison. No mandatory product-detail navigation or universal four-option cap. |
| 6A: following agents read and evaluate | Complete source mapping and targeted extraction; no mandatory edit/write-back roundtrip. |
| 7A: HTML + complete Markdown + JSON | One normalized current snapshot drives all outputs; JSON is embedded in standalone HTML. Filters never prune exports. |
| 9A: agent selects and combines | Choose blocks/recipes from the task without a compulsory interview; ask only about material ambiguity. |
| 10A: runnable implementation and tests | Code, 24 working recipe examples and executable tests belong in this PR, not only a specification. |
| 11A: blocks + optional recipes | One renderer implements technical blocks. Recipes combine them; consumer profiles supply criteria/checks, not invented facts or another renderer. |
| 12B: all 24 use cases in this PR | Includes presentation, motion, state prototypes and local triage/flag/prompt editors; expands the initial report-only boundary. |
| 13A: selective reviewed reuse | File-level provenance/license review before reuse; the current implementation is original code, with no imported upstream instructions, fonts or templates. |
| 14A: current full state + original | Edited HTML/Markdown/JSON contain the complete current state, including static HTML; retain a separate original and mark user edits without re-verifying evidence. |
| 15A: helpful explanatory motion | The agent may offer motion for explanations, not just explicit prototypes. Click-start only; static explanation remains. |
| 16A: explicit presentations start with slides | Set `presentation: "slides"` for presentation requests. Reading toggle and complete no-JavaScript view remain. Ordinary reports stay reading-first. |

Earlier discussion comments and local evaluation suggestions are historical.
The confirmed 11A/12B/13A decisions fix architecture, full scope and reuse; 14A–16A
supersede the old separate-draft-only export, explicit-prototype-only motion and
opt-in-only presentation start. They do not approve every earlier visual detail.
The quiet Graphite Grain direction wins over prior glass/emissive card experiments.
Updating this branch does not authorize merge, public admission, plugin inclusion,
release, deployments, external writes or permanent preference changes.

## Architecture and ownership

```text
Consumer authoritative sources + evidence + source-to-model adapter
                         |
                normalized report model v1
                         |
          optional domain checks / recipe composition
                         |
          one shared renderer / validated blocks
                         |
       standalone HTML + full Markdown + complete JSON
       full JSON embedded; static content already rendered
                         |
          browser-only filters/styles/slides/motion/editors
                         |
       current HTML + Markdown + JSON, explicit downloads
       editing.original retained separately from current fields
```

Consumers own facts, source reconciliation, genuine reviewed assets and adapters.
They must not fork the shared renderer for every report. Existing models can be
adapted without replacing authoritative registers. A theme-only change does not
authorize rewriting source schemas. `assets/report-recipes.mjs` exports the finite
catalog and `exampleReport(id)`; examples are explicitly fictional starting models.
Use the selected composition or combine registered blocks directly. Domain checks
run in the consumer before rendering; they may require currency, period, scope or
evidence dates, but must not supply made-up values, weights or universal scores.

`assets/report-state.mjs` is the shared pure working-state/Markdown implementation.
The Node renderer imports it. Its owned, import-free code is also embedded in the
browser runtime after removing ESM export keywords; no source data becomes code.
The existing renderer still owns templates. Browser HTML export serializes its
owned DOM, restores a complete static view and materializes bounded editor fields;
it is not a second template engine or a general-purpose HTML importer.

## Run locally

Use the repository-supported Node runtime from the skill directory. The renderer
performs no package installation or network request. Output directories must be
new; existing destinations are refused.

```sh
# 24 examples with HTML, Markdown, JSON and a gallery index.
node scripts/render-report.mjs --gallery /absolute/new-gallery

# New output from a consumer-produced model or reviewed working snapshot.
node scripts/render-report.mjs --input /absolute/report.json --output /absolute/new-report

# Read full current snapshot or one section without executing page JavaScript.
node scripts/render-report.mjs --extract /absolute/report.html
node scripts/render-report.mjs --extract /absolute/report.html --section comparison

node --test tests/*.test.mjs
# Optional: installed Playwright Python and Chromium, no installation performed.
python tests/browser-smoke.py /absolute/new-gallery /absolute/chromium
```

`renderReport(model)` returns `{ html, markdown, json }` without writing files.
`writeReport(model, newDirectory)` explicitly writes three files, plus
`<id>.original.json` when the model contains an editing revision.
`validateReport(model)` rejects invalid source structures and revision metadata.
`extractReport(html)` reads and validates only the inert `script#report-data`.
The shared state module exports `workingReport(source, draft)`,
`originalReport(report)`, `validateRevision(report)`, `editNotice(report)` and
`stateMarkdown(report)`. None write files or execute report content.

No CLI command starts a server, publishes, fetches assets, installs dependencies
or adopts preferences. Failure can leave an incomplete new directory; remove only
your own failed output before retrying. Never overwrite authoritative sources to
repair an export. Downloads depend on the reader's browser; separate explicit
buttons avoid requiring browser permission for a burst of multiple downloads.

## Report model v1

Required fields: `schemaVersion: 1`, stable `id`, `title`, `goal`, `takeaway`,
`criticalCaveats`, `sources`, `sections`. `style` is `current`, `balanced` or `calm`.
`goal` is `lookup`, `decide`, `execute` or `understand`. Optional `presentation` is
`reading` or `slides`; the latter requires a slides block and explicit presentation
intent. It is not inferred merely from a report containing supporting slides.

IDs start with a lowercase ASCII letter and contain lowercase letters, digits and
hyphens. Duplicate source/section IDs fail. Extension fields survive JSON and the
full Markdown field index; decisive conditions still belong in visible caveats,
not merely in an extension field. Inputs are JSON-compatible model data.

Sources have `id`, `label`, `state`, optional `url` and `asOf`. HTTP(S) source links
without embedded credentials are accepted; the author, not structural validation,
verifies their truth, freshness and licensing. Sections have `id`, `kind`, `title`,
`sourceIds`, `caveats`, `data`; references to unknown sources fail validation.

| Block | Data and behavior |
| --- | --- |
| `text` | `paragraphs: string[]`; escaped prose, not executable Markdown/HTML. |
| `comparison` | `options: [{id,label,note}]`, `criteria: [{id,label,unit,context,direction,values}]`; each cell has `value,state,note,sourceIds`, and every criterion includes every option. Common per-criterion numeric ranges include zero; unknown values remain null with dashed marks. |
| `table` | `columns: [{id,label}]`, `rows: [{id,cells}]`; each row supplies exactly the declared scalar/null cells. Static rows, search and numeric/text sorting. |
| `code` | `blocks: [{label,code,notes}]`; adjacent escaped code and annotations; never executed. |
| `diff` | `before,after,notes`; labeled before/after with non-color change cues, not a patch parser or review-comment service. |
| `graph` | `nodes: [{id,label,x,y}]`, `edges: [{from,to,label}]`; SVG plus equivalent readable nodes/edges. Coordinates are editorial layout, not measurements. No CDN or automatic graph-layout solver. |
| `timeline` | `tasks: [{id,label,owner,start,end,progress}]`, `dependencies: [{from,to}]`; validated ISO dates, shared dated scale, milestones and readable dependencies. Not a scheduling solver. |
| `steps` | `items: [{label,action,success,recovery}]`; success and failure/recovery conditions stay visible. |
| `metrics` | `items: [{label,value,unit,context,state}]`; scoped facts, explicit unknowns, no invented score. |
| `figure` | `src,alt,caption`; reviewed embedded PNG/JPEG/WebP. Reject arbitrary downloaded SVG/HTML and remote image loading; owned diagrams use `graph`. |
| `variants` | `items: [{label,text,status,tone,progress}]`; neutral/mint/gold variants, textual status and numeric progress. |
| `motion` | `distance,duration,easing`; click-start, pause/resume, reset, temporary duration/easing controls, static endpoint and reduced-motion suppression. |
| `prototype` | `states,initial,transitions: [{from,to,label}]`; validated local transitions/reset, no external effects. |
| `slides` | `slides: [{id,title,text,caveats}]`; slides-first only with explicit `presentation: "slides"`, reading toggle, previous/next, arrows/Escape. NoJS/print includes all slides. |
| `board` | `columns: string[]`, `cards: [{id,label,column,priority,description}]`; local drag-and-drop with keyboard-accessible column selector. |
| `flags` | `flags: [{id,label,scope,enabled,rollout}]`; local boolean/rollout edits, no flag-service connection. |
| `prompt` | `system,user,temperature,maxTokens`; local request preview and edits. No model call, fake generated answer or credential field. |
| `fileTree` | `entries: [{path,status,role,from?}]`; added/changed/moved/deleted/context labels, source/generated/cache roles and prior path for moves. |

Evidence states remain `measured`, `documented`, `partial`, `absent`, `unknown`,
`planned`, `assumed`, `editorial`, `fictional`. Unknown numbers are null, not zero.
Source coverage, plans and estimated quality are not interchangeable. Structural
validation cannot prove semantic comparability; authors must supply compatible
units, contexts, versions and denominators. User-edit provenance is separate from
these source states and never upgrades them.

Markdown is a complete unfiltered, labeled field index, not an independently
maintained executive summary. It includes source refs, code, data, caveats and
extensions. HTML exposes current Markdown/JSON and original snapshots in native
details without JS; decision-changing conditions are never confined there.

## Browser state, exports and safety

### Current state and immutable original

Filters, sorting, current slide and prototype state are view-only. They do not
remove or mutate report facts. Temporary motion-control settings are preview
parameters, not editor changes. Style changes affect presentation, not evidence,
and do not persist `.cache/show-html/preferences.json` without explicit adoption.

The supported content editors change board-card columns, flag booleans/rollout,
and prompt text/parameters. They cannot rewrite source IDs, source evidence,
critical caveats, non-editor fields, or add/remove/reorder sections and records.
`workingReport` computes a deterministic field diff against one immutable original.
Example shape (schema illustration, not report evidence):

```json
{
  "editing": {
    "version": 1,
    "kind": "user-edit",
    "original": { "schemaVersion": 1, "...": "complete original report model" },
    "changes": [{
      "sectionId": "prompt", "targetId": "prompt", "field": "user",
      "before": "Original instruction", "after": "Edited instruction",
      "state": "user-edited", "sourceIds": ["demo"]
    }]
  }
}
```

Actual `editing.original` must be the complete valid original model, without a
nested editing envelope. Reopening/re-editing retains that same baseline, not a
recursive chain. Changes must exactly match the allowed-field diff; forged
metadata, invalid values and source/caveat rewrites are rejected. Restoring all
content to the original removes the empty revision. No fabricated audit timestamp,
verified identity or tamper-proof historical log is claimed.

Current fields remain the normal top-level report. The original remains separately
under `editing.original`, in the readable original ledger and through the explicit
original-JSON download. Node directory output also writes `<id>.original.json`.
Original source records remain unchanged; global and section notices make clear
that their original evidence does not verify user-edited values.

### Export controls and static serialization

- `#export-json`: full current JSON, including any separate original and change list.
- `#export-md`: full current Markdown plus clearly separated original field index.
- `#export-draft`: current standalone HTML (the legacy element ID is retained, but its old draft-JSON behavior is deliberately replaced).
- `#export-original`: unmodified baseline JSON, named `<id>.original.json`.
- `#export-settings`: explicitly chosen presentation settings, not persistent adoption.

Live inert JSON/readable ledgers reflect current valid edits. Invalid numeric
input blocks current-state downloads rather than silently returning stale values.
Browser HTML export clones only the owned page and restores unfiltered tables,
comparison options, all slides and initial prototype/motion states. It materializes
board positions, selected/checked/value attributes and textarea text from current
data, refreshes JSON/Markdown/original ledgers and retains the exact hashed runtime.
Thus static/noJS exported HTML is current, not old markup with only new script data.
On reopening an explicit presentation, the runtime starts at slide one; motion
never starts automatically. NoJS always has the complete reading representation.

Editors are in-tab drafts only. Closing without download loses edits; no automatic
persistence, collaboration, authentication, repository writes, flag-service changes
or model requests exist. A reviewed working model can be rendered again explicitly;
this is not a compulsory following-agent write-back workflow under 6A.

Source text is escaped and JSON end-tag characters encoded. CSP allows only the
exact owned executable runtime hash and denies network connections, remote assets,
forms, plugins and base changes. No eval, dynamic source compilation or runtime
import. The shared state code contains no external imports. Browser serialization
is limited to generated reports; do not use it to import untrusted arbitrary HTML.
CSP/escaping are defense in depth, not a claim of a complete security audit.

The existing `assets/graphite-grain/` configurator retains its ten controls and
A/B export workflow, with its documented DOM/font/base-report prerequisites. It is
not silently wired to arbitrary renderer output. `report-shell.html` remains an
independent small starter; new data reports use the shared renderer and presets.

## All 24 reference use cases

Pinned reference catalog:
[Show-HTML at 67b01f7](https://github.com/GoDiao/show-html/blob/67b01f7a219a4fa76bd1c2232adb8c7dca95d51c/show-html/SKILL.md).
These are coverage identifiers, not imported implementation paths. Each row has a
working original model, Node renderer test and content-loaded browser route.
Coverage means the described behavior through shared components, not full upstream
feature/pixel parity or a complete upstream code/license audit.

| Upstream | Recipe | Composition | Acceptance focus |
| --- | --- | --- | --- |
| 01 | r01 | comparison + code | Shared criteria/aligned values; filters retain complete exports. |
| 02 | r02 | variants + comparison | Equivalent content, restrained alternatives, joint comparison. |
| 03 | r03 | diff + table + fileTree | Before/after, findings, affected paths and roles. |
| 04 | r04 | code + graph | Escaped code, annotations and readable data flow. |
| 05 | r05 | table + variants | Tokens, font fallback and consistent variants. |
| 06 | r06 | variants + table | Same content/progress, separate status and visual tone. |
| 07 | r07 | motion + text | Click-start, pause/reset, reduced motion and static explanation. |
| 08 | r08 | prototype | Valid transitions, impossible actions disabled, reset. |
| 09 | r09 | slides | Explicit slides-first, manual navigation, reading toggle, noJS all slides. |
| 10 | r10 | graph + text | Original SVG illustration, labels and equivalent text. |
| 11 | r11 | metrics + steps | Denominators, unknowns, actions and recovery. |
| 12 | r12 | timeline + text + steps | Chronology, impact/uncertainty, follow-up. |
| 13 | r13 | graph | Decision branches including unknown/failure route. |
| 14 | r14 | graph + text | Feature explanation with visible limitations. |
| 15 | r15 | graph + text + steps | Worked explanation/optional recall, no efficacy claim. |
| 16 | r16 | timeline + steps | Phases, dependencies, success and recovery. |
| 17 | r17 | diff + fileTree + steps | Why/what changed, files, reviewer/test guidance. |
| 18 | r18 | board | Local triage and keyboard alternative; current trio + original export. |
| 19 | r19 | flags | Local toggles/rollout and current export; no production action. |
| 20 | r20 | prompt | Safe current text/parameter export, source provenance; no model execution. |
| 21 | r21 | metrics + comparison + table | Scoped dashboard with joint criteria, not card sprawl. |
| 22 | r22 | table | Static rows, search, numeric sort, unfiltered exports. |
| 23 | r23 | graph + table | Topology/inventory, no runtime dependency. |
| 24 | r24 | timeline + table | Shared dates, progress, milestones and dependencies. |

## Verification and limits

`tests/render-report.test.mjs` retains the 24-recipe checks and negative model,
source, unknown-value, markup/URL, raster, deterministic-output, extraction and
write-refusal cases. The raster fixture is not product evidence.
`tests/report-state.test.mjs` adds current/original consistency for all three
editors, revision/reversion, rejected evidence rewrites, invalid/forged revisions,
static exports, script breakout, CSP hash agreement and presentation intent.

`tests/export-assets.test.mjs` uses isolated committed Git fixtures: bundle digests,
read-only verification, included shared state, offline renderer execution, dirty
source refusal and source/symlink redirection. It never stages user-repository
files. Fixture licenses/absent legacy placeholders are explicitly synthetic, not
actual-release evidence. The real exporter requires a committed state module.

`tests/browser-smoke.py` exercises 24 examples at 1440px and 390px with all three
styles, current exports/reopening and noJS reading. Additional scenarios cover
comparison/table filtering, mixed blocks plus edits, state transitions, slides-first
versus normal reading-first, keyboard navigation, all editor formats, separate
originals, repeated edits, invalid-input blocking, hostile text and motion pause,
reset/reduced-motion/no-autoplay. It verifies serialized CSP hashes and records/
blocks HTTP(S) requests. It only uses installed Playwright/Chromium and temporary
local test outputs; it does not install dependencies or open a server.

Local qualification for the 14A–16A update: Node 22.16.0, installed Chromium through
Playwright. This is below the repository's Node >=24.18.0 requirement. The scoped
checks do not establish supported-runtime, full-repository/catalog/formatter or
hosted-CI qualification. Browser tests use `set_content`, not a verified file://,
HTTP/proxy or Windows delivery route. Test the actual handoff route separately.

These are bounded regression checks, not exhaustive coverage, production-editor
readiness, full accessibility, cross-browser qualification, user-comprehension or
ADHD-effectiveness evidence. Keep unrun gates and upstream license checks explicit.
