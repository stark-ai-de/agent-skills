# drawio-diagrams architecture-quality benchmark

This is the public, candidate-neutral protocol for comparing architecture-diagram outcomes. It is not a published win. Until publishable results and sanitized raw artifacts are available, claims must describe the skill's documented contract and eval coverage rather than say it outperforms another skill.

Under ADR-0030, named external candidates, repository links, exact external revisions, identity mappings, and identifying raw artifacts remain maintainer-local. Public evidence in this repository uses neutral candidate roles and must not identify an external comparison target.

## Scope

The benchmark tests modern, reviewable architecture diagrams and artifact robustness. It does not measure the breadth of code/IaC importers, presentation exporters, runbook generators, or other companion tools.

## Freeze and held-out tasks

1. Privately pin both skill revisions, the model/version, host, draw.io version, tool image, limits, and scoring code before authoring benchmark prompts. Public freeze metadata uses the subject revision plus an opaque baseline digest rather than an external project name, URL, or revision.
2. After that freeze, an evaluator who did not implement either candidate creates 12 neutral held-out task bundles. Publish their SHA-256 manifest before the first run, then publish the full prompts and inputs with any public result.
3. Keep benchmark inputs outside either runtime skill and training/eval corpus. Existing-file fixtures must be benchmark-owned, contain no candidate metadata or conventions, and be identical for both candidates.
4. Prompts say “use the assigned draw.io skill”; the harness activates exactly one installed candidate in a clean workspace. They must not name either skill, helper scripts, profile names, XML property names, validator commands, or a candidate-specific workflow.
5. Use the same model settings, host, tool permissions, source evidence, time limit, and empty workspace. Disable cross-run memory. Run each task three times per skill and pair runs by task and trial.

The 12 held-out bundles cover these scenario slots without reusing prompts from `cases/`:

| Slots | Pressure                                                                 |
| ----: | ------------------------------------------------------------------------ |
|   1-2 | evidence-based architecture content selection and current/target claims  |
|   3-4 | context/ownership boundaries and conflicting source evidence             |
|   5-6 | dense fan-out/routing and adaptive light/dark readability                |
|   7-8 | portable icon coverage and animated runtime flow versus static structure |
|  9-10 | surgical multi-page/layer edit and compressed-source preservation        |
|    11 | progressive disclosure across overview and detail pages                  |
|    12 | formal ER, UML, BPMN, SysML, or ML notation selected by seeded rotation  |

Exact output names and requirements for editable, self-contained artifacts are neutral and may be specified. The scorer must accept any valid light/dark, icon, layout, or animation technique; it must not require `adaptiveColors`, `light-dark(...)`, `dataRole`, stable candidate-specific IDs, or output from a particular helper.

## Scoring

Score every run out of 100:

| Dimension                      | Points | Evidence                                                   |
| ------------------------------ | -----: | ---------------------------------------------------------- |
| Editable artifact validity     |     20 | neutral XML, reference, geometry, and render checks        |
| Semantic fitness               |     20 | blind review against prompt and source evidence            |
| Layout and routing             |     15 | blind light-render review                                  |
| Light/dark and accessibility   |     15 | neutral checks plus blind light/dark review                |
| Preservation and editability   |     10 | neutral before/after structure comparison                  |
| Icon relevance and portability |      8 | neutral source checks plus blind review                    |
| Animation semantics            |      7 | neutral graph/render inspection and static-fallback review |
| Honest scope and omissions     |      5 | blind response review                                      |

Invalid or missing `.drawio` output scores zero for artifact validity and every dimension that cannot be inspected; do not silently substitute a raster image. Reviewers see randomized run IDs, standardized exports, the prompt, and allowed source evidence—not skill names or response boilerplate. A separate neutral evaluator inspects editable sources and preservation, derives semantic edge roles from endpoints, arrowheads, labels, and the task, and records ambiguous cases for blind adjudication.

## Public claim threshold

Publish an outcome claim in this repository only when all are true:

- all 72 runs and sanitized raw artifacts are published with the prompt/input manifest, subject revision, opaque baseline digest, model/tool versions, failures, and scores;
- the paired mean advantage has a positive 95% percentile-bootstrap confidence interval: first average the three paired trial deltas within each task, then resample the 12 task-level deltas with replacement for at least 10,000 replicates; publish the seed, replicate count, and implementation;
- the candidate has a positive mean in at least 8 of 12 tasks;
- it does not trail by more than 10 percentage points in artifact validity, preservation, or accessibility.

Report per-task and per-dimension results, not only a total. If complete evidence cannot be published without identifying an external comparison target, keep the result and claim maintainer-local. Re-freeze and author a new held-out set after a material skill, evaluator, model, or draw.io change; never optimize either skill against the disclosed prompts and then reuse them for a release claim.
