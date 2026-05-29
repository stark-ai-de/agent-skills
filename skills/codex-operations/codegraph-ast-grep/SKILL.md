---
name: codegraph-ast-grep
description: Use when a repo needs CodeGraph plus ast-grep for Codex MCP setup, exploration, impact analysis, structural search, or safe refactor planning.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: codex-operations
  version: "0.1.1"
---

# CodeGraph + ast-grep

## Goal

Help Codex use CodeGraph and ast-grep together: CodeGraph for semantic repository maps, symbol lookup, call flow, call-path tracing, and impact analysis; ast-grep for deterministic AST-based pattern search, rule testing, and refactor planning.

## When to use

- The user asks to set up CodeGraph, ast-grep, or MCP servers for Codex CLI.
- A repo needs faster exploration before debugging, refactoring, review, or architecture work.
- The task requires finding symbols, callers, callees, affected files, route handlers, imports, or structural code patterns.
- The user mentions `codegraph`, `ast-grep`, `sg`, `codex mcp`, `.codegraph`, `sgconfig`, structural search, or AST rules.

## When not to use

- The task is a normal one-file edit that does not need repo-level exploration.
- The user only needs TypeScript, lint, test, or build validation; use the project tools directly.
- The user asks for a broad repo audit unrelated to CodeGraph or ast-grep; use a repo audit skill if available.
- The user wants a destructive rewrite without review, validation, or approval.

## Inputs to inspect

- Repository root, monorepo layout, and existing `.codex/`, `.codegraph/`, `sgconfig.yml`, or `sgconfig.yaml` files.
- For setup tasks, available package managers and tool paths.
- `git status --short` before changing any files.
- Codex MCP status through `/mcp` or `codex mcp --help` where available.
- CodeGraph health through `codegraph status` when CodeGraph is installed.
- ast-grep availability through `ast-grep --version` and optional ast-grep MCP availability.

## Workflow

1. Identify the user's goal: setup, verification, exploration, impact analysis, structural search, or refactor planning.
2. Check existing state before proposing changes: repo root, `.codegraph/`, Codex MCP config, ast-grep config, and tool versions.
3. For setup, read `references/setup-and-mcp-config.md`, inspect available package managers, present the global vs repo-local tradeoff table with global marked as the recommended default, then ask the user whether to continue and which scope/package-manager path to use.
4. Produce commands for review before any tool install or config write.
5. For setup installs, respect the selected package manager's freshness, trust, and build-script policy. If policy affects the installed version or install behavior, report that without bypassing it unless the user explicitly asks for an exception.
6. After CodeGraph initialization, check whether `.codegraph/` is untracked and add or recommend a repo `.gitignore` entry before finalizing setup.
7. For exploration, use CodeGraph first: status, file map, symbol search, callers/callees, trace, node details, and impact radius. Use large context-building tools only when targeted output is needed.
8. For structural matching, use ast-grep after the target syntax shape is known. Prefer `find_code` or simple CLI patterns first, then YAML rules for relational or multi-condition matches.
9. For refactors, combine both tools: CodeGraph to scope impacted symbols and files, ast-grep to match exact syntax, then project validation such as typecheck, lint, tests, or build.
10. Summarize commands run, findings, proposed edits, validation, and remaining risk.

## Safety rules

- Do not install tools, modify `~/.codex/config.toml`, or write project config without explicit approval.
- Do not paste full MCP config files into chat; inspect server names first and redact secrets or static headers.
- Do not use `curl | sh` or equivalent install pipelines in default instructions.
- Do not bypass package-manager freshness, trust, or build-script approval policies unless the user explicitly asks for that exception.
- Do not assume global vs project-local installs, or a package manager, when setup will modify the user's machine or repo.
- Do not treat CodeGraph as a compiler, type checker, linter, or test runner.
- Do not apply ast-grep rewrites automatically unless the user asked for the rewrite and the patch is reviewed.
- Keep private repo paths, tokens, customer data, and internal hostnames out of skill examples.
- Prefer printed config snippets until the user approves an install/config scope; for personal multi-repo use, global is the recommended setup.
- If MCP tools are unavailable, fall back to CLI commands and explain the limitation.

## References

Read only what the task needs:

- `references/setup-and-mcp-config.md` for installation, Codex MCP, and repo initialization.
- `references/usage-playbook.md` for choosing CodeGraph vs ast-grep during exploration and refactors.
- `references/ast-grep-rule-recipes.md` for TypeScript/TSX structural-search examples.
- `references/troubleshooting.md` for MCP, indexing, backend, and matching failures.

## Scripts

No bundled scripts.

## Output format

Always return current tool/config state, findings or recommended path, commands run or proposed commands with approval boundaries, validation results, and remaining risk.

For setup tasks only, also include user choices needed or received, recommendation tradeoffs, a short explanation of what improves after setup, and the selected install/config commands.

## Completion criteria

- The user has a clear CodeGraph + ast-grep setup or usage plan for the current repo.
- MCP configuration is verified or a fallback CLI path is documented.
- Exploration uses CodeGraph for semantic scope and ast-grep for exact structure.
- Any planned edits are scoped, reviewable, and paired with project validation.

## Failure modes

- If CodeGraph is not installed or not initialized, provide safe setup commands instead of pretending MCP tools exist.
- If `.codegraph/` is stale, run or recommend `codegraph sync` before relying on graph results.
- If `codegraph status` reports a slow WASM backend or database locking, use `references/troubleshooting.md`.
- If ast-grep finds no matches, inspect syntax with a smaller pattern or `dump_syntax_tree` before broadening the search.
- If Codex MCP is unavailable, use CLI equivalents and tell the user what could not be verified.
