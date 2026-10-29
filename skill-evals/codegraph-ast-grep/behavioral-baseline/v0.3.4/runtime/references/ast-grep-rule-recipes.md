# ast-grep Rule Recipes

Use this reference for structural search, reusable rules/tests, outline, or a reviewed rewrite. Verify installed help before using any version-sensitive option.

These are internal coding behaviors after a ready setup, not public skill workflows. An ordinary coding request may authorize a bounded rule or source edit; broad, destructive, or scope-expanding rewrites retain their normal approval boundary.

## Contents

- [Capability and quoting checks](#capability-and-quoting-checks)
- [Narrow patterns](#narrow-patterns)
- [Result bounding](#result-bounding)
- [Reusable YAML rules](#reusable-yaml-rules)
- [Positive and negative tests](#positive-and-negative-tests)
- [Outline](#outline)
- [Rewrite sequence](#rewrite-sequence)
- [Debugging misses](#debugging-misses)

## Capability and quoting checks

```bash
ast-grep --version
ast-grep --help
ast-grep run --help 2>/dev/null || true
ast-grep scan --help 2>/dev/null || true
ast-grep test --help 2>/dev/null || true
ast-grep outline --help 2>/dev/null || true
```

Use single quotes around shell patterns containing `$` metavariables:

```bash
ast-grep run -p 'console.log($$$ARGS)' -l ts src
```

Double quotes can expand `$NAME` before ast-grep sees it. On Linux use `ast-grep`, not the ambiguous `sg` command.

## Narrow patterns

Find React hooks with empty dependency arrays:

```bash
ast-grep run -p 'useEffect($FN, [])' -l tsx src
```

Find direct environment reads:

```bash
ast-grep run -p 'process.env.$KEY' -l ts src
```

Find a named import source while capturing imported bindings:

```bash
ast-grep run -p 'import { $$$NAMES } from "$PKG"' -l ts src
```

Find a function call regardless of arguments:

```bash
ast-grep run -p 'deprecatedApi($$$ARGS)' -l ts packages/target
```

Start against one known file, then one directory, then the approved repository scope. Specify `-l` when extension inference is ambiguous or input comes from stdin.

Before claiming coverage, inventory syntax variants such as namespace/default imports, aliases, optional chaining, JSX/TSX, wrappers, computed properties, macros, and generated sources.

## Result bounding

No result-limit flag is universal across every ast-grep subcommand/version.

Bound `run` by exact paths, language, and include/exclude globs exposed by installed help. Use JSON only when downstream processing is useful:

```bash
ast-grep run -p 'process.env.$KEY' -l ts --json=stream src/server
```

For `scan`, use `--max-results` only when `ast-grep scan --help` exposes it:

```bash
ast-grep scan --rule rules/no-direct-env.yml --max-results 100 src
```

Report total/representative results without pasting hundreds of lines. If a limit truncates output, say so and do not present the sample as full coverage.

## Reusable YAML rules

Minimal rule:

```yaml
id: no-direct-env-read
message: Read environment values through the approved configuration boundary.
severity: warning
language: TypeScript
rule:
  pattern: process.env.$KEY
```

Relational rule—find an awaited expression inside `Promise.all`:

```yaml
id: no-await-inside-promise-all
message: Build promises before passing them to Promise.all.
severity: warning
language: TypeScript
rule:
  pattern: Promise.all($ARGS)
  has:
    pattern: await $_
    stopBy: end
```

Composite rule—find server-action functions that call `revalidatePath`:

```yaml
id: server-action-revalidate-path
message: Review cache invalidation from server actions.
severity: warning
language: TypeScript
rule:
  all:
    - pattern: async function $NAME($$$ARGS) { $$$BODY }
    - has:
        pattern: "'use server'"
        stopBy: end
    - has:
        pattern: revalidatePath($$$ARGS)
        stopBy: end
```

Use YAML when relational/composite logic, shared utilities, CI reuse, messages, or rule tests justify committed configuration. Do not create rule/config files for a one-off ad-hoc pattern unless the user asks.

## Positive and negative tests

Configure rule and test directories in an existing or approved `sgconfig.yml`:

```yaml
ruleDirs:
  - rules
testConfigs:
  - testDir: rule-tests
```

Match the test `id` to the rule:

```yaml
id: no-direct-env-read
valid:
  - config.read('DATABASE_URL')
  - const env = getValidatedEnvironment()
invalid:
  - process.env.DATABASE_URL
  - const url = process.env['DATABASE_URL']
```

The second invalid example may reveal that the first rule does not cover computed access. Refine the rule or document the unsupported variant; do not call the rule complete while a known invalid fixture fails.

Run tests without accepting changed snapshots automatically:

```bash
ast-grep test --skip-snapshot-tests
ast-grep test
```

If snapshots are intentional, inspect them interactively and review the diff. Never use a snapshot update-all flag as routine validation or as proof that changed output is correct.

## Outline

Use outline only when installed help exposes it. It is a lightweight structural fallback, not semantic call analysis.

```bash
ast-grep outline src/parser.ts --view digest
ast-grep outline src --type class,function --match Parser
ast-grep outline src --json=stream
```

If `outline` is absent, use runtime-native LSP symbols, a narrower ast-grep pattern, or targeted file reads. Do not require an update solely to obtain outline when the existing path is sufficient; offer the stable update through the normal itemized checkpoint.

## Rewrite sequence

Use this exact order:

1. **Match inventory:** identify every known syntax variant and the exact paths in scope.
2. **Positive/negative test:** prove intended matches and non-matches.
3. **Preview:** run match-only and record count plus representative results.
4. **Exact bounded scope:** freeze rule/pattern, language, paths/globs, and expected count.
5. **Explicit consent:** ask for the reviewed rewrite unless the user already approved this exact unchanged scope.
6. **Apply:** use interactive rewrite or create a normal patch; never silently broaden.
7. **Diff review:** inspect every changed file and rerun the match to explain remaining occurrences.
8. **Repository-native validation:** run the actual targeted tests, typecheck, lint, or build.
9. **Rollback:** keep the patch reviewable and use normal version-control reversal only with user authority.

Example preview and interactive rewrite, only after installed help confirms the options:

```bash
ast-grep run -p 'oldApi($ARG)' -l ts src/target
ast-grep run -p 'oldApi($ARG)' -r 'newApi($ARG)' -l ts --interactive src/target
```

Do not run a broad non-interactive rewrite because a pattern matched one sample. Do not treat prior approval as covering a different path, rule, replacement, or count.

## Debugging misses

- Confirm the language (`ts`, `tsx`, `js`, `jsx`, or another installed language id).
- Reduce to one known positive file and the smallest pattern.
- Inspect installed `--debug-query`, `--inspect`, AST-dump, or playground options only when exposed.
- Check whether the desired node is inside embedded/multi-language syntax.
- Add `stopBy: end` only when a relational search should traverse the full enclosing node.
- Compare pattern context: expression versus statement, declaration versus call, and TS versus TSX.
- Add the missed shape to `invalid` fixtures before broadening the repository scan.

## Primary sources

- [ast-grep CLI reference](https://ast-grep.github.io/reference/cli.html)
- [Test rules](https://ast-grep.github.io/guide/test-rule.html)
- [Outline reference](https://ast-grep.github.io/reference/cli/outline.html)
