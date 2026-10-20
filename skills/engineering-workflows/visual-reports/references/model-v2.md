# Canonical model v2

Version 1 and the exports `validateReport`, `renderReport`, `renderMarkdown`,
`writeReport` and `extractReport` remain supported. Existing pinned consumer
bundles are not automatically replaced. The [legacy model and recipes](renderer.md)
remain valid; these additions share the same renderer and validation boundary.

## Report

Use `schemaVersion: 2` and all v1 fields, plus:

- `reportType`: `overview`, `comparison`, `research`, `explanation`, `plan`,
  `status`, `review`, `diagnosis`.
- `domainProfile`: `software`, `architecture`, `code`, `operations`, `capacity`.
- `nextAction`: a concrete next step, visible beside the takeaway and caveats.

`--templates` returns every template's reader question, outline, suggested blocks
and required domain information. `--starter TYPE --profile PROFILE --id ID`
creates a valid unfilled model. Unknown facts remain explicitly open. Templates
guide composition; they do not require fixed chart counts or fabricated data.

Sections retain `id`, `kind`, `title`, `sourceIds`, `caveats`, `data`.
Optional `icon` selects one bundled Lucide name from `assets/vendor/manifest.json`.
Optional `details: [{title, items: string[]}]` holds supplementary evidence.
Essential constraints belong in visible `caveats`, not details.

## New blocks

| Kind            | Data                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| `bullets`       | `items: string[]`                                                            |
| `diagram`       | `source`: supported Mermaid text; `description`: meaningful text alternative |
| `chart`         | Common chart model below                                                     |
| `statusHistory` | `context`, `samples: [{at, status, sourceIds, note}]`                        |
| `logo`          | Reviewed embedded asset model below                                          |

The `timeline` block represents overlapping periods:
`tasks: [{id,label,owner,start,end,progress}]`, `dependencies: [{from,to}]`.
Choose one precision for the whole axis: ISO calendar dates (`2026-10-20`) or
UTC timestamps (`2026-10-20T08:10:00Z`, optionally `.000` milliseconds).
Do not mix precisions or drop time information from short tests or incidents.
Equal instants are milestones. The shared scale encodes elapsed spans; completion
is a separate percentage, never inferred duration. In v2, use `progress: null`
when it is unknown and an explicit unknown-owner label when no owner is given.
Version 1 calendar-date plans and numeric progress remain supported.

### Structure diagrams

`diagram.source` accepts flowcharts, sequence, state, class and ER diagrams.
The bundled Beautiful Mermaid generator lays them out without a browser.
No external links, markup, init directives or custom CSS. The generator's known
Google Fonts import is removed; remaining active/external SVG content is rejected.
Output is an isolated embedded image with its description and original DSL text.
Use native `chart` for quantitative data. For trusted pre-existing coordinate
models, v1 `graph` remains available.

### Data charts

```json
{
  "type": "actual-target",
  "unit": "MiB",
  "context": "Peak memory during the same load test",
  "direction": "lower",
  "series": [
    { "id": "actual", "label": "Ist" },
    { "id": "target", "label": "Ziel" }
  ],
  "rows": [
    {
      "id": "memory",
      "label": "Memory",
      "values": [
        { "value": 600, "state": "measured", "note": "Peak", "sourceIds": ["test"] },
        { "value": 500, "state": "planned", "note": "Approved limit", "sourceIds": ["budget"] }
      ]
    }
  ]
}
```

Every value has an explicit evidence state, note and source IDs. `unknown` uses
`null`, never zero. Values are finite numbers or null. Units, context and
`direction: higher|lower|none` are mandatory. Directions do not invent scores or
turn uncertain data into recommendations. Every chart includes exact values and
evidence in a table, independent of hover, color or JavaScript.

| Type            | Additional contract                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bar`           | Grouped series; common signed scale including zero                                                                                                          |
| `stacked-bar`   | Positive and negative contributions accumulate separately; missing parts stay explicitly unknown                                                            |
| `line`          | `xUnit` and numeric row `x`; strictly increasing x; straight segments break at null                                                                         |
| `scatter`       | `xUnit` and numeric row `x`; both dimensions preserve numeric distances                                                                                     |
| `heatmap`       | Rows × series; common labeled quantitative scale and exact cell values; null has a `?`                                                                      |
| `before-after`  | Two ordered series: before, after; shared signed scale                                                                                                      |
| `actual-target` | Two ordered series: actual, target; targets and overshoots are never clipped                                                                                |
| `waterfall`     | One series; `role` is `start`, `delta` or `total`; first=start, last=total, totals must agree with cumulative contributions; missing contributions rejected |

### Status samples

Each `at` is a strictly increasing UTC ISO timestamp ending in `Z`.
`status` is `healthy`, `degraded`, `down` or `unknown`.
The display reports healthy **known samples**, explicitly counts unknown samples,
and says this is not time-weighted availability. Irregular sampling is allowed;
equal-width tiles encode observation order, not elapsed time. Use an explicit
duration model in a future extension before claiming elapsed-time uptime.

### Logos

Use `cache_icon.py` only for an explicitly selected public asset. Verify product
identity and inspect the asset before setting `reviewed: true`. The `logo` data:

```text
label, alt, reviewed: true, src: data:image/...;base64,...,
sourceUrl, identityUrl, retrievedAt, sha256, optional licenseUrl
```

Use the cache metadata's `url` as `sourceUrl`; encode its `.asset` bytes unchanged
and preserve the SHA-256 digest. The renderer verifies bytes, provenance shape and
SVG restrictions. It cannot determine identity or license approval for the agent.
SVGs are embedded as images, never injected as markup. Preserve original colors
and proportions. Missing marks use a visible product name, never a guessed logo.

## Exports and compatibility

The source JSON, embedded JSON and all readable exports are one snapshot.
Reader Markdown adds semantic sections, exact values and selected deterministic
text diagrams for changes, targets, waterfalls, timelines and status samples.
The complete field index retains every extension field and source attribute.
Text diagrams are not accepted as data inputs. Original source blocks remain
unchanged by filters, style selection or local drafts.

`writeReport` continues to create an exclusive new directory. Managed updates use
the [separate store contract](managed-reports.md); neither path overwrites source
documents or a previously exported bundle.
