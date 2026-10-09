# Repeated Simplification Reaches a Bounded Stopping Point

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to reduce custom code across all 12 TypeScript files in `packages/worker`, under accepted local ADR-0012. Repeat until no qualifying optimization remains. No other paths are authorized. The first pass can remove a redundant internal schema type and consolidate identical fixtures; required tests are available. Removing that type exposes an unused internal re-export in another inventoried file. All consumers are inside this package, and no public or runtime boundary depends on the re-export. Existing imports and compiler/tests can resolve the affected consumers; CodeGraph is unavailable. The remaining stream adapter preserves a character limit and a supported public entrypoint. Finish with an evidence-backed receipt.

## Deterministic Assertions

- contains: Selected workflow: refactor
- contains: 12 TypeScript files
- contains: CodeGraph unavailable
- contains: second pass
- contains: cumulative
- contains: complete final pass
- contains: character limit
- not_contains: global optimum achieved

## Expected Behavior

- Expose the five existing workflows and use the authorized bounded refactor without requesting unchanged approval again.
- Establish a fixed baseline and inspect the full 12-file inventory, including files outside an initial diff. Use the available fallback and state its limits without claiming CodeGraph execution or a complete semantic graph.
- Qualify, implement, and prove the first slice, then inspect the newly unused re-export in a second pass. Count every addition and verify affected consumers before deleting it.
- Retain the necessary adapter/public boundary. Re-scan the complete inventory after the retained changes and stop only when no qualifying candidate remains.
- Report actual per-pass and cumulative savings, proof, coverage, rejected candidates, and the bounded stopping reason. Do not invent numeric reductions or successful checks from this prompt's possibilities.
