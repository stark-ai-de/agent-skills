# ast-grep Rule Recipes

Use this reference when the task asks for structural search or rule writing. Prefer TypeScript/TSX examples for Turbo/Next-style repositories.

## Shell quoting

Use single quotes around patterns with `$` metavariables:

```bash
ast-grep -p 'console.log($$$)' -l ts src
```

Double quotes can cause the shell to expand `$NAME` before ast-grep sees the pattern.

## Simple patterns

Find `console.log` in TypeScript:

```bash
ast-grep -p 'console.log($$$)' -l ts .
```

Find React hooks with empty dependency arrays:

```bash
ast-grep -p 'useEffect($FN, [])' -l tsx .
```

Find direct environment reads:

```bash
ast-grep -p 'process.env.$KEY' -l ts .
```

Find imports from a package:

```bash
ast-grep -p 'import { $$$ } from "$PKG"' -l ts .
```

## YAML rule template

```yaml
id: example-rule
language: TypeScript
rule:
  pattern: example($ARG)
```

Run it:

```bash
ast-grep scan --rule example-rule.yml src
```

Test a one-off rule without writing a file:

```bash
ast-grep scan --inline-rules 'id: example-rule
language: TypeScript
rule:
  pattern: example($ARG)' src
```

## Relational rule example

Find `Promise.all(...)` that contains an awaited expression:

```yaml
id: no-await-inside-promise-all
language: TypeScript
rule:
  pattern: Promise.all($A)
  has:
    pattern: await $_
    stopBy: end
```

## Composite rule example

Find server action functions that call `revalidatePath`:

```yaml
id: server-action-revalidate-path
language: TypeScript
rule:
  all:
    - pattern: async function $NAME($$$) { $$$ }
    - has:
        pattern: "'use server'"
        stopBy: end
    - has:
        pattern: revalidatePath($$$)
        stopBy: end
```

## Debugging a rule

- Start with the smallest pattern that matches one known file.
- Use ast-grep MCP `dump_syntax_tree` to inspect the parsed node shape.
- Use ast-grep MCP `test_match_code_rule` before scanning the repo.
- Add `stopBy: end` when a nested relational rule should search the whole enclosing node.
- Switch from `language: TypeScript` to `language: Tsx` or CLI `-l tsx` for JSX-heavy files.

## Rewrite safety

Prefer match-only scans first. For rewrites, use interactive mode or generate a normal patch for review. Always run project validation afterward.
