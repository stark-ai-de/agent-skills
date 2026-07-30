# Source Placement and Module Boundary Parity

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan a repository source-layout cleanup. Query
contracts and search-parameter parsing need stable homes; generated code and
infrastructure adapters must not leak into shared runtime modules; and two
temporary exceptions need an auditable allowlist. The repository already has
its own export style. Select the governing ADRs, produce the placement map and
exception fields, and do not move files.

## Deterministic Assertions

- contains: AC-ADR-006
- contains: AC-ADR-007
- contains: lib/queries
- contains: lib/search-params
- contains: infrastructure boundary
- contains: generated boundary
- contains: path
- contains: reason
- contains: owner
- contains: removal condition
- contains: stable export subpaths
- contains: target-dependent convention
- not_contains: universal named-export rule
- not_contains: universal source tree

## Expected Behavior

- Use AC-ADR-006 for ownership and source roles and AC-ADR-007 for runtime-safe
  module and public-package boundaries.
- Place shared query contracts under `lib/queries` and URL parsing under
  `lib/search-params` only when those paths fit the target repository's owning
  boundaries; preserve explicit infrastructure and generated-code boundaries.
- Record every exception with `path`, `reason`, `owner`, and a falsifiable
  `removal condition` instead of accepting an unowned generic allowlist.
- Preserve stable export subpaths. Treat named exports, a primary value per
  module, and type grouping as target-dependent heuristics derived from local
  evidence, not universal Architecture Compass rules.
- Return a read-only placement map and do not infer authority to move files or
  rewrite public exports.
