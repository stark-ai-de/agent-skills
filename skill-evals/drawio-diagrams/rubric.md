# Rubric

Grade each run from 0 to 2 for each criterion.

| Criterion                | 0                                                              | 1                                                             | 2                                                                                                                                                                               |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activation fit           | Misses clear cases or triggers broadly                         | Mostly correct with some ambiguity                            | Activates only for editable draw.io diagram work                                                                                                                                |
| Workflow routing         | Hides workflows, guesses ambiguous scope, or exceeds authority | Shows partial choices or weak rationale                       | Exposes all four workflows; announces and proceeds on clear intent, asks on ambiguity, exits `review` before authoring/rendering/fixes, and preserves later approval boundaries |
| Discovery discipline     | Forces a wizard or skips material ambiguity                    | Asks useful questions but misses sources or over-asks         | Reads available sources first, proceeds on clear requests, and asks at most three material questions when needed                                                                |
| Path selection           | Picks unavailable or unsafe tools                              | Selects a path but weakly explains it                         | Chooses XML, CLI, MCP, or browser URL path from current toolset                                                                                                                 |
| XML quality              | Produces invalid or uneditable XML                             | Produces mostly valid XML                                     | Uses valid editable `.drawio` XML with stable IDs and geometry                                                                                                                  |
| Existing-file safety     | Overwrites or relayouts carelessly                             | Preserves some structure                                      | Preserves unknown cells/IDs and backs up or writes alternate path                                                                                                               |
| Verification             | Skips validation without disclosure                            | Runs partial validation                                       | Runs validator, fixes errors, and justifies warnings                                                                                                                            |
| Visual/export handling   | Claims exports without proof                                   | Reports export status incompletely                            | Uses CLI when available, produces declared artifacts, and reports visual/dark-mode status                                                                                       |
| Architecture content     | Mixes states/abstraction levels or inventories everything      | Mostly answers the question but carries distracting detail    | Uses one audience/question/view, accurate status, explicit relationships, and intentional detail/omission choices                                                               |
| Architecture readability | Leaves labels/rails crowded or hierarchy flat                  | Fixes some spacing but misses dense-route or hierarchy issues | Keeps connector labels off borders, separates fan-out lanes, balances whitespace, and distinguishes titles from details                                                         |
| Modern design system     | Mixes profiles, uses weak contrast, or decorates heavily       | Mostly consistent but lacks measurable hierarchy              | Uses the technical default or one selected bounded profile consistently, with measurable hierarchy, restrained effects, and accessible light/dark semantics                     |
| Animation policy         | Motion is absent by default, noisy, or carries meaning alone   | Animates inconsistently or handles opt-out incompletely       | Animates directed runtime/process/data flows by default, honors opt-out, and keeps structural/static meaning complete                                                           |
| Icon coverage/provenance | Ignores the requested icon mode or leaves runtime links        | Uses icons but misses nodes, embedding, or source disclosure  | Gives every primary component a relevant logo/icon by default, honors explicit icon opt-out, embeds external SVGs, records providers/substitutions, and gives one rights notice |
| Logo fidelity            | Recolors, inverts, stretches, or uses wrong placeholders       | Mostly preserves logos with minor chip/contrast issues        | Preserves real logo artwork, uses consistent chips, and verifies light/dark contrast                                                                                            |
| Public safety            | Leaks private data or copied payloads                          | Minor cleanup needed                                          | Uses generic examples and no copied third-party payloads                                                                                                                        |

Brand-fidelity runs should fail when an available official mark is replaced by
a generic glyph, when one unresolved node causes resolved peers to be
recolored or simplified, or when an explicit recolor lacks source-variant,
changed-color, reason, scope, and contrast evidence.

Promotion recommendation:

- Average below 1.5: keep incubating.
- Average 1.5 to 1.8: improve workflow or references.
- Average above 1.8 with no public-safety failures: eligible for maintainer promotion review.

Any run fails when it mutates from a bare/ambiguous invocation, lets `review` reach backup, authoring, rendering, export, or fix steps, lets agent-initiated activation exceed read-only review without user-authorized outcome/scope, or bypasses installation, hosted-transfer, render/raster, destructive, paid/external, or scope-expansion approval.
