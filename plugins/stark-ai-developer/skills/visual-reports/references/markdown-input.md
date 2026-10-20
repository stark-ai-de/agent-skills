# Optional Markdown input

Use JSON for complex adapters or existing source models. Use the bounded Markdown
form for short authoring. Both pass through `validateReport` and the same renderer.
Remark, GFM and Directives are bundled; no package installation occurs per report.
No MDX, JSX, imports, expressions or HTML executes.

Start from [the complete runnable example](../assets/completion-example.md).
Outer and inner directive attributes must be on one line. The outer report uses
four colons; contained blocks use three. GFM tables require a separator row.

```markdown
::::report{id="brief" type="overview" profile="software"}

# What changes

::takeaway[The new option is ready for review.]
::next[Compare the evidence before deciding.]
::caveat[One source remains unverified.]
::source{id="spec" label="Approved specification" state="documented"}

:::bullets{id="summary" title="Key points" sources="spec" icon="info"}

- The main behavior is documented.
- The open point remains visible.
  :::
  ::::
```

Required report attributes: `id`, `type`, `profile`; optional `style`, `goal`.
There is exactly one title, takeaway and next action. Repeat `caveat` and `source`
when necessary. Source attributes are `id`, `label`, `state`, optional `url`, `asOf`.

All section directives require `id`, `title`; optional `sources` is a comma-separated
ID list and `icon` a bundled name. The supported shorthand blocks:

| Directive       | Attributes and body                                                                    |
| --------------- | -------------------------------------------------------------------------------------- |
| `bullets`       | One flat bullet list                                                                   |
| `diagram`       | `description`; one `mermaid` code fence                                                |
| `chart`         | `type`, `unit`, `context`, `direction`, `series="id:Label,id:Label"`; optional `xUnit` |
| `timeline`      | Table: `id,label,owner,start,end,progress,dependsOn`                                   |
| `statusHistory` | `context`; table: `at,status,sources,note`                                             |
| `model`         | No attributes; one `json` code fence containing a complete canonical section           |

Chart table columns: `id,label,series,value,state,sources,note`, optionally `x,role`.
Supply one row per observation/series pair. All series must be present; missing
observations use `null` with state `unknown`. Repeated observation IDs must agree
on label, x and role. Empty source/note cells are explicit empty values.
Numeric cells accept finite decimals/scientific notation or literal `null`; units
belong in attributes, not numeric cells. Timeline `dependsOn` names predecessor IDs.
Timeline dates are either all ISO calendar dates or all UTC timestamps with seconds
(optional three-digit milliseconds), ending in `Z`. Keep intraday times exact;
use `progress: null` for unknown progress. Do not infer a percentage from dates.

`model` is the escape hatch for every v1 block, additional details, logos and
extension fields. It still uses the common validator; it is not executable code.
Ordinary inline colons (including UTC timestamps) remain literal text. Inline
code and emphasis preserve text only; bold does not mean measured, healthy or best.
Links/HTML, nested lists, unknown attributes/directives, extra prose and malformed
tables produce diagnostics. Reader Markdown exports are not this input language.
