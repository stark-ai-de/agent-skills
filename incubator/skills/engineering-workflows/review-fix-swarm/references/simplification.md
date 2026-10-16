# Behavior-preserving simplification contract

This is an **active implementation task inside a requested review-fix run**. A code review finding zero P1/P2 bugs does **not** complete the simplification stage. Conversely, a reasoned decision to **retain** code is acceptable when no smaller safe solution is demonstrated. Do not create changes solely to show activity.

## Candidate discovery

Within the **entire authorized feature scope**, not just the committed PR diff, inspect:

- Duplicate behavior/validation/types and partially overlapping wrappers.
- Dead code and redundant intermediate layers, adapters or indirection.
- Custom functionality already offered by the **currently installed** language/runtime, framework or **directly declared** dependency.
- Existing, correctly owned common behavior that can replace duplicated logic without creating a new package.
- Excess intermediate allocations, repeated derived work, repeated full scans or expensive control flow when evidenced.

For each candidate first compare **delete → native/framework → declared library → reuse in existing owner → keep**. This ordering is an investigation rubric, not an unconditional preference. Do not introduce dependencies, cross-runtime imports or future-proof abstractions merely to reduce visible file size. Inspect actual callers and package versions. Dynamic registration, reflection, public exports and compatibility facades can make a seemingly unused layer necessary.

## Equivalence proof

Preserve the target repository's accepted architecture and current public contract:

- Public API, types/exports, inputs/outputs, serialization/persistence, defaults, missing/null fields and error behavior.
- Ordering, cancellation, timeout, cleanup, concurrency, backpressure and limits.
- Authorization, privacy, trust/server-browser boundaries; secrets must not become client-accessible.
- UI focus, accessibility, interaction sequence, state transitions and responsive behavior.
- Existing test cases, fixtures, negative cases, assertions and isolation; do not delete validation merely to shrink line count.

For each candidate use `apply` (evidence and measured improvement), `retain` (why existing layer is needed), or `defer` (what proof/authorization is missing). A matching text pattern or smaller diff alone is not proof.

## Fixed-baseline code balance

- Fix the original revision and working-snapshot identity at the start. Track additions/deletions from that base **through all rounds**, not resetting the baseline after each fix.
- Inventory staged, unstaged, non-ignored untracked, renamed and deleted files. Include touched production code, tests/fixtures, examples/scripts and documentation/config, plus new helper files. Separate generated files/lockfiles and third-party/unrelated edits.
- Report physical added/removed/net lines **per category and total**, along with the concrete _maintenance obligation removed_. Show any growth in tests even if production shrinks.
- Neither moving code to helpers nor deleting necessary tests counts as simplification. No arbitrary deletion target.

## Re-review and runtime cost

- After each change verify owners/consumers and targeted behavior checks. Rescan the **entire in-scope inventory** for newly exposed duplication and changed consumers before `DONE`.
- Reuse evidence only if code, dependencies, fixtures, toolchain and tested boundary have not materially changed.
- For a claimed performance improvement, benchmark **before and after actual implementations** with same toolchain/data; representative sizes and edge cases, warmed alternating runs, median and variance. Report noise honestly and reject reproducible regressions. Fewer lines do not prove faster execution.

## Sources and scope

The [Architecture Compass simplification guide](https://github.com/stark-ai-de/agent-skills/blob/main/skills/engineering-workflows/architecture-compass/references/ac-adr-006-assign-workspace-ownership-and-source-roles.guide.md) provides public background. It does not automatically impose binding ADRs on another repository. Use the target repository's own accepted decisions, test contracts and user-approved scope. Private maintainer provenance remains local under ADR-0056.
