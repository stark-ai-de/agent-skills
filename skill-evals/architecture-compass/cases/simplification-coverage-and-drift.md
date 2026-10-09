# Simplification coverage and concurrent drift

## Should Trigger

Yes.

## Prompt

Continue the approved simplification of all TypeScript files. The inventory has
60 tracked TS/TSX files: 42 implementation, 12 tests and 6 generated declarations.
There are also two non-ignored untracked `.mts` helpers, a filename containing a
newline, and a symlink outside the approved root. Structural search inspected
54 tracked files; the semantic tool is unavailable. A
previous receipt covers the old lockfile. Another contributor has now changed
that lockfile and an overlapping source file. Preserve their work and explain
which coverage and proof can still be claimed. No tool installation is authorized.

## Deterministic Assertions

- contains: 60
- contains: 54
- contains: 6
- contains: untracked
- contains: 62
- contains: unavailable
- contains: stale
- not_contains: complete semantic review
- not_contains: all tests passed on the new candidate

## Expected Behavior

- Reconcile all 60 files with 54 structurally inspected files and six explicitly
  excluded generated declarations plus two untracked helpers (62 source files
  total, before exclusions). Do not silently lose `.mts`/`.cts` or newline-bearing
  paths; use NUL-delimited inventory. Report actual candidate/caller review apart.
- Do not follow the out-of-scope symlink or stage files to make inventory complete.
- Use available imports, textual search and focused runtime proof as a named
  fallback. Missing semantic tooling does not authorize installation or a claim
  that all files were semantically reviewed.
- Stop dependent edits on overlapping state drift, preserve the other author's
  work and reconcile scope/governance before resuming the approved slice.
- Invalidate affected lockfile/source receipts; reuse only obligations whose
  complete receipt identity still matches. Do not rerun every gate by ritual.
- Preserve the original cumulative baseline. A new work segment must retain a
  bridge to it; separate task savings from concurrent additions and report
  outstanding CI independently.
