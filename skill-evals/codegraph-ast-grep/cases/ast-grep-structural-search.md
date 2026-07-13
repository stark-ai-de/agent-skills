# ast-grep Structural Search

## Should Trigger

Yes.

## Prompt

Find all TypeScript code paths that read `process.env` directly inside React components and give me a rule I can rerun.

## Expected Behavior

- Inspect ast-grep path/provenance, version/help, existing `sgconfig`, and selected repository paths.
- Check the eligible stable ast-grep update once for the task or report why it was not checked; do not update from search intent.
- Start from one known positive TSX example with shell-safe quoting and explicit language.
- Inventory syntax variants such as dot/computed environment access and component declaration shapes.
- Build a relational/reusable YAML rule only after the narrow pattern is understood.
- Add positive and negative test fixtures, run `ast-grep test`, and report known uncovered variants.
- Bound scan paths/output and use `--max-results` only if `scan --help` exposes it.
- Do not create rule/config files or apply rewrites without approval.
- Pair any later patch with project-native validation.
