# ast-grep Structural Search

## Should Trigger

Yes.

## Prompt

Find all TypeScript code paths that read `process.env` directly inside React components and give me a rule I can rerun.

## Expected Behavior

- Trigger because the user asks for ast-grep structural search.
- Prefer an exact ast-grep pattern first with single-quoted `$` metavariables where relevant.
- Use or propose a YAML rule when the match needs component context or relational constraints.
- Mention `ast-grep scan --rule` and `ast-grep scan --inline-rules` options.
- Avoid applying rewrites unless separately requested and reviewed.
- Pair any proposed edits with project validation.
