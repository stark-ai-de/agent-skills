# Choose for the reader's question

The eight purpose templates and five domain profiles are maintained in
`scripts/lib/templates.mjs`; `--templates` prints their full finite inventory.
Load only the chosen template/profile and the needed block reference. Do not fetch
an external visualization catalog for each report.

| Reader question                     | Prefer                                    | Keep explicit                                                   |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| What matters now?                   | Takeaway, bullets, a few relevant metrics | Next action, caveats, evidence state                            |
| Which option meets my needs?        | Shared comparison matrix, aligned bars    | Same criteria/units, direction, missing data                    |
| What changed between two states?    | Before/after; code diff for text          | Comparable baseline, date and measurement conditions            |
| Are we meeting a threshold?         | Actual/target                             | Target meaning, unit, direction, overshoot                      |
| What contributes to this end value? | Waterfall                                 | Start, signed deltas, consistent total                          |
| Which work overlaps?                | Timeline                                  | Owners, dates, dependencies, milestones                         |
| How did observations vary?          | Status strip                              | Sampling interval, unknown observations, sample-count semantics |
| How does the system work?           | Automatically laid-out diagram            | System boundary, edge meaning, useful text alternative          |
| How do values change over time?     | Line                                      | Numeric time coordinate, gaps, no invented interpolation        |
| Are two quantities related?         | Scatter                                   | Both units; association is not causation                        |
| Where are concentrated values?      | Heatmap                                   | Shared scale and exact cells                                    |

Useful combinations are selected by the question: a decision matrix with a target
chart; a diagnostic timeline with a system diagram; a cost waterfall with explicit
assumptions. No mandatory two-chart rule and no prescribed prose between graphics.
Avoid decorative charts, arbitrary scores, empty KPI cards and icon-only meaning.

Use short lists and concrete headings to separate conclusion, reason and evidence.
Keep decisive restrictions visible. Put supporting examples and deeper evidence in
details only when that improves orientation. A diagram is an aid to the answer,
not a replacement for exact values or sources.

## Provenance

This selection guide and the native report blocks are independently authored.
Pattern inspiration: [mdxcn skills](https://www.mdxcn.dev/docs/skill),
[examples](https://www.mdxcn.dev/docs/examples) and
[source at ebd8c5456ae439903930bb3b97bd5a66fdc45d02](https://github.com/shadcn-labs/mdxcn/tree/ebd8c5456ae439903930bb3b97bd5a66fdc45d02/registry/default).
No mdxcn skill text or React/Motion components are copied. The ASCII aesthetic,
fixed graphic counts and mandatory inter-chart prose are not report requirements.

The [upstream uptime component](https://github.com/shadcn-labs/mdxcn/blob/ebd8c5456ae439903930bb3b97bd5a66fdc45d02/registry/default/graph-uptime/graph-uptime.tsx)
inspired a sampled status display, not a duration-weighted availability claim.

[W3C page-structure guidance](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o2p03-page-structure/)
supports predictable structure and meaningful headings. Reading patterns from
the locally selected ADHD-oriented workflow inform concise presentation; neither
the skill nor its tests establish clinical benefit.

Bundled implementation dependencies are separate from inspiration:
[Beautiful Mermaid](https://github.com/lukilabs/beautiful-mermaid),
[Remark Directives](https://github.com/remarkjs/remark-directive),
[GFM](https://github.com/remarkjs/remark-gfm) and
[Lucide](https://lucide.dev/guide/static). Exact package versions, integrity values,
generated-file hashes and complete upstream notices live in `assets/vendor/`.
