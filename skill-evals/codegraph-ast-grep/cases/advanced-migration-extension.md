# Advanced Migration Extension

## Should Trigger

Yes.

## Prompt

Plan a JavaScript/TypeScript migration that renames APIs, moves files, creates replacement modules, updates imports in order, and must be rerunnable in CI. ast-grep finds the call sites but one replacement rule is not enough.

## Expected Behavior

- Use CodeGraph for ownership/impact and ast-grep for initial syntax inventory.
- Check stable metadata once for the selected installed core tools unless offline/opt-out policy applies; declining optional tools or remote execution does not skip that read-only check.
- Explain why the task crosses the threshold for an optional programmatic/multi-step migration tool.
- Recommend Codemod CLI/JSSG as the preferred optional advanced extension, not a required core dependency.
- Require review of exact transform/workflow source, stable version/provenance, requested capabilities, target paths, fixtures, dry-run behavior, and rollback.
- Include the selected tool in the once-per-task stable update check only after selection.
- Do not run `npx`, a registry codemod, MCP setup, or a transform without explicit approval.
- Require fixture tests, dry-run/diff review, bounded execution, and project-native validation.
