# 2026-05-29 Promotion Review

## Scope

Static promotion review for moving `codegraph-ast-grep` from incubator to the public catalog.

## Evidence

- Skill has a focused trigger description for CodeGraph, ast-grep, Codex MCP setup, repo exploration, impact analysis, structural search, and safe refactor planning.
- Runtime guidance has explicit negative scope for ordinary one-file edits, typecheck-only validation, broad unrelated audits, and destructive rewrites.
- Safety rules require package-manager and install-scope selection plus approval before tool installs, project dependency changes, Codex config writes, project config writes, CodeGraph initialization, or ast-grep rewrites.
- References separate setup, usage, rule recipes, and troubleshooting so `SKILL.md` stays concise.
- Current CodeGraph guidance includes MCP trace coverage and CLI fallback paths.
- Eval cases cover setup, semantic exploration, structural search, refactor planning, typecheck-only negative activation, and destructive rewrite safety.

## Result

Promotion-ready after validation passed.

Validation evidence captured during promotion review:

- `npm run validate` passed.
- `npm run list` listed `codegraph-ast-grep` as a public skill.
- `npm run list:incubator` did not list `codegraph-ast-grep`.
- `npx skills@latest add ./skills --list` listed 3 public skills including `codegraph-ast-grep`.
- `npm run smoke:install` passed clean-copy public install discovery.
- `node scripts/check-release-intent.mjs --base-ref origin/main && node scripts/validate-release.mjs --base-ref origin/main` passed for `v0.3.0`.
- `pnpm format:check` passed.
- `git diff --check && git diff --cached --check` passed.
