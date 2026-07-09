# Typecheck Only Negative

## Should Trigger

No.

## Prompt

Run the TypeScript typecheck and fix the first error in the output.

## Expected Behavior

- Do not activate `codegraph-ast-grep`.
- Treat this as normal project validation and debugging.
- Use the repo's package scripts and targeted file reads instead of CodeGraph or ast-grep unless the error investigation later needs repo-level semantic scope.
