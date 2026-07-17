# Diagram type playbook

Before authoring, classify the diagram and build a semantic model.

## Semantic model

```yaml
diagram_type: architecture | flow | sequence | er | class | state | c4 | bpmn | sysml | ml | network | swimlane | timeline | comparison | other
audience: engineering | executive | operations | teaching
question: "What must this view let the audience decide or understand?"
view: context | container-runtime | deployment | dynamic-data-flow | operations | other
state: current | target | current-vs-target
nodes: []
edges: []
groups: []
layers: []
icons: []
design_profile: technical | operator-grid | isometric-air | neon-hub | aurora-story | adapted-<short-name>
theme_mode: adaptive | light | dark
animation: on | off | preserve
outputs: [drawio]
privacy: local-only | self-hosted | browser-url | hosted-preview
```

## Conditional discovery checkpoint

Read the repository's README, architecture docs, specs, ADRs, APIs, manifests, and existing diagrams before asking questions. Infer safe defaults and state them. Do not force a wizard on a simple flowchart or a fully specified architecture request.

For ambiguous or expensive work, use the host's native planning or question mode when available. Ask at most three grouped questions, and only when the answer changes one of these:

- audience and decision/question
- view, scope, abstraction level, or current/target state
- privacy, branding/icon mode, animation opt-out, or required exports

Tool detection is automatic. Ask separately only for actions that need approval: installation, hosted diagram services, bulk downloads, persistent caches, or network access when the host requires consent. Selected public SVG lookup is not a legal-approval question. Animation and icon-first presentation are on by default, so neither is a required setup question.

Record a one-line readiness profile before authoring:

```text
engineering audience · container/runtime view · current state · technical profile · adaptive theme · local-only · animation on · drawio + light PNG + dark SVG
```

## Path matrix

| Situation                                                                             | Path                                            |
| ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Flowchart, sequence, class, state, ER, gantt, mindmap, timeline, or C4                 | Direct XML with the matching notation recipe             |
| Custom styling, icons, zones, swimlanes, or exact placement                            | Direct XML on a rigid grid                               |
| Large flow/tree/network without a verified layout tool                                 | Direct XML with explicit lanes, ranks, and routing       |
| Desktop CLI available and an export smoke test succeeds                                | Export/render completed `.drawio`; do not assume import  |
| MCP tools available, capability verified, and user wants live iteration                | MCP create/edit/convert/export, then local verification  |
| User wants browser opening without install                                             | `.drawio` plus `app.diagrams.net/#create=` URL           |

## Recipes

### Flowchart

Use vertical or horizontal monotonic reading order. Keep decisions as diamonds. Limit edge labels to short conditions. Use orthogonal edges.

### Sequence

Use participants as columns. Messages flow top to bottom. Use simple labels and avoid diagonal connectors.

### Architecture/cloud

Choose one architecture view from the content gate below. Use zones only for real scope, deployment, trust, or responsibility boundaries. Use icons with labels, keep data stores distinct, and make current, target, optional, and blocked paths explicit without relying on color alone.

### Network

Use layers: internet, perimeter, app subnet, data subnet, management. Prefer native network stencils. Avoid crossing links.

### Swimlane

Use lanes as containers. Time/order flows left-to-right or top-to-bottom. Each step belongs to exactly one lane.

### Timeline

Use one axis. Keep milestones evenly spaced. Use concise date labels.

### Comparison/matrix

Use tables or aligned columns. Keep repeated row labels consistent.

### Formal and domain notation

