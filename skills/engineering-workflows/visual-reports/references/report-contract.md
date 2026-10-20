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

Lead with the takeaway and relevant next action. Headings should answer reader
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
locally scrollable comparison surface rather than overflowing the entire page.
Product data is retained: decision-relevant values, conditions and limitations
belong on the joint surface, with deeper evidence still accessible.

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
Motion belongs only to an explicitly selected prototype, is reader-started and
stoppable, and respects reduced-motion preference. Normal reports remain static.

## Presentation and styles

Graphite Grain uses the available width without a decorative outer frame: quiet
matte graphite, fine static embedded grain, restrained accents, shallow shadows
and fine separators. Avoid enclosing paragraphs in cards, large/bold headings,
large glow effects or decorative animation. Distinguish areas mainly by spacing,
alignment and subtle depth; preserve sufficient contrast. Earlier glass/emissive
product-UI experiments are not report defaults.

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

Offer all three through a small selector, verified previews or the existing
configurator, using one content source. Start from an explicit saved choice where
supported. Unsupported settings must be disclosed, not silently treated as applied
or linked to another page. Style changes never remove facts or source caveats.

The optional existing configurator exposes font size, heading gap, spacing, line
height, contrast, grain, depth, lines, radii and accent strength. A/B preserves
custom values and content state; settings and standalone HTML may be exported.
Original brand colors stay intact. Its expected DOM/font/base-report requirements
remain binding; it is not a universal adapter for any generated HTML. Four-view
report/comparison/trend/flow demos are optional and explicitly fictional when used.

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
source state. Filtering and sorting never shrink agent exports. Readable embedded
exports supplement downloads and remain available without JavaScript. The intended
following-agent workflow is reading/evaluation with source tracing and targeted
section extraction, not a compulsory editing/write-back roundtrip.

Local editor changes are a separate explicit draft export, never a silent mutation
of the original snapshot or external sources. Closing the tab can lose unexported
edits. A reviewed draft may be used in a later authorized render; this does not
imply synchronization, collaboration or automatic repository/API writes.

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
and Apache license. The bundle now includes the runnable renderer, runtime,
recipes and documentation at canonical relative paths, while keeping the existing
flat configurator/cache-helper aliases. It installs nothing, fetches nothing and
does not update consumer imports. `--check` is read-only. Consumers verify digests
before loading a pinned offline bundle and update it explicitly; edit canonical
skill sources and re-export rather than maintaining template forks. Do not export
private data, downloaded logos or fonts. This does not broaden cache-write rights.

`scripts/cache_icon.py --repo <repository> --url <asset-https-url>
--identity-url <official-product-https-url> --label <verified-name>` downloads only
a selected asset, checks SVG content and records provenance in the already ignored
cache. `--refresh` explicitly replaces a retrieval. It neither discovers brand
identity nor grants usage rights; the agent must establish both. Normal report
generation consumes reviewed embedded assets without network access.
