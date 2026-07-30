# Usage Playbook

Use CodeGraph for semantic scope, ast-grep CLI for syntax-exact coverage, targeted source reads for confirmation, and project-native validation for correctness. These are internal coding behaviors after setup, not public skill workflows.

Persist the following concise rule, adapted to the target repository's existing instruction format: “For repository-scale coding, use CodeGraph for semantic symbols, callers, call paths, and impact; use ast-grep CLI for structural syntax evidence; reconcile both before broad edits.” Do not duplicate an equivalent rule on repeated setup.

## Contents

- [Choose the smallest evidence path](#choose-the-smallest-evidence-path)
- [Semantic exploration](#semantic-exploration)
- [Structural search and rules](#structural-search-and-rules)
- [Impact and refactor planning](#impact-and-refactor-planning)
- [Evidence reconciliation](#evidence-reconciliation)
- [Fallback ladder](#fallback-ladder)
- [Output discipline](#output-discipline)

## Choose the smallest evidence path

| User need                  | First useful evidence                           | Follow-up only when needed                    |
| -------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Explain a flow             | Focused CodeGraph explore result                | Targeted source and one narrow call follow-up |
| Change a shared symbol     | CodeGraph callers/impact surface                | ast-grep variants, project tests/typecheck    |
| Find an exact code shape   | Narrow ast-grep pattern                         | YAML rule/tests and semantic ownership        |
| Author a reusable rule     | Known positive/negative examples                | Repo scan and CI/project validation           |
| Plan a mechanical refactor | Semantic ownership plus structural inventory    | Bounded patch batches and validation          |
| Diagnose setup             | Current state/capabilities                      | Recommend `setup` or `update`; do not repair  |
| Perform a reviewed rewrite | Tested match inventory and approved exact scope | Diff review, project validation, rollback     |

Do not run every tool because it exists. Use only evidence that changes the answer, scope, or safety decision.

## Semantic exploration

1. Confirm the project root and graph health.
2. Enumerate the actual MCP/CLI capabilities.
3. Ask one focused question through exposed `codegraph_explore` or help-confirmed CLI fallback.
4. Capture the relevant entry point, symbols, call paths, likely dependents/tests, and unsupported/dynamic boundaries.
5. Read only source needed to confirm the explanation or prepare an edit.

Good questions identify a behavior and boundary:

- “How does request validation reach persistence?”
- “What calls this authorization decision, and which tests are in its blast radius?”
- “Where does this route enter the application and hand off to domain logic?”

Avoid “dump the whole architecture.” Narrow broad results by symbol, path, route, or subsystem.

## Structural search and rules

1. Identify one known positive source example and its language.
2. Start with the smallest ast-grep CLI pattern against one file or directory.
3. Inventory syntax variants: imports, aliases, optional chaining, wrappers, JSX/TSX, generated code, or language-specific shapes.
4. Bound paths and output. Do not assume every subcommand supports the same result-limit flag.
5. Convert to YAML only when `inside`, `has`, `follows`, `precedes`, `all`, `any`, `not`, utilities, or reuse justifies it.
6. Add positive and negative rule fixtures before claiming complete coverage.
7. Run the rule across the approved scope and report counts/paths plus parser gaps.

Use [ast-grep-rule-recipes.md](ast-grep-rule-recipes.md) for exact examples.

## Impact and refactor planning

Use this sequence for changes that are more than a local edit:

1. **Ownership:** CodeGraph identifies the entry point, implementation, callers, dependents, and likely tests.
2. **Exact inventory:** ast-grep counts the syntax forms that will or will not change.
3. **Disagreement check:** graph and structural/path evidence are reconciled before scope is fixed.
4. **Patch boundary:** group the smallest reviewable file/symbol batches and identify shared-contract or generated-code boundaries.
5. **Rewrite proof:** for a mechanical rewrite, add rule fixtures and preview the exact reviewed scope.
6. **Approval:** obtain approval for the proposed files/pattern/rewrite, not a generic repository-wide permission.
7. **Apply and inspect:** make the smallest patch, inspect `git diff`, and verify no unrelated matches changed.
8. **Project validation:** run actual repository scripts such as targeted tests, typecheck, lint, or build.

If approval was already granted for the exact tested rewrite and unchanged scope, do not ask again. Any expanded path, rule, target version, or side effect requires renewed approval.

## Evidence reconciliation

Use a small evidence map:

| Evidence                 | What it proves                                              | Common blind spot                                               |
| ------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------- |
| CodeGraph                | Indexed semantic relationships and likely impact            | Dynamic/reflection/generated/unsupported code, stale root/index |
| ast-grep                 | Parser-backed syntax matches for the rule/language          | Semantic aliases/types/runtime dispatch, missed syntax variants |
| Runtime-native LSP       | Symbols, references, types supported by the language server | Generated/dynamic code, incomplete workspace/project config     |
| Text search/source reads | Literal presence and exact implementation                   | High noise, no semantic or AST guarantee                        |
| Project validation       | Compiler/test/runtime contract exercised by the repo        | Coverage gaps and tests that do not exist/run                   |

When results disagree:

1. verify CodeGraph root, status, watcher/pending state, and ignored/configured paths;
2. verify ast-grep language, parser, pattern, selector, and positive/negative fixtures;
3. inspect aliases, string-based registration, dependency injection, reflection, macros, generated files, and runtime loading;
4. read the smallest targeted source surface;
5. report the unresolved boundary instead of silently choosing the larger result.

Do not broaden immediately to repeated full-repository grep. A targeted text search is useful only when it tests a named gap.

## Fallback ladder

Use the first available trustworthy layer:

1. Exposed CodeGraph semantic MCP capability.
2. Help-confirmed CodeGraph CLI capability.
3. Runtime-native LSP symbol/reference/type tools.
4. Capability-gated `ast-grep outline` for lightweight structure.
5. ast-grep structural query/rule.
6. Bounded `rg`/file reads for literal or unsupported syntax.
7. Project-native compiler, tests, lint, or build for correctness.

State the degraded layer. Do not propose installing an optional server when a native LSP or existing tool already answers the task.

Read [extensions-and-escalation.md](extensions-and-escalation.md) only when this ladder cannot safely express a dedicated semantic backend, security/policy query, or multi-step migration.

## Output discipline

Return the minimum proof the user can act on:

- selected root and capability/version provenance;
- update state only when relevant or unavailable;
- focused findings with paths/symbols and evidence source;
- structural counts/variants and rule test state;
- disagreement or unsupported boundaries;
- proposed writes with approval state;
- commands actually run versus commands merely proposed;
- project validation and remaining risk.

Do not paste full configs, broad graph dumps, or hundreds of match lines. Summarize counts, give representative matches, and offer exact artifact paths or narrower follow-ups.
