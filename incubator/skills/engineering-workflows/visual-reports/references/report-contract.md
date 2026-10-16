# Visual report contract

This is the canonical requirement set for the draft. The bundled shell demonstrates
presentation only; it is not the complete product-data renderer or evidence of
skill effectiveness.

## Content and reader goal

Optimize for correct answers and actions rather than minimum word count. Use
concise language and explain unfamiliar terms near their first use. Prefer useful
graphics, tables and short bullets over long continuous prose. A graphic must
clarify a relationship; decorative icons alone are not an explanation. Do not
force charts for single facts or fabricate quantities to fill a chart.

| Reader goal           | Structure                                                       |
| --------------------- | --------------------------------------------------------------- |
| Look up               | Direct answer, meaningful section labels, sources               |
| Decide                | Conditions, comparable alternatives, recommendation with limits |
| Execute               | Prerequisites, action, observable success, recovery action      |
| Understand and retain | Guiding question, worked example, optional recall question      |

Lead with the takeaway and relevant next action. Use headings that answer reader
questions. Put decisive caveats, eligibility conditions and necessary steps beside
the related conclusion or action. These remain visible, not only in a tooltip,
closed disclosure, another tab or an export. Optional evidence may be collapsed;
first consider whether a well-structured open section would be simpler.

Shorten the visible view without deleting required source information. Arbitrary
word, paragraph or bullet limits must not remove necessary conditions. Preserve
accessible explanations for graphics. Place labels, units and limitations near
values; comparisons should share a visible context and not require memorizing
other screens or avoidable mental calculations.

### Focus and orientation

Keep the current selection, filter and location recognizable. Use stable section
anchors and, if useful, an optional resume marker. A reading marker is not proof
of comprehension. Do not auto-rotate content, scroll unexpectedly or add timed
reading prompts. Preserve focus and reader-controlled state during style changes.

Reading guidance and learning questions are optional, without setup or quiz
requirements. Keep customization small and progressively disclosed. No universal
ADHD layout or clinical benefit is claimed. Grain, dark mode, density and font
size are adjustable preferences. Do not default to word-part bolding or promise
reading-speed improvements. Applying cognitive-accessibility patterns alone does
not establish WCAG conformance or ADHD-specific effectiveness.

## Presentation and styles

The Graphite Grain direction uses full available width, no decorative outer frame,
one matte graphite background, fine static embedded grain, restrained neon accents,
and very shallow shadows/light edges for open details. Avoid enclosing every
paragraph in a card, animation or unnecessary effects. Preserve sufficient contrast.

Use licensed embedded Paper Mono when available, otherwise a disclosed Sans
fallback. Keep title/body sizes close, with hierarchy carried by alignment,
spacing and normal weights. Respect the user's selected body size; 13 px is an
available compact choice, not a universal accessibility optimum. The example
starts at 13 px and is a configurable illustration, not a global user preference.

| ID         | Label     | Direction                                                        |
| ---------- | --------- | ---------------------------------------------------------------- |
| `current`  | Aktuell   | Established compact style with clear grouping                    |
| `balanced` | Mittelweg | Slightly softer contrast and accents, more reading space         |
| `calm`     | Ruhiger   | Muted accents, subtle lines/radii, less grain and gentle spacing |

Offer all three through a small selector, verified previews or an existing
configurator. Use one shared data source and preset implementation, not separately
maintained facts. Start from the explicit saved selection. Unsupported options
must be marked unavailable rather than linked to the wrong page.

An optional configurator may expose font size, heading gap, spacing, line height,
contrast, grain, depth, lines, radii and accent strength. A/B preserves custom
values and report state. Export chosen settings and standalone HTML; original
brand colors remain intact. A four-view report/comparison/trend/flow demo is only
needed when requested. Fictional charts and simulated processes stay labeled.

## Local preference

Read `<repo>/.cache/show-html/preferences.json` when continuing reports. This
path deliberately supports an existing local show-html preference without
requiring that third-party skill. The current explicit instruction wins.

Before writing, verify Git exclusion from the actual repository root. If needed,
add the narrow `.cache/show-html/` ignore rule while preserving existing entries.
Never commit the preference or cache. The following is a schema example, not a
selection to assume for a new user:

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