| Family    | Must preserve                                                                                                                                                                               | Keep out or move to detail                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| ERD       | entities, primary/foreign keys, nullable/unique cues when relevant, named cardinality, associative entities                                                                                 | service icons, runtime calls, every non-key column when the question is relational structure               |
| UML class | class/interface/stereotype, readable compartments, visibility and type where relevant, exact association/aggregation/composition/generalization semantics                                   | runtime sequence, database decoration, method bodies                                                       |
| UML state | explicit initial/final states, event/guard/action labels, legal transitions, composite states only when needed                                                                              | implementation call graph, unlabeled decorative arrows                                                     |
| C4        | one level and scope per page, element type, responsibility, technology where useful, directional labelled relationships, external/owned boundary                                            | mixed Context/Container/Component inventory, deployment detail unless that is the chosen view              |
| BPMN      | typed start/intermediate/end events, tasks, gateways, pools/lanes, sequence flow within a pool and message flow across participants                                                         | architecture ownership edges, unlabeled gateway branches, animation on associations or message annotations |
| SysML     | declare the diagram kind; retain typed blocks/ports, item flows, requirement IDs and satisfy/verify/derive relations where applicable                                                       | mixed BDD/IBD/requirements semantics on an unlabeled page, decorative service logos that obscure notation  |
| ML/DL     | when known and relevant to the question: data source, feature/tensor shape, transformation/layer role, model/artifact version, training versus inference boundary, outputs, and key metrics | every neuron/layer when a grouped block answers the question, animation on static model structure          |

Formal notation wins over icon-first decoration. Use a small product logo only when it identifies a real platform boundary; do not turn entities, UML classifiers, states, BPMN symbols, requirements, or tensor blocks into generic icon cards. Animate only directed runtime/data/process execution edges whose static arrow and label remain complete.

## Architecture content gate

An architecture diagram is a view, not an inventory. Keep one stakeholder question and one abstraction level per page. Split the view when it exceeds roughly 15 primary nodes, serves two audiences, or mixes runtime, deployment, activation procedure, and source-package detail.

| View                  | Must show                                                                                                                                                  | Add only when it changes the story                                     | Keep out or move to detail                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Context               | system in scope, people/roles, external systems, directional interactions, explicit boundary                                                               | trust boundary, critical data source/sink                              | internal services, ports, packages, deployment nodes                         |
| Container/runtime     | deployable apps and data stores, responsibility, technology, directional runtime relationships, protocols across process boundaries, external dependencies | critical queues, failover, retries, observability, security boundaries | methods, exhaustive routes, source tree, every config key, package inventory |
| Deployment            | environment, regions/zones/nodes, deployed instances, scaling/failover, network and trust boundaries, persistent stores                                    | operational ownership, probes, backup/restore path                     | internal code components and ordinary business flow                          |
| Dynamic/data flow     | one named scenario, ordered handoffs, payload/data class where relevant, protocol, trust changes, source/sink                                              | alternate/error path when central to the question                      | unrelated components, all endpoints, static ownership lines                  |
| Operations/activation | current/target status, gates, owner, deploy/rollback sequence, health/evidence checkpoints                                                                 | blocked and optional branches, recovery path                           | full steady-state internals unless required by a gate                        |

Use 3-6 named scenarios only when runtime behavior is the purpose. Steps describe handoffs between components, not every internal state. Retries, fan-out, fallbacks, telemetry, dashboards, mocks, and admin paths are optional: show them when the audience needs them to understand risk, operation, or behavior.

### Required architecture semantics

- Title names diagram type and scope; subtitle states the question or state when useful.
- Each primary element has a name, type/role, concise responsibility, and technology where it matters.
- Each relationship is directional and labelled with intent; add protocol/technology across process boundaries.
- Explain non-obvious colors, borders, line styles, icons, animation, or status in a compact legend.
- Keep names and semantics consistent across overview and detail pages.
- Mark evidence source or last-updated metadata when freshness materially affects decisions.

### Intentional omission pass

Before layout, classify candidate content:

- **Keep:** directly answers the stakeholder question or defines scope/trust.
- **Detail later:** useful implementation, package, route, inventory, or operational detail that can live on another page/layer.
- **Omit:** secrets, credentials, private paths/hostnames, decorative infrastructure, duplicated labels, unverified claims, and speculative components presented as current.

Report the important `Detail later` and `Omit` choices at delivery so the user can challenge the abstraction without reading the XML.

Sources: original guidance informed by the official C4 [diagram types](https://c4model.com/diagrams), [notation](https://c4model.com/diagrams/notation), and [review checklist](https://c4model.com/diagrams/checklist); [Azure Well-Architected diagram guidance](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/design-diagrams); draw.io technical-diagram practice; and public architecture-skill patterns for audience-specific flows. No third-party skill text or templates are copied.
