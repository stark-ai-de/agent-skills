# Visual report contract

This is the canonical general requirement set for the skill. The runnable
shared renderer, model/API, all 24 optional recipes and implementation-specific
checks are documented in [renderer.md](renderer.md). The independent starter shell
and DOM-specific configurator remain compatibility assets, not another renderer.

## Content and reader goal

Optimize for correct answers and actions rather than minimum word count. Use
concise language and explain unfamiliar terms near first use. Prefer explanatory
graphics, tables and compact structured text. A graphic must clarify a relationship;
decorative icons alone are not an explanation. Do not force a chart for one fact or
fabricate quantities to fill it.

| Reader goal           | Structure                                                                |
| --------------------- | ------------------------------------------------------------------------ |
| Look up               | Direct answer, meaningful section labels, sources                        |
| Decide                | Comparable alternatives, shared criteria, recommendation with conditions |
| Execute               | Prerequisites, action, observable success, recovery action               |
| Understand and retain | Guiding question, worked example, optional recall question               |

Use [Reader experience](#reader-experience) for intent, summary/action status,
guided reading, useful links, duplication checks and requested ADHD writing.
Lead with the takeaway or a real next action; a summary needs no invented task.
Headings should answer reader
questions. Decisive caveats, eligibility conditions and necessary steps stay beside
the related conclusion or action, not only in tooltips, closed details, another tab
or an export. Optional evidence may be collapsed; first consider whether an open,
well-structured section is simpler. Arbitrary word/bullet limits must not delete
required information. Keep labels, units and limitations near the corresponding
values and provide accessible explanations of graphics.

For comparisons, the initial report shows multiple options and their common
criteria together. Use aligned numeric charts with common per-criterion scales
and a matrix for qualitative facts. Filters refine this visible comparison; they
do not replace it with a long product entry list or require opening individual
details. There is no universal four-option cap. On narrow screens, keep a labeled,
horizontally scrollable comparison surface for a standalone wide comparison.
This is not a rule for guided tab titles or tab content; follow
[guided layout and navigation](#guided-layout-and-navigation) there. Ordinary
vertical page scrolling is allowed. Product data is retained: decision-relevant
values, conditions and limitations belong on the joint surface, with deeper
evidence still accessible.

### Focus and orientation

Keep current selection, filters and location recognizable. Use stable anchors and
an optional resume marker only when useful. A reading marker is not evidence of
comprehension. Do not auto-rotate content, scroll unexpectedly or add timed reading
prompts. Preserve focus and reader-controlled state during style changes.

Guidance and learning questions are optional, without a required quiz or setup.
Keep customization small and progressively disclosed. Grain, dark mode, density
and font size are adjustable preferences, not a universal ADHD layout. Do not
default to word-part bolding or claim therapeutic/reading-speed benefits. Applying
cognitive-accessibility patterns does not establish WCAG or ADHD effectiveness.
The agent may offer motion when it helps explain a relationship, including outside
an explicit motion-prototype request. It starts only after a deliberate click,
can be paused/reset, respects reduced motion and never replaces the static
explanation. Opening, exporting or reopening a report is not permission to play.
No decorative autoplay or automatically advancing slides.

## Presentation and styles

Graphite Grain uses the available width without a decorative outer frame: quiet
matte graphite, fine static embedded grain, restrained accents, shallow shadows
and fine separators. Avoid enclosing paragraphs in cards, large/bold headings,
large glow effects or decorative animation. Distinguish areas mainly by spacing,
alignment and subtle depth; preserve sufficient contrast. A functional outline
joining an active tab to its panel is allowed; do not place a separator across
that join. Earlier glass/emissive product-UI experiments are not report defaults.

Use licensed embedded Paper Mono when actually available and authorized, otherwise
a disclosed Sans fallback. Do not acquire or distribute a font just to imitate an
example. Keep title/body sizes close, with hierarchy through alignment, spacing
and normal weights. Respect explicit body-size choices; 13px is an available compact
choice, not a universal accessibility optimum or assumed global preference.

| ID         | Label     | Direction                                    |
| ---------- | --------- | -------------------------------------------- |
| `current`  | Aktuell   | Compact, clear grouping                      |
| `balanced` | Mittelweg | Softer accents, slightly more reading space  |
| `calm`     | Ruhiger   | Muted accents, less grain and gentle spacing |

Offer all three inside the closed footer toolbox, verified previews or the existing
configurator, using one content source. Export/style/version controls are tooling,
not part of the report subject; keep them out of the content header. Start from an explicit saved choice where
supported. Unsupported settings must be disclosed, not silently treated as applied
or linked to another page. Style changes never remove facts or source caveats.

The optional existing configurator exposes font size, heading gap, spacing, line
height, contrast, grain, depth, lines, radii and accent strength. A/B preserves
custom values and content state; settings and standalone HTML may be exported.
Original brand colors stay intact. Its expected DOM/font/base-report requirements
remain binding; it is not a universal adapter for any generated HTML. Four-view
report/comparison/trend/flow demos are optional and explicitly fictional when used.

For an explicitly requested presentation, start with slides and offer a reading
view switch. Without JavaScript, all content is available in a complete reading
view. This task-specific exception does not turn ordinary comparisons into a
sequence of individual product slides. Critical conditions stay on their related
slide, not only in presenter notes. Navigation and export never remove other slides.

## Local preference

Read `<repo>/.cache/show-html/preferences.json` when continuing reports. This
compatibility path does not require the third-party show-html skill. The current
explicit instruction wins. A browser selection or slider is temporary, not a
permanent adoption instruction.

Before writing, verify Git exclusion from the actual repository root. Add only
the narrow `.cache/show-html/` ignore rule when needed, preserving existing entries.
Never commit the preference or cache. The following is a schema example, not a
selection to assume:

```json
{
  "version": 1,
  "style": {
    "preferred": "current",
    "settings": { "fontSize": 13 }
  },
  "content": {
    "preferGraphics": true,
    "preferCompactText": true,
    "avoidLongProse": true
  }
}
```

`preferred` accepts `current`, `balanced`, `calm` or `null`. Record only supported
explicit refinements; preserve unrelated fields. Invalid JSON, versions or values
require a visible fallback, not silent replacement. The agent persists a choice
only after explicit selection/adoption. Ordinary HTML cannot silently write repo
files; use settings export and agent adoption, not a new file-writing endpoint.
No credentials, transcripts or unrelated browser state belong in preferences.

## Icons and assets

Use small recognizable product marks and labeled action icons. First check
[theSVG](https://thesvg.org/) and its `https://thesvg.org/api/registry.json` registry
for genuine brands. Resolve published slugs/variants rather than guessing URLs,
and verify against official product identity. Otherwise use the official website,
press assets or repository. Do not confuse namesakes or substitute a hosting
provider's mark. When unavailable, keep the name and a labeled neutral placeholder.

Use [Lucide](https://lucide.dev/) for generic actions, preferably an existing
installation or individually obtained SVGs without a runtime dependency. Generic
icons do not replace brand logos. Obtain library approval when repository policy
requires it. Brand boxes are normally 16–18px with original colors and aspect ratio;
action icons may use 14–16px with consistent 1.5–1.75 stroke. Prefer official
light/dark variants or neutral backing for contrast. Keep labels visible, mark
adjacent decorative images appropriately and name icon-only controls. Color alone
must not encode status.

Cache verified selected downloads in ignored `.cache/show-html/icons/`, retaining
provenance, identity, variant, digest and known license/usage terms. Do not invent
licenses. Treat SVG as untrusted: reject active content/external resources and
prefer safe image embedding over markup injection. Embed necessary bytes so cache
deletion does not break delivery. Consumers retain reviewed manifests/assets for
reproducibility; cache hydration is never a hidden build-network step.
The shared renderer's `figure` block accepts embedded raster images. The v2
`logo` block checks reviewed provenance and bytes and isolates SVG as an image.
The bundled Lucide subset and automatic diagrams need no runtime network. See
[the v2 asset contract](model-v2.md#logos).

## Source fidelity

Source documents, registers and feature files remain authoritative. A consumer
adapter derives a normalized report snapshot; the shared renderer generates HTML,
full Markdown and JSON from it. These are outputs, not three independently edited
fact copies. Preserve IDs, categories, links, source mapping, caveats and all
necessary fields. An existing source model need not be replaced for a theme change.

Keep documented, measured, assumed, open, planned and editorially estimated claims
distinct; label fictional/simulated data explicitly. Missing files, unverified links
and snapshot limits stay visible. Unknown is not absent or zero; plans are not
available capabilities. Never mix demonstration measurements into product facts.
Preserve reader goal, takeaway, critical caveats, body, source references and next
action where supplied. Do not fabricate weights or scores.

The standard delivery is standalone HTML plus complete Markdown and JSON, with a
full JSON snapshot additionally embedded in HTML. All formats derive from the same
current data state. Filtering and sorting never shrink agent exports. Readable
embedded exports supplement downloads and remain available without JavaScript.
The intended following-agent workflow is reading/evaluation with source tracing
and targeted section extraction, not a compulsory editing/write-back roundtrip.

After local editing, HTML, Markdown and JSON export the full edited working state,
including current static/no-JavaScript HTML. Preserve the unmodified original as a
separate snapshot and mark changed fields as user edits, not new verified source
facts. UI filters and sort order alone are not factual edits. The immutable original
and working state must remain distinguishable even after another export/reopen.
Invalid editor input must not silently export stale or truncated values.

Closing the tab can lose unexported edits. Exports are explicit downloads and do
not overwrite authoritative sources, repositories or APIs. A reviewed working
snapshot may be rendered again after authorization; there is no implied
synchronization, collaboration, automatic persistence or production connection.
The concrete revision format and bounded editable fields are owned by
[the renderer reference](renderer.md#browser-state-exports-and-safety).

The [comparison patterns](comparisons.md) own shared badges, unknown/absent/planned
states, scoped KPIs, genuine screenshots, editorial positioning maps and the
separation between an own-product target and delivered capabilities.

## Delivery and checks

Deliver complete standalone HTML with inline CSS, required JavaScript, structured
data and reviewed images/fonts where applicable. No runtime CDN, remote font,
framework or browser build step. Preserve semantic HTML, responsive layout,
keyboard control, visible focus and textual states. Required contents and native
details remain readable without JavaScript; interactive functions disclose their
static/no-JS fallback.

A file does not inherently require a server or Portless. For HTTP previews, follow
repository policy and retain an allowed direct-start fallback. Verify the exact
URL, response and intended application/checkout, not just a listening process.
Named proxy hosts, remapped localhost and Windows clients are separate evidence.
Reuse the session-owned preview URL and existing browser tab where possible instead
of opening another tab for each iteration. Honor host/repository browser-tool
restrictions; do not require a disallowed browser bridge to finish a local report.
Where relevant, offer the integrated desktop browser, Edge and direct-file access
with accurate paths and only verified claims. Keep the newest working preview
alive during the session unless asked otherwise; do not take over foreign
processes, routes or certificates. Content-loaded browser tests do not prove a
reader's file/HTTP route works.

Review source/JSON/HTML completeness, meaning, visible caveats, interactions,
exports, offline/no-JS reading, keyboard/focus, responsive layout and contrast with
texture. Run changed-contract and repository checks. Report failures, runtime
mismatches and unrun gates honestly. Tests and screenshots do not prove usability
or accessibility conformance. User comparisons should hold content equivalent,
balance order and measure correctness, missed caveats, task time and interruption
recovery; assess delayed recall separately. Do not claim improvements without
measurements.

## Filesystem handoff

When files or layout change, include an affected-file tree in the completion
response. The [filesystem handoff contract](filesystem-handoff.md) owns change
labels, separate roots, maintained/generated/local roles and optional accessible
colors/icons. A concise plain-text tree is sufficient; no extra HTML is required.

## Public sources and qualification

- [GOV.UK disclosure guidance](https://design-system.service.gov.uk/components/accordion/): keep required content visible and evaluate whether hiding optional sections helps.
- [W3C memory and calculation pattern](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o6p05-low-cognition/): show related information together.
- [W3C usability testing](https://www.w3.org/TR/coga-usable/usability_testing.html): automated checks alone do not establish usability.

This remains an original incubator draft, not a public-catalog admission or plugin
release. Independent agent adoption, user comprehension, full accessibility and
ADHD-related effectiveness remain unestablished. The 24-pattern reference mapping
is in [renderer.md](renderer.md); no foreign skill text/templates or fonts were
vendored. Future code reuse requires file-level provenance and license review.

## Ownership and portable assets

The skill owns the general contract, shared renderer, technical blocks, optional
recipes, starter and presentation assets. A consumer owns product records,
evidence, source-to-model mapping, domain checks, screenshots and concrete reports.
Do not transfer private consumer facts into this general skill. Profiles link to
these rules rather than keeping another maintained policy or renderer copy.

The existing [Graphite Grain configurator](../assets/graphite-grain/configurator.mjs)
expects its documented DOM classes, inline style/body insertion points and embedded
WOFF2 base-report font. Consumers supply base HTML, source fingerprint, font license
and adjacent `demo.html`. It is not a universal HTML parser or the new shared
renderer. `report-shell.html` remains a smaller independent Sans-fallback starter.

`node scripts/export-assets.mjs --destination <bundle-directory>` explicitly
exports a clean committed snapshot, manifest, source revision, per-file SHA-256
and Apache license. The bundle includes the runnable renderer, shared working-state
module, runtime, recipes and documentation at canonical relative paths, while
keeping existing flat configurator/cache-helper aliases. It installs nothing,
fetches nothing and does not update consumer imports. `--check` is read-only.
Consumers verify digests before loading a pinned offline bundle and update it
explicitly; edit canonical skill sources and re-export rather than maintaining
template forks. Do not export private data, downloaded logos or fonts. This does
not broaden cache-write rights.

`scripts/cache_icon.py --repo <repository> --url <asset-https-url>
--identity-url <official-product-https-url> --label <verified-name>` downloads only
a selected asset, checks SVG content and records provenance in the already ignored
cache. `--refresh` explicitly replaces a retrieval. It neither discovers brand
identity nor grants usage rights; the agent must establish both. Normal report
generation consumes reviewed embedded assets without network access.

## Reader experience

Use this contract before choosing a template or writing report content. It applies
to the report being requested, not to unrelated work or a permanent user setting.
Explicit reader instructions take precedence over these defaults.

### Choose the form from the outcome

Identify what the reader should understand, decide or do after reading. The subject
alone does not select the layout. Keep these distinctions explicit:

- **Information:** explain a result without creating an obligation.
- **Completed work:** show concrete verified changes as a summary.
- **Required action:** lead with the smallest bounded next step.
- **Conditional action:** state the trigger beside the action; until that trigger
  occurs, the report is not a task list.

A process-improvement request usually needs a short guided path: what changes
first, what changes later and what remains. A large matrix of possible actions
would answer a different question. Use the comparison template when the intended
outcome really is choosing between alternatives using shared criteria. Keep those
alternatives jointly visible; do not force every report into a step-by-step view.

### One compact handoff, no duplicated orientation

Use one short status banner when it clarifies whether the reader must act. The
optional v2 `readerStatus` model preserves this distinction in HTML and exports;
see [the model](model-v2.md#reader-status-and-next-action).

Useful text-and-symbol pairs are information / no task, completed / summary,
action required and only if the stated condition occurs. Use a checkmark only for
completed work supported by evidence. Unrun tests, pending approvals and unknown
states do not become completed because their implementation exists. A color alone
never carries the status.

A compact banner is sufficient. Do not repeat its meaning as a rhetorical question
such as "Do I need to do anything?", an explanatory legend, a dedicated opening
page and identical badges on every bullet. Start the substantive content directly.
An adequate text label does not need a second legend. Give each fact one primary
home; optional evidence should add provenance or detail rather than rephrase it.

When updating a report, distinguish historical findings from current obligations.
Do not keep a resolved issue displayed as an outstanding reader task. Likewise,
a reading sequence is not evidence that there are unfinished implementation steps.

### Short guided reading where it helps

Each section or reading step develops one substantive point with a few plain
bullets. Prefer a direct statement over an artificial guiding question. Keep
current topic, position and available reading navigation recognizable without
repeating them in a second status bar. No automatic advancement, forced quiz or
repeated reassurance screens. For tabbed reading, use the layout below.

Use diagrams to clarify a boundary, cause or changed flow, with an equivalent text
explanation. A graphic does not replace necessary conditions or exact facts.
Keep extra evidence and exceptions in optional details; essential restrictions
stay beside their recommendation. Without JavaScript, all substantive content is
available in one complete reading view.

End only with a new useful action, condition or unresolved decision. Do not add a
recap that merely repeats the opening. If nothing remains to do, stop; do not invent
an under-two-minute chore to satisfy an action-first writing pattern.

### Guided layout and navigation

Shared alignment and emphasis apply to report reading views. The connected-surface,
navigation and panel-sizing rules below apply when the reader's goal calls for a
guided tabbed report. They do not make tabs mandatory for comparisons, ordinary
reading or explicit slide presentations. This is a presentation contract, not an
additional model block/API; use the documented renderer capabilities and preserve
the canonical exports.

**Shared alignment and emphasis.** Align the page title, status, tab component,
content headings and footer to a common left edge. Keep content widths, horizontal
starting positions and padding consistent across tabs. Distribute titles evenly
and use consistent spacing rather than decorative cards around each paragraph.
Do not center the report title independently of the content. On narrow screens,
adapt the grid and wrap or shorten meaningful labels without hiding tabs or
shrinking text to preserve a rigid row.

Make the key point in each substantive section easy to find: a restrained accent
edge, subtle background or slightly stronger weight can distinguish the primary
bullet. Keep necessary conditions and warnings beside the affected claim, with
text and a restrained warning accent where useful. Do not turn every paragraph
into a callout or duplicate the status banner to create emphasis. Icons supplement
explicit text; checkmarks remain reserved for evidenced completion.

**Connected surface.** The selected tab title and its panel share a background
and an uninterrupted outer contour. No line or gap divides the selected title
from its content. Distinguish inactive tabs and expose the current selection
semantically. Place a small position label such as "1 of 5" directly with the
selected title, without a separate horizontal rule or duplicate progress row.

**Compact navigation.** Direct tab selection plus two small previous/next arrows
and a compact step slider below the component provide reading navigation. Replace
large Back/Next buttons when these controls serve the same purpose. Keep tab
selection, position, arrows and slider synchronized; disable the unavailable arrow
at either end. Give icon-only controls accessible names and expose the slider's
current step/topic. Preserve keyboard operation and visible focus. The tab-title
area has no horizontal or vertical scrollbar, including beside the last tab;
resolve overflow through layout instead of hiding a still-needed scrollbar.

**Natural content height.** Let each panel grow to fit its content, including
opened evidence, text zoom and narrow widths. Do not size the reading box to a
fixed or minimum viewport height, cap its height or create a scrollable tab body.
Do not conceal overflow or clip content to suppress a scrollbar. The whole page
may scroll vertically. Stable alignment and spacing reduce disruptive movement;
complete content takes priority over keeping every panel the same height. These
rules supersede earlier fixed-height or internally scrolling guided panels.

Scale diagrams and images proportionally to available width, for example with
`max-width: 100%` and automatic height. Do not put a wide flow diagram into its
own scroller. Preserve readable text alternatives; an optional larger view may
supplement a complex graphic. Adapt wide text/trees to wrap within guided panels;
standalone comparison/tree horizontal-scroll guidance does not override this
panel contract. Review the first panel, last title, opened details and narrow
layouts specifically. Do not apply these reading-panel rules to an explicitly
requested device simulation or an external configurator's control workspace.

### Links explain their purpose

At the point of use, explain where a link goes, which question it answers and why
opening it helps. Avoid unexplained link collections on the first screen. Distinguish
section navigation, external reading and source verification. Use descriptive link
text rather than technical source IDs alone. Evidence links are optional checks,
not prerequisites for understanding the main report. Useful source tracing remains
available without taking over the primary navigation.

### Report tooling belongs in the footer

Export, version/history selection, style and technical settings belong in a small,
closed-by-default footer toolbox. Its label and separation make clear that these
are tools surrounding the report, not recommendations about its subject. Opening
the toolbox expands it; it never edits sources or starts an external operation.

Keep only content-serving controls such as search, comparison filters and reading
navigation near their content. The standalone report owns export/style controls;
the managed preview owns revision controls. Both label their tooling boundary.
Group optional source verification and the toolbox at the page's lower end with
distinct labels: sources support claims; tools control the report. Keep optional
source disclosure closed by default in a guided report and explain its purpose.
Both may fall below the initial viewport; reaching them by scrolling the page is
acceptable. Sticky/fixed positioning is optional, never a reason to constrain the
panel, cover content or make expanded evidence/tools unreachable.

Do not remove complete exports, immutable originals, draft protection or explicit
revision application merely to reduce visual clutter. Revision/draft warnings must
remain noticeable even while the preview toolbox is closed. Keep the owning
warning visible without requiring all footer controls to stay on screen.

### ADHD-oriented writing when requested

If the reader explicitly names an available ADHD writing skill, read it and apply
it within the requested scope. Do not require a separate skill installation: the
following profile remains self-contained. Do not copy external skill instructions
or claim clinical, accessibility-conformance or measured reading-speed benefits.

- Start with a useful result or an actual small next action. For summaries, a
  compact no-task status is enough; avoid introductory announcements.
- Use plain, direct sentences and one idea per bullet. Keep lists to five items or
  fewer; split longer material into meaningful groups without deleting evidence.
- Number multi-step actions and make each step bounded. Keep a conditional action
  beside its trigger. Do not disguise alternative cases as one required sequence.
- Keep current position and next destination visible. Make completed outcomes
  concrete; do not depend on the reader remembering another page or chat turn.
- Suppress tangents, repetitive conclusions and closing pleasantries. Give a
  specific time estimate only when useful, labeling reading/work estimates and
  their assumptions; never present an estimate as a measurement.

If genuine work remains, end with one doable next action. If a guideline would
remove needed explanation or evidence, preserve the answer and simplify its shape.
No fixed font size, theme or graphic count is an ADHD treatment or universal default.

### Delivery check

Check the intended outcome, not just report syntax: can the reader distinguish a
summary from an obligation without opening a link? Does every visible item add
information? Are conditions, sources and unrun gates still faithful? Verify the
relevant navigation, optional details, footer controls, narrow layout and complete
exports. For guided tabs, check shared alignment, an uninterrupted active join,
synchronized controls, no tab-title/body scrollbar, proportional diagrams and
reachable expanded footer/evidence. Page scrolling is acceptable. User acceptance
confirms the chosen appearance; it does not establish unrun keyboard, responsive
or accessibility checks. Report what was checked and what remains unverified.
