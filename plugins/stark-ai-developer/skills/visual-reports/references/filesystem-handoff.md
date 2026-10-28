# Filesystem handoff

## Trigger and scope

Whenever a task using this skill creates, edits, moves or deletes files, changes a
directory layout, installs report assets, or writes a selected local preference,
always include a compact, verified file tree in the completion response. Put it
in the response itself; a link to an HTML page or an export alone is insufficient.
The tree is required even when only one file changes. A plain-text tree can be
two lines; do not generate another HTML report merely to satisfy this rule.

This is a completion format within the skill's existing workflows, not a new
filesystem workflow or permission to change files. If no write succeeded, say so.
Requested or proposed layouts must be labeled planned rather than actual.

## Verify paths and change states

Verify the relevant before/after state, actual file paths and repository roots.
Show the affected subtree and enough parents to locate it, not the whole machine.
Use separate labeled roots for different repositories, installations and local
state. Use host-appropriate paths; preserve a meaningful location without leaking
credentials, private source provenance or unrelated sensitive filenames.

| Label   | Meaning                                                                 |
| ------- | ----------------------------------------------------------------------- |
| Added   | Created by the completed task.                                          |
| Changed | An existing file's contents changed.                                    |
| Moved   | Show both the old and new path.                                         |
| Deleted | Show the former path and mark it deleted; do not imply it still exists. |
| Context | Unchanged parent or reference needed to understand the result.          |

These describe the task's observed filesystem changes, not automatically its Git
status. Do not label every previously untracked file newly created by this task.
Distinguish source documents, generated outputs, pinned consumer copies and
Git-ignored preferences/caches where relevant. State commit, push and PR status
separately and only when verified; a file tree does not prove remote persistence.
Preserve unrelated changes and do not infer their authorship.

Use concise role notes so the reader knows where future edits belong. A folder
summary may group repetitive generated artifacts; identify that grouping and keep
the complete changed-file inventory available when needed. Do not hide a decisive
move, deletion or ownership boundary behind a summary.

## Colors, icons and logos

Plain chat uses portable text with a visible legend, for example `[+] Added`,
`[~] Changed`, `[>] Moved` and `[-] Deleted`; do not rely on ANSI terminal colors.
Do not use a Markdown `diff` block when it would mislabel every line as an addition
or removal. Small icons can supplement these labels when the rendering supports them.

In HTML, use restrained semantic colors and small Lucide folder/file/action icons
to improve scanning. Keep path text selectable and statuses explicit. SVG next to
text is decorative; mark it appropriately. Logos identify actual products or
services, not change states. Follow the canonical [asset rules](report-contract.md#icons-and-assets):
verified theSVG identity first, then official sources, original brand colors,
ignored download cache, required attribution/license and fully embedded safe bytes.
Use a neutral labeled placeholder when no genuine mark is available. A simple
tree does not require collecting decorative logos.

Keep HTML trees readable without JavaScript. A standalone wide tree may use a
labeled horizontal scroller on narrow screens. Within a guided tab panel, wrap
paths or use a nested list so all content stays readable without a local scroller;
follow the [guided layout contract](report-contract.md#guided-layout-and-navigation).
Ordinary vertical page scrolling is allowed. Maintain visible status
labels in monochrome and print. Style changes must preserve paths, labels and any
open detail/selection state. Use an ordinary labeled figure/preformatted structure
or nested list; do not add an ARIA tree widget without implementing its keyboard
interaction model.

## Example, not a real project change

```text
Legend: [+] Added · [~] Changed · [=] Context
example-project/                        [=] Context
├── docs/overview.md                     [~] Changed · maintained source
└── reports/overview.html                [+] Added · generated output
```

The [starter shell](../assets/report-shell.html#filesystem-example) also demonstrates
a fictional colored tree with an embedded generic icon and readable matching JSON.
Replace it with verified task results before using it as a real completion report.
