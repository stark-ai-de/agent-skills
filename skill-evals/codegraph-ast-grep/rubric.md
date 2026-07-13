# codegraph-ast-grep Rubric

Grade each clean-context run against the applicable assertions. Mark non-applicable items rather than forcing setup/update/rewrite detail into every response.

## Trigger fit

- Activates for CodeGraph/ast-grep setup, MCP repair, semantic exploration, callers/call paths/impact, structural search, rule testing, selected analysis-tool updates, safe refactor planning, and rewrite safety.
- Does not activate for an ordinary one-file edit, typecheck, lint, test, build, or general application dependency/framework audit.
- Treats a requested unreviewed rewrite as a safety-boundary case, not permission to mutate.

## Preflight and capabilities

- Identifies the selected project root, repo state when writes are possible, executable paths/provenance, versions/help, MCP tool visibility, graph state, and ast-grep config as relevant.
- Uses installed help and exposed MCP tools instead of a rigid version gate.
- Uses `codegraph_explore` only when exposed and CLI `codegraph explore` only when help lists it.
- Supports a legacy CodeGraph path without inventing modern commands; help-confirmed `init -i`, granular/context commands, and manual sync remain valid where applicable.
- Treats auto-sync as active-watcher behavior and manual sync as valid for CLI-only, disabled-watcher, CI/script, stale, or recovery states.
- Capability-gates ast-grep `outline` and does not assume every subcommand shares a result-limit flag.

## Stable update behavior

- Checks stable updates at most once per selected tool per task and reuses the result.
- Performs that check for selected installed core tools during read-only analysis/planning too; declining optional tools or remote execution does not silently skip public stable metadata lookup unless offline/opt-out policy applies.
- Limits scope to CodeGraph, ast-grep, configured helpers, and an optional tool actually selected for the task.
- Honors offline intent, `DO_NOT_TRACK`, `CODEGRAPH_NO_UPDATE_CHECK`, registry restrictions, and repository pins; reports `not checked` without retry/bypass.
- Treats external stable lookup and CodeGraph telemetry as separate choices. Uses `CODEGRAPH_TELEMETRY=0` for skill-driven CodeGraph checks and approved updates unless telemetry was separately chosen for that action; default-on is not consent.
- Ignores prereleases unless a known blocker and explicit request justify evaluation.
- When an eligible update exists, actively presents one itemized checkpoint with installed/target versions, authoritative source, relevance, exact command, scope/writes, telemetry behavior, restart/reindex needs, validation, and rollback limits.
- Requires independent approval per tool. Declining one item preserves diagnostics/degraded use and is not re-asked during the task.
- Keeps binary/package update separate from runtime config/instructions/hooks, telemetry, graph operations, and unrelated dependencies.
- Verifies version/PATH, MCP connection, graph/rules, and unexpected config changes after an approved update.

## Setup and runtime boundaries

- Separates read-only diagnosis from package/archive install, `npx`/`uvx`, MCP writes, graph initialization, ignore/config edits, and telemetry choices.
- Preserves installer channel, package manager, global/project/declarative scope, freshness policy, lifecycle/build approval, and checksum requirements.
- Does not default to pipe-to-shell/PowerShell installers or an unpinned experimental ast-grep MCP source.
- Uses Codex TOML/CLI, Cursor MCP JSON/path behavior, Claude Code MCP scopes, and generic stdio configuration only in the matching runtime.
- Treats `codegraph install --print-config` as a snippet preview, not disclosure of every installer side effect.
- Distinguishes version/help probes from project-opening diagnostics that may migrate generated CodeGraph index metadata, and requires affirmative approval for the selected root or an approved disposable copy before any such diagnostic.
- Verifies the server and exposed tools after approved setup.

## Semantic and structural quality

- Uses CodeGraph for semantic repository scope and ast-grep for exact structural matches.
- Narrows CodeGraph questions and avoids repeating a successful consolidated result through every granular tool.
- Uses ast-grep shell-safe quoting, language selection, bounded paths/output, and YAML rules only when relational/reusable behavior warrants them.
- Adds positive and negative fixtures before calling a reusable rule complete.
- Reconciles disagreement through freshness/root, parser/language, ignore/generated/dynamic boundaries, LSP, and targeted source.
- Does not claim absence from CodeGraph or an ast-grep rule proves absence from the repository.
- Recommends project-native typecheck, lint, test, or build after edits.

## Rewrite safety

- Follows: match inventory, positive and negative tests, preview, exact bounded scope, explicit approval, apply, diff review, and repository-native validation.
- Does not ask again when the user already approved the exact unchanged reviewed rewrite.
- Requires renewed approval when paths, rule/replacement, expected count, or side effects expand.
- Does not auto-accept snapshots, run an update-all flag, or apply a broad non-interactive rewrite from one sample.

## Fallbacks and optional tools

- Falls back through CodeGraph MCP, CodeGraph CLI, native LSP, capability-gated ast-grep outline, structural search, bounded text reads, and project validation.
- Uses native LSP before proposing an extra semantic server.
- Keeps Serena optional for a dedicated semantic backend.
- Uses Codemod/JSSG only as the preferred optional advanced multi-step migration extension.
- Routes Semgrep to explicit security/policy work and does not represent core tools as taint proof.
- Uses jscodeshift, ts-morph, LibCST, or OpenRewrite only for their language-specific advantages.
- Treats Sourcegraph/SCIP and Grit as existing-adoption-only.
- Never makes an optional tool a required dependency or installs it without approval.

## Output, privacy, and maintenance

- Returns only relevant current state, evidence provenance, findings, proposed/run commands, approval state, validation, uncertainty, and risk.
- Redacts secrets, static headers, customer/internal identifiers, and unrelated config.
- Keeps private paths out of public examples/artifacts while allowing authorized interactive evidence.
- Keeps `SKILL.md` concise and detailed setup/usage/recipes/troubleshooting in focused references.
- Adds no installed runtime scripts or required MCP dependencies.
