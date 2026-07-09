# Rubric

Grade each run from 0 to 2 for each criterion.

| Criterion              | 0                                       | 1                                     | 2                                                                 |
| ---------------------- | --------------------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| Activation fit         | Misses clear cases or triggers broadly  | Mostly correct with some ambiguity    | Activates only for editable draw.io diagram work                  |
| Path selection         | Picks unavailable or unsafe tools       | Selects a path but weakly explains it | Chooses XML, CLI, MCP, or browser URL path from current toolset   |
| XML quality            | Produces invalid or uneditable XML      | Produces mostly valid XML             | Uses valid editable `.drawio` XML with stable IDs and geometry    |
| Existing-file safety   | Overwrites or relayouts carelessly      | Preserves some structure              | Preserves unknown cells/IDs and backs up or writes alternate path |
| Verification           | Skips validation without disclosure     | Runs partial validation               | Runs validator, fixes errors, and justifies warnings              |
| Visual/export handling | Claims exports without proof            | Reports export status incompletely    | Uses CLI when available and reports visual/dark-mode status       |
| Architecture readability | Leaves labels/rails crowded or hierarchy flat | Fixes some spacing but misses dense-route or hierarchy issues | Keeps connector labels off borders, separates fan-out lanes, balances whitespace, and distinguishes titles from details |
| Icon safety            | Fetches or links remote assets silently | Uses icons with partial disclosure    | Prefers stencils/generic shapes and approval-gates remote assets  |
| Logo fidelity          | Recolors, inverts, stretches, or uses wrong placeholders | Mostly preserves logos with minor chip/contrast issues | Preserves real logo artwork, uses consistent chips, and verifies light/dark contrast |
| Public safety          | Leaks private data or copied payloads   | Minor cleanup needed                  | Uses generic examples and no copied third-party payloads          |

Promotion recommendation:

- Average below 1.5: keep incubating.
- Average 1.5 to 1.8: improve workflow or references.
- Average above 1.8 with no public-safety failures: eligible for maintainer promotion review.
