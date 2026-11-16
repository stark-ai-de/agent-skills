# Claude review procedure

Read before substantive review. Paths and commands below are relative to the selected skill directory.

Every route applies the same review quality to the explicitly requested scope before planning or cleanup. A request about one file or claim does not authorize inspecting the entire store: use targeted reads instead of whole-root inventory/scanner commands, and consult other evidence only to resolve an in-scope conflict. Delivery never reduces review quality:

1. Resolve the selected route, target repo, Claude home, auto-memory path, persistence path when applicable, and protected state.
2. Inventory Claude context without dumping contents:

   ```bash
   node scripts/inventory-claude-memory.mjs --repo .
   ```

   Add `--claude-home PATH` or `--memory-dir PATH` when the user provides non-default locations. Use `--json` when structured evidence is useful.

3. Run the redacted risk scanner when looking for sensitive, stale, broad, local, repo-specific, ignored, or conflict-prone entries:

   ```bash
   node scripts/scan-claude-memory-risks.mjs --repo . --json
   ```

   Exit code `1` means findings were found, not that the scan failed. Summarize counts and highest-signal redacted findings instead of pasting the full payload.

4. Parse `.claude/rules/**/*.md` frontmatter for `paths` so path-scoped guidance is not treated like always-loaded guidance.
5. Inspect visible settings for `autoMemoryEnabled`, `autoMemoryDirectory`, `claudeMdExcludes`, permission rules, and hooks when they affect placement.
6. Treat managed policy files and managed settings as higher-precedence read-only evidence by default.
7. Treat `MEMORY.md` as the auto-memory entrypoint. Treat topic files as on-demand detail unless the user asks to audit the whole memory directory.
8. Read context files in bounded chunks and redact sensitive values.
9. Extract one atomic claim per row. Split compound entries before classification.
10. Verify disputed claims against only the repo files needed for the dispute. Load `references/conflict-resolution.md` when precedence is unclear.
11. Assign exactly one primary classification per atomic claim: `KEEP`, `KEEP BUT REWRITE`, `MOVE TO CLAUDE.md`, `MOVE TO CLAUDE.local.md`, `MOVE TO CLAUDE RULE`, `MOVE TO AUTO MEMORY TOPIC`, `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, `MOVE TO SKILL`, `MOVE TO SETTINGS`, `MOVE TO HOOK`, `MOVE TO MANAGED POLICY`, `DELETE`, or `ASK USER`.
12. Tag high-risk entries as useful context only: `stale`, `duplicated`, `too-broad`, `too-specific`, `repo-specific`, `workflow`, `config`, `sensitive`, `conflicting`, `unenforced`, `managed-policy`, or `useful`.
13. Add confidence (`high`, `medium`, or `low`) and a proposed action to every entry.
14. Produce the complete review before planning or editing. Route delivery must not reduce review quality or expand the requested scope.
