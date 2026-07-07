# Diagram type playbook

Before authoring, classify the diagram and build a semantic model.

## Semantic model

```yaml
diagram_type: architecture | flow | sequence | er | class | network | swimlane | timeline | comparison | other
audience: engineering | executive | operations | teaching
nodes: []
edges: []
groups: []
layers: []
icons: []
theme: light-dark-compatible
outputs: [drawio]
privacy: local-only | self-hosted | browser-url | hosted-preview
```

## Path matrix

| Situation                                                                             | Path                                            |
| ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Flowchart, sequence, class, state, ER, gantt, mindmap, timeline, C4 and CLI available | Mermaid -> draw.io CLI -> `.drawio`             |
| Custom styling, icons, zones, swimlanes, exact placement, no CLI                      | Direct XML on rigid grid                        |
| Structure-only flow/tree/network and CLI available                                    | XML -> draw.io CLI `--layout`                   |
| MCP tools available and user wants live iteration                                     | MCP create/edit/export, then local verification |
| User wants browser opening without install                                            | `.drawio` plus `app.diagrams.net/#create=` URL  |

## Recipes

### Flowchart

Use vertical or horizontal monotonic reading order. Keep decisions as diamonds. Limit edge labels to short conditions. Use orthogonal edges.

### Sequence

Use participants as columns. Messages flow top to bottom. Use simple labels and avoid diagonal connectors.

### Architecture/cloud

Use zones: client, edge, services, data, observability/external. Use icons plus labels. Keep data stores visually distinct. Add trust/security boundaries as containers.

### Network

Use layers: internet, perimeter, app subnet, data subnet, management. Prefer native network stencils. Avoid crossing links.

### Swimlane

Use lanes as containers. Time/order flows left-to-right or top-to-bottom. Each step belongs to exactly one lane.

### Timeline

Use one axis. Keep milestones evenly spaced. Use concise date labels.

### Comparison/matrix

Use tables or aligned columns. Keep repeated row labels consistent.

Sources: integrated from draw.io CLI/Mermaid workflows, layout recipes, planning/privacy rules, and draw.io XML/container guidance.
