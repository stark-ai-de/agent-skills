# Codex review procedure

Read before substantive review. Paths and commands below are relative to the selected skill directory.

Every route applies the same review quality to the explicitly requested scope before planning or cleanup. A request about one file or claim does not authorize inspecting the entire store: use targeted reads instead of whole-root inventory/scanner commands, and consult other evidence only to resolve an in-scope conflict. Delivery never reduces review quality:

1. Resolve the selected route, Codex home, repo target, persistence path when applicable, and protected state. Discover Codex home as follows:

   Use `${CODEX_HOME}` when set; otherwise use the user's home directory plus `.codex`.

2. For requests that explicitly cover the entire memory store, inventory all memory files without dumping contents:

   ```bash
   node scripts/inventory-memories.mjs
   ```

   For a narrower request, skip this whole-store command and inventory only the explicitly requested paths with targeted reads.

3. For a store-wide request, run the redacted risk scanner when looking for sensitive, stale, broad, local, repo-specific, or config-like entries:

   ```bash
   node scripts/scan-memory-risks.mjs --json
   ```

   For a single-file or single-claim review, use targeted reads in the requested scope; do not run this whole-store scanner because it has no file selector. Exit code `1` means findings were found, not that the scan failed. The scanner caps returned findings and skips generated evidence by default; raise `--max-findings` or add `--include-generated-evidence` only when needed.
   Use scanner JSON as evidence; report counts and the highest-signal redacted findings instead of pasting the full payload.

4. If configuration is requested or needed to resolve an in-scope conflict, locate memory/config signals across the entire `<codex-home>/config.toml` with `node scripts/locate-memory-config.mjs --json`. The locator emits line numbers and fixed signal names, never values. Inspect only relevant bounded sections, including their table/profile context; redact sensitive values. Candidate matches are not parsed TOML or effective configuration proof.
5. Classify memory mode as disabled, enabled but not injected, enabled and injected, external-context generation disabled, or unknown. Load `references/config-modes.md` for exact mode signals.
6. If multiple memory file types are present, load `references/memory-store-anatomy.md` before deciding what is safe to edit.
7. Read memory files in small chunks; avoid huge dumps and redact sensitive values.
8. Extract one atomic claim per row. Split compound entries before classification.
9. Verify conflicts against only the current repo files needed for the disputed claim. Load `references/conflict-resolution.md` when precedence is unclear.
10. Assign exactly one primary classification per atomic claim: `KEEP`, `KEEP BUT REWRITE`, `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, `MOVE TO SKILL`, `MOVE TO CONFIG`, `DELETE`, or `ASK USER`.

11. Tag high-risk entries as useful context only: `stale`, `duplicated`, `too-broad`, `too-specific`, `repo-specific`, `workflow`, `config`, `sensitive`, `conflicting`, or `useful`.
12. Add confidence (`high`, `medium`, or `low`) and a proposed action to every entry.
13. Produce the complete review before planning or editing. Route delivery must not reduce review quality or expand the requested scope.