`preferred` accepts `current`, `balanced`, `calm` or `null` when unselected.
Record only supported explicit refinements in `settings`; preserve unrelated
fields. Invalid JSON, unsupported versions and unknown values require a visible
fallback, not silent replacement. The agent persists a choice only after an
explicit user selection or adoption of exported settings. A browser tab or slider
movement is temporary. Ordinary HTML cannot silently write repository files;
use a settings export and agent adoption, not a new file-writing server endpoint.
No credentials, transcripts or unrelated browser state belong in this file.

## Icons and assets

Use small recognizable product marks and labeled action icons. First check
[theSVG](https://thesvg.org/) for actual brands and verify the official product
identity. If absent, use the official website, press assets or official repository.
Do not confuse namesakes or substitute a hosting provider's logo. When no genuine
asset is found, retain the name and a neutral labeled placeholder.

Use [Lucide](https://lucide.dev/) for generic actions, preferably an existing
installation or individually obtained SVGs without a new runtime dependency.
Brand logos are not replaced by generic icons. Obtain approval for new libraries
where repository policy requires it.

Use consistent 16–18 px boxes, preserved aspect ratios and original brand colors.
Keep labels visible. Mark adjacent decorative images appropriately; icon-only
controls need accessible names. Do not encode status through color alone.

Cache verified downloads in Git-ignored `.cache/show-html/icons/`. Reuse valid
assets; retain provenance, identity, variant, digest and known usage/license terms.
Do not invent an asset license. Treat SVG as untrusted: reject active content and
external resources. Prefer safe image embedding over injecting downloaded markup.
Embed the necessary bytes in output so cache deletion does not break the report.
Keep any required reviewed manifests/output bundles with the existing generator;
cache hydration must not become a hidden network step in a reproducible build.

## Source fidelity

Existing registers, source documents and feature files stay authoritative. Derive
HTML, structured JSON and complete Markdown exports from the same source. Preserve
IDs, categories, links and all necessary fields; do not maintain another fact copy.

Keep documented, assumed, open and editorially estimated claims distinguishable.
Fictional data and simulations need separate explicit labels. Identify missing
files, unverified links and snapshot limits. Do not mix demonstration measurements
into real product facts or scores. In the existing content model, preserve the
concepts of reader goal, takeaway, critical caveats, body, source references and
optional next action; do not mandate a new schema just for a theme.

For interactive product comparisons, a compact entry view may show product,
distinction and limit/check note. Search, category filters, sorting, native details
and comparison of up to four selections can expose the remaining complete data.
Use only interactions useful to the task. Downloads supplement readable embedded
exports; they must not be the only way to access required information without JS.

## Delivery and checks

Deliver complete standalone HTML with inline CSS, needed JavaScript, data, fonts
and images. No runtime CDN, remote font, framework or build requirement. Preserve
semantic HTML, responsive layout, keyboard control, visible focus and textual
status. Required contents and native details remain readable without JavaScript.

A file does not inherently require a server or Portless. For an HTTP preview,
follow the actual repository policy; retain a permitted direct-start fallback.
Verify the precise URL, response and intended application/checkout, not just an
open port. A named proxy host, remapped localhost URL and Windows client are
separate evidence. Where relevant, visibly offer the integrated desktop browser,
Microsoft Edge and direct-file access with accurate client/path instructions.
Do not advertise a route as verified without testing it. Keep the newest working
preview alive during the session unless asked otherwise; do not stop or take over
foreign processes, proxy routes or certificates.

Review source/JSON/HTML completeness and meaning, visible caveats, interactions,
exports, offline/no-JS reading, keyboard/focus, responsive layout and contrast with
texture. Run relevant repository checks. Report failures and unrun gates honestly.

Structural tests and screenshots do not prove usability or accessibility
conformance. If actually comparing designs with users, hold content equivalent,
balance order, and assess correctness, missed caveats, task time and recovery
after interruption together. Measure delayed recall separately for learning
materials. Do not report improvements without measurements.

## Public sources and qualification

- [GOV.UK disclosure guidance](https://design-system.service.gov.uk/components/accordion/): keep required content visible and evaluate whether hiding optional sections helps.
- [W3C memory and calculation pattern](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o6p05-low-cognition/): show related information together.
- [W3C usability testing](https://www.w3.org/TR/coga-usable/usability_testing.html): include users; automated checks alone do not establish usability.

This original draft captures a user-defined reporting workflow. It does not vendor
third-party skill instructions or templates. Study-specific medical or learning
claims are not asserted. Independent agent adoption and user-comprehension
qualification remain open; this draft does not enter the public catalog or plugin.
