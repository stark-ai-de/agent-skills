---
name: codegraph-ast-grep
description: Set up and use CodeGraph plus ast-grep for Codex CLI MCP configuration, repo exploration, symbol lookup, call graphs, impact analysis, structural search, and safe refactor planning. Use when the user asks to install, configure, initialize, verify, or use CodeGraph with ast-grep in a code repository.
license: Apache-2.0
metadata:
  internal: true
  author: stark-ai-de
  category: codex-operations
  version: "0.1.0"
---

# CodeGraph + ast-grep

## Goal

Help Codex use CodeGraph and ast-grep together: CodeGraph for semantic repository maps, symbol lookup, call flow, and impact analysis; ast-grep for deterministic AST-based pattern search, rule testing, and refactor planning.

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

- Repository root, package manager, monorepo layout, and existing `.codex/`, `.codegraph/`, `sgconfig.yml`, or `sgconfig.yaml` files.
- `git status --short` before changing any files.
- Codex MCP status through `/mcp` or `codex mcp --help` where available.
- CodeGraph health through `codegraph status` when CodeGraph is installed.
- ast-grep availability through `ast-grep --version` and optional ast-grep MCP availability.

## Workflow

1. Identify the user's goal: setup, verification, exploration, impact analysis, structural search, or refactor planning.
2. Check existing state before proposing changes: repo root, `.codegraph/`, Codex MCP config, ast-grep config, and tool versions.
3. For setup, read `references/setup-and-mcp-config.md` and produce commands that the user can review before any global install or config write.
4. For exploration, use CodeGraph first: status, file map, symbol search, callers/callees, node details, and impact radius. Use large context-building tools only when targeted output is needed.
5. For structural matching, use ast-grep after the target syntax shape is known. Prefer `find_code` or simple CLI patterns first, then YAML rules for relational or multi-condition matches.
6. For refactors, combine both tools: CodeGraph to scope impacted symbols and files, ast-grep to match exact syntax, then project validation such as typecheck, lint, tests, or build.
7. Summarize commands run, findings, proposed edits, validation, and remaining risk.

## Safety rules

- Do not run global installs, modify `~/.codex/config.toml`, or write project config without explicit approval.
- Do not use `curl | sh` or equivalent install pipelines in default instructions.
- Do not treat CodeGraph as a compiler, type checker, linter, or test runner.
- Do not apply ast-grep rewrites automatically unless the user asked for the rewrite and the patch is reviewed.
- Keep private repo paths, tokens, customer data, and internal hostnames out of skill examples.
- Prefer project-local or printed config snippets before global configuration.
- If MCP tools are unavailable, fall back to CLI commands and explain the limitation.

## References

Read only what the task needs:

- `references/setup-and-mcp-config.md` for installation, Codex MCP, and repo initialization.
- `references/usage-playbook.md` for choosing CodeGraph vs ast-grep during exploration and refactors.
- `references/ast-grep-rule-recipes.md` for TypeScript/TSX structural-search examples.
- `references/troubleshooting.md` for MCP, indexing, backend, and matching failures.

## Scripts

No bundled scripts. This skill documents commands only; any install or config-changing command must be approved before execution.

## Output format

Return:

1. Current tool/config state
2. Recommended setup or usage path
3. Commands to run, grouped by approval level
4. Findings from CodeGraph or ast-grep
5. Proposed edits or refactor scope
6. Validation commands and results
7. Remaining risks or fallback path

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
