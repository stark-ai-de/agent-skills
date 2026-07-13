# Native LSP First

## Should Trigger

Yes.

## Prompt

CodeGraph does not support one language in this mixed repo, but the runtime already exposes its language server. Find all references to a symbol and plan a safe rename. Do I need Serena?

## Expected Behavior

- Use the existing native LSP/compiler symbol/reference/rename capabilities before proposing an extra semantic server.
- Use CodeGraph only for supported cross-language/repository context and ast-grep for syntax variants where useful.
- Reconcile LSP, structural, and targeted source evidence.
- Explain that Serena is optional and unnecessary when native tooling already provides trustworthy coverage.
- Do not install or configure Serena.
- Keep rename execution approval-gated and pair it with project-native validation.
