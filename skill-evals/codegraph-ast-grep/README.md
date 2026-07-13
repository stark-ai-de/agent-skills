# codegraph-ast-grep Evals and Captured Behavior

This folder contains the public `codegraph-ast-grep` scenario catalog, static
contract checks, and reproducible captured behavioral evidence. It is maintainer
evidence, not installed runtime content and not a Microsoft SkillOpt optimization
dataset.

Scenario case files define prompts and expected behavior. They are specifications,
not passing run evidence by themselves. A behavior claim is supported only when a
captured output is linked from `behavioral/manifest.json` and its assertions are
regraded from that output.

## What the evals cover

- Trigger and non-trigger boundaries.
- Current-first, installed-help-driven CodeGraph behavior with legacy fallback.
- CodeGraph MCP/CLI, ast-grep CLI, native LSP, and bounded text fallbacks.
- Once-per-task stable update checks for selected analysis tools only.
- Active itemized update consent, decline/offline behavior, and config-refresh separation.
- Codex, Cursor, Claude Code, and generic MCP setup boundaries.
- Positive/negative ast-grep rule tests and bounded rewrite safety.
- Optional Serena, Codemod/JSSG, Semgrep, and language-specialist routing without adding required dependencies.

## Cases

Core positive cases:

- `cases/codegraph-mcp-setup.md`
- `cases/repo-exploration-and-impact.md`
- `cases/ast-grep-structural-search.md`
- `cases/refactor-planning.md`

Update/capability/runtime cases:

- `cases/stable-update-consent.md`
- `cases/offline-update-check.md`
- `cases/legacy-codegraph-capability-gate.md`
- `cases/cross-runtime-setup-boundaries.md`

Rewrite/extension cases:

- `cases/bounded-rewrite-after-approval.md`
- `cases/native-lsp-first.md`
- `cases/advanced-migration-extension.md`
- `cases/security-policy-tool-boundary.md`

Negative/boundary cases:

- `cases/typecheck-only-negative.md`
- `cases/destructive-rewrite-negative.md`

## Captured behavioral suite

[`behavioral/`](behavioral/README.md) contains four fresh Codex final responses,
their exact synthetic prompts, capture provenance, artifact hashes, and 28
machine-regraded assertions:

| Capture                       | Source scenario                             | Assertions |
| ----------------------------- | ------------------------------------------- | ---------- |
| Stable update consent         | `cases/stable-update-consent.md`            | 7/7        |
| Offline update-check boundary | `cases/offline-update-check.md`             | 7/7        |
| Legacy capability gate        | `cases/legacy-codegraph-capability-gate.md` | 7/7        |
| Destructive rewrite boundary  | `cases/destructive-rewrite-negative.md`     | 7/7        |

The synthetic-fixture harness allowed read-only access only to the candidate and
its task-routed references; it prohibited CodeGraph, ast-grep, install/update,
network, and write actions. The JSONL event stream was manually inspected before
accepting each final message to confirm those reads and the absence of disallowed
tool actions. The committed final-message artifacts alone do not independently
prove those facts. They prove only the committed assertions for the named
candidate/model runs. There is no no-skill or previous-version baseline and no
statistical reliability claim.

## Deterministic gate

Run:

```bash
npm run validate:codegraph-ast-grep
```

The validator checks the installed runtime contract, required scenario structure,
capability-gated current/legacy commands, update consent, rewrite sequence,
optional-tool boundaries, safe command examples, and empty required-tool
dependency metadata. It also validates the behavioral manifest and artifact
hashes, recomputes every deterministic assertion from the captured output, and
reconciles per-case and suite totals.

The gate itself does not query the network, invoke a model, or execute
CodeGraph/ast-grep. Use `rubric.md` for human output review. `runs/` stores dated
evidence summaries with exact boundaries; a prose run note without captured
output and regraded assertions is not behavioral proof.

## Passing behavior

A passing output:

1. inspects state/capabilities before recommending commands;
2. checks selected analysis-tool stable versions at most once for the task or reports offline/opt-out state, while keeping telemetry separately consented and suppressed by default for CodeGraph checks/updates;
3. actively asks item-by-item before any eligible update or other mutation;
4. opens a CodeGraph project only after affirmative approval for that root or in an approved disposable copy, then uses only exposed/help-confirmed semantic and structural capabilities;
5. reconciles evidence and keeps optional tools non-default;
6. gates rewrites on tests, preview, exact scope, approval, diff review, and project validation.
