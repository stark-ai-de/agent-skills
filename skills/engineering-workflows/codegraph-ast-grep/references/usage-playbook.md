# Usage Playbook

Use CodeGraph for semantic scope. Use ast-grep for syntax-exact matches. Use project validation for correctness.

## Simple use cases

| User need                                | How the workflow helps                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Explain why validation or build fails    | CodeGraph maps the command path, then targeted reads inspect only the failing surface.   |
| Change a shared function safely          | CodeGraph finds callers, callees, and likely impact before any patch is written.         |
| Trace a route, request, event, or action | CodeGraph trace follows the path between the start symbol and destination behavior.      |
| Find risky or repeated code shapes       | ast-grep matches syntax such as file writes, deprecated calls, or duplicate handlers.    |
| Plan a mechanical refactor               | CodeGraph scopes the subsystem; ast-grep verifies exact matches before edits.            |
| Review generated or unfamiliar code      | CodeGraph identifies entry points; ast-grep checks specific patterns without grep noise. |

## Tool choice

| Need                       | First choice                           | Follow-up                  |
| -------------------------- | -------------------------------------- | -------------------------- |
| Understand repo structure  | CodeGraph files/status                 | targeted file reads        |
| Find a symbol by name      | CodeGraph search                       | CodeGraph node             |
| Trace callers/callees      | CodeGraph callers/callees              | MCP `codegraph_trace`      |
| Explain a path from X to Y | MCP `codegraph_trace`                  | targeted file reads        |
| Estimate impact radius     | CodeGraph impact/affected              | tests/typecheck            |
| Find syntax pattern        | ast-grep pattern                       | ast-grep YAML rule         |
| Test a complex AST rule    | ast-grep MCP `test_match_code_rule`    | CLI `ast-grep scan --rule` |
| Perform rewrite            | ast-grep interactive or reviewed patch | typecheck/lint/tests       |

## Exploration flow

1. Check graph health:

```bash
codegraph status
```

2. Search likely symbols or files:

```bash
codegraph query AuthService
codegraph files --filter "**/*auth*"
```

3. Inspect call flow and impact:

```bash
codegraph context "explain login flow"
codegraph affected src/auth.ts --filter "**/*.{test,spec}.*"
```

When CodeGraph MCP is available, use `codegraph_trace` for a specific path such as how `AuthMiddleware` reaches `handleRequest`.

4. Read only the specific files or ranges needed for edits.

## Refactor flow

1. Use CodeGraph to identify the subsystem and impact radius.
2. Use ast-grep to match the exact code shape.
3. Convert ad-hoc patterns into YAML rules when the match requires `has`, `inside`, `not`, `all`, or `any`.
4. Preview matches before editing.
5. Apply a small patch or interactive rewrite.
6. Run validation.

## TypeScript/Turbo validation examples

Prefer project scripts from `package.json`. Common examples:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

For a Turbo repo, inspect available tasks first:

```bash
cat package.json | sed -n '1,220p'
find apps packages -maxdepth 2 -name package.json -print
```

Then run the smallest relevant validation command.

## Context discipline

- Do not dump broad CodeGraph context into the main response unless it directly answers the user.
- Prefer status/search/callers/callees/trace/impact before large context generation.
- Cap ast-grep result counts where the MCP tool supports it.
- Summarize findings and only read source files that are candidates for editing.
