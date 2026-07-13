# Extensions and Escalation

CodeGraph and ast-grep are the only core tools. Read this reference only when the core workflow and native runtime capabilities cannot safely express the task. Selecting an extension does not authorize installation or execution.

## Selection order

1. Use existing runtime-native language-server/compiler navigation before adding another semantic server.
2. Use CodeGraph plus ast-grep for normal exploration, impact, structural search, and reviewed rewrites.
3. Select one optional extension only when its threshold below is met.
4. Keep the once-per-task stable metadata check for selected core tools even when the user declines an optional extension or remote code execution; metadata lookup is not tool execution.
5. Apply the same update check, provenance review, explicit approval, bounded execution, diff review, and project validation to a selected extension.
6. Keep a valid degraded path when the user declines or the extension is unavailable.

## Decision matrix

| Need                                                                                            | Optional choice     | Select only when                                                                                            | Do not imply                                                                           |
| ----------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Symbols/references/types missing from CodeGraph but supported by the project's language tooling | Native LSP/compiler | Already available in the runtime/project                                                                    | No extra server or install is required                                                 |
| Dedicated cross-client symbol navigation or refactoring backend                                 | Serena              | Native LSP is unavailable to the agent or a reusable MCP semantic backend is explicitly wanted              | Serena is optional, not a CodeGraph prerequisite                                       |
| Multi-step, parameterized, resumable, or programmatic migration                                 | Codemod CLI/JSSG    | Declarative ast-grep replacement is insufficient and fixture-tested orchestration adds value                | Registry codemods or `npx` are trusted by default                                      |
| Security/taint/policy rule                                                                      | Semgrep             | The request is explicitly security/policy focused and its selected engine can support the required analysis | CodeGraph/ast-grep provide taint proof, or Semgrep CE is automatically interfile proof |
| Complex JavaScript/TypeScript syntax rewrite                                                    | jscodeshift         | Recast-style JS/TS transform code is more suitable than a declarative rule                                  | It is language-neutral or has an official MCP requirement                              |
| Type-aware TypeScript transform                                                                 | ts-morph            | The change needs TypeScript compiler/type-checker information                                               | It is a ready-made codemod runner                                                      |
| Format-preserving Python migration                                                              | LibCST              | Python CST fidelity and codemod fixtures are required                                                       | It applies outside Python                                                              |
| JVM/framework/build migration                                                                   | OpenRewrite         | Java/Kotlin/JVM recipes and type-attributed project builds justify its setup cost                           | Every recipe/language is covered by the same open-source license                       |
| Existing indexed enterprise code platform                                                       | Sourcegraph/SCIP    | The organization already operates it and the task can use that existing index                               | A new upload/service is needed for ordinary local work                                 |
| Existing Grit/Biome migration rules                                                             | Grit                | The repository already adopted it and reuse is cheaper than translation                                     | It should be installed as a second default structural engine                           |

## Preferred advanced migration extension

Codemod CLI with JSSG is the preferred optional advanced extension when a migration needs more than a single ast-grep rule:

- multi-file creation/deletion/moves;
- ordered transformation steps;
- parameters or reusable workflows;
- programmatic ast-grep traversal/transformation;
- fixture-based whole-directory comparison;
- resumable or CI-oriented migration execution.

Before selection, define why ast-grep CLI plus a reviewed patch is insufficient. Before execution, review the exact transform/workflow source, version, requested capabilities, filesystem/network permissions, target paths, fixtures, dry-run behavior, and rollback. Do not execute a registry transform merely from its name or popularity.

## Semantic extension boundary

Prefer native language tools/LSP first. Select Serena only when the agent needs a dedicated MCP-accessible semantic backend across clients or CodeGraph lacks required symbol operations for the language/task.

Serena can expose retrieval and editing tools. Enable only the minimum required tools and keep editing disabled for read-only exploration. Treat its project config, memory, telemetry, package runner, language-server downloads, and shell/edit capabilities as separate trust surfaces. A semantic backend does not replace project typecheck/tests.

## Security/policy boundary

Route explicit vulnerability, taint, organization-policy, or security autofix work to an appropriate security workflow and consider Semgrep only as that workflow's selected analyzer.

- Confirm whether the available engine supports intrafile or interfile analysis needed by the claim.
- Use official/local rules with tests and pin remote rule sources.
- Run match/report mode before autofix.
- Treat autofix as a reviewed rewrite with exact scope and project validation.
- Do not describe absence of a finding as proof of security.

For ordinary structural matching, stay with ast-grep.

## Language-specific specialists

Use a specialist only when its semantic/fidelity advantage is material:

- **jscodeshift:** JS/TS AST transforms with Recast formatting and fixture tests.
- **ts-morph:** TypeScript compiler/type-checker navigation and type-aware manipulation.
- **LibCST:** lossless Python CST transforms and codemod tests.
- **OpenRewrite:** type-attributed JVM/framework/build recipes and recipe tests.

Keep generated transform code in the target repository's normal source/test conventions, not inside this installed skill. Require a dry run or patch preview and project-native validation.

## Existing-adoption-only tools

Sourcegraph/SCIP and Grit may be useful when the repository or organization already depends on them. Do not recommend provisioning an enterprise index, uploading private source, or adding a redundant structural DSL for a normal CodeGraph/ast-grep task.

Do not add Comby, raw Tree-sitter queries, or CodeQL to the general setup:

- Comby overlaps the structural role with a weaker/staler default fit.
- Raw Tree-sitter is grammar/parser infrastructure, not a safe user-facing rewrite workflow.
- CodeQL is a security-analysis platform with database/query setup, not a general refactor dependency.

## Approval and update inheritance

Once an extension is selected:

- include it in the analysis-stack update check exactly once for the task;
- identify its authoritative stable source and installation provenance;
- show an itemized install/update/execute checkpoint;
- preserve project pins and sandbox/capability restrictions;
- do not install another optional tool as its dependency unless separately approved;
- report when the user declines and continue through the core/degraded path.

## Primary sources

- [Serena](https://github.com/oraios/serena)
- [Codemod CLI/JSSG](https://docs.codemod.com/cli)
- [Semgrep documentation](https://semgrep.dev/docs/)
- [jscodeshift](https://github.com/facebook/jscodeshift)
- [ts-morph](https://ts-morph.com/)
- [LibCST codemods](https://libcst.readthedocs.io/en/latest/codemods.html)
- [OpenRewrite](https://docs.openrewrite.org/)
- [GritQL](https://github.com/biomejs/gritql)
