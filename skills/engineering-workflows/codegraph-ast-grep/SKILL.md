---
name: codegraph-ast-grep
description: Set up and use CodeGraph with ast-grep for semantic repository exploration, impact analysis, structural search, rule testing, and approval-gated refactors. Use when a repo needs CodeGraph CLI/MCP configuration for Codex, Claude Code, Cursor, or another client; when the user asks about callers, call paths, affected files, AST patterns, sgconfig, analysis-tool updates, or safe codemods; or when syntax evidence should confirm semantic findings.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.2.0"
---

# CodeGraph + ast-grep

## Goal

Use CodeGraph for semantic repository scope and ast-grep for deterministic syntax evidence. Discover installed capabilities, offer relevant stable analysis-tool updates, degrade safely when a tool is missing, and keep every install, update, configuration write, index mutation, and rewrite reviewable.

## When to use

- Set up or repair CodeGraph, ast-grep, or their MCP exposure for Codex, Claude Code, Cursor, or another client.
- Explain repository structure, symbols, callers, callees, call paths, routes, imports, or likely impact before editing.
- Find exact syntax shapes, author/test ast-grep rules, or inventory a mechanical migration.
- Reconcile semantic and structural evidence before a refactor or review.
- Check whether selected analysis tools are current and offer an approved update.

## When not to use

- A one-file edit or ordinary typecheck, lint, test, or build needs no repository-scale analysis.
- The user wants a general dependency/framework audit; this skill checks only the analysis stack selected for its task.
- The task requires security taint proof, compiler correctness, or runtime tests that CodeGraph and ast-grep cannot provide.
- Do not execute an unreviewed repository-wide rewrite; activate only to enforce the safety boundary, inventory matches, and propose a reviewable plan.

## Inputs to inspect

- Repository/project root, nested repos or monorepo packages, relevant languages/frameworks, and `git status --short` when writes are possible.
- Effective CodeGraph state directory (`CODEGRAPH_DIR`, default `.codegraph/`), root `codegraph.json`, `sgconfig.yml`/`sgconfig.yaml`, rule/test folders, and runtime MCP config names.
- Executable paths, installation provenance, package/declarative version pins, versions, installed help, and exposed MCP tools.
- CodeGraph status/freshness only after the project-opening boundary is affirmatively approved for the selected root or an approved disposable copy, plus ast-grep language/rule support.
- User-approved scope for any install, update, config write, graph operation, or rewrite.

## Workflow

1. **Route the intent.** Distinguish setup/repair, semantic exploration, structural search, impact/refactor planning, rule authoring, or reviewed rewrite. Keep this routing internal unless naming it helps the user.
2. **Inspect before proposing.** Establish the project root, effective CodeGraph state directory, and current tool/config state with checks that do not open the graph. Treat installed help and exposed MCP tools as authoritative; do not infer a command from a remembered version. Before `codegraph status`, an MCP graph query, or another project-opening diagnostic that may migrate generated metadata, explain the boundary and obtain affirmative approval for that root or use an approved disposable copy.
3. **Check selected analysis-tool updates once.** Do this on every activation that will use installed analysis tools, including read-only analysis or migration planning. Before first tool use, inspect installed version/provenance and, when network policy permits, compare each selected tool with its authoritative stable channel. External update lookup and telemetry are separate choices: suppress CodeGraph telemetry for a skill-driven check unless the user separately consented to it, and never treat CodeGraph's default-on state as consent. Offline/opt-out policy still wins. Reuse the result for the task. Skip unused optional tools and application dependencies. See `references/update-and-provenance.md`.
4. **Ask before updating.** When a newer permitted stable release exists, actively present one itemized checkpoint with an independent update/skip choice per tool. Include versions, source, relevance, exact command, scope, writes, privileges, telemetry behavior, restart/reindex needs, validation, and rollback limits. Wait for approval; never update automatically or re-ask a declined item during the task.
5. **Choose semantic evidence.** Prefer exposed `codegraph_explore`, then installed `codegraph explore`, then only the narrower CodeGraph capabilities actually present. If CodeGraph is unavailable, use runtime-native LSP, capability-gated ast-grep outline, or bounded text/file inspection. See `references/codegraph-capability-guide.md`.
6. **Choose structural evidence.** Use ast-grep CLI after the target syntax is known. Start with a narrow match, specify language when inference is ambiguous, bound paths/output, and promote reusable or relational logic to tested YAML rules. See `references/ast-grep-rule-recipes.md`.
7. **Reconcile evidence.** If semantic and structural results disagree, check graph freshness, parser/language choice, dynamic/generated code, ignore rules, and targeted source before claiming coverage or widening to broad text search.
8. **Gate changes.** Separate diagnostics from installs, updates, MCP/config writes, graph initialization/sync/rebuild, rule writes, and source rewrites. For rewrites: inventory variants, add positive/negative tests, preview exact matches, obtain approval for the bounded scope, apply, inspect the diff, and run project-native validation.
9. **Report only relevant proof.** State capabilities and versions used, findings and paths/symbols inspected, commands run or proposed, approval boundaries, validation, evidence gaps, and remaining risk.

## Safety rules

- Do not install or update tools, execute `npx`/`uvx`, modify runtime config, initialize/rebuild indexes, write rule/config files, or rewrite source without explicit approval.
- Do not treat update lookup as update permission or telemetry consent. Respect offline intent, `DO_NOT_TRACK`, `CODEGRAPH_NO_UPDATE_CHECK`, registry restrictions, and repository version policy. For a skill-invoked CodeGraph stable check or approved update, set `CODEGRAPH_TELEMETRY=0` unless the user separately chose to keep telemetry enabled for that action; a default-on state is not affirmative consent.
- Keep binary/package updates separate from agent-config refresh, prompt hooks, telemetry choices, index operations, and unrelated dependency changes.
- Preserve the detected installer channel and scope. Never run a blanket update-all command or silently bypass package-manager freshness, trust, lifecycle-script, checksum, or declarative-config policy.
- Do not use pipe-to-shell or pipe-to-PowerShell execution as the default install/update path. Prefer exact packages or release assets with published checksums.
- Do not assume CodeGraph auto-sync outside an active supported watcher. Do not require manual sync when watcher/status evidence says the graph is current.
- Do not claim every CodeGraph diagnostic is strictly no-write: opening an existing graph can migrate generated index metadata in some versions. Require affirmative approval for the selected root before any such project-opening command, or use an approved disposable copy. Under a strict no-write policy, skip it unless the disposable-copy path was approved.
- Do not invent `.codegraph/config.json`; the effective `CODEGRAPH_DIR` (default `.codegraph/`) is index state, while root `codegraph.json` is version/capability dependent.
- Do not apply an ast-grep rewrite from an untested pattern or use a snapshot/update-all flag to accept changes indiscriminately.
- Do not represent CodeGraph as a compiler/test runner or ast-grep as semantic/type/taint proof.
- Redact secrets, static headers, private service names, customer data, and internal hostnames. Authorized private paths may appear in the user's interactive evidence but never in public examples or saved public skill artifacts.

## References

Read only what the task needs:

- `references/setup-and-mcp-config.md` for setup profiles, verified install channels, runtime config boundaries, and graph initialization.
- `references/update-and-provenance.md` for once-per-task stable checks, itemized consent, versioned updates, verification, and rollback.
- `references/codegraph-capability-guide.md` for current/legacy CodeGraph command discovery, MCP/CLI selection, freshness, config, and monorepos.
- `references/usage-playbook.md` for adaptive exploration, impact, evidence reconciliation, fallbacks, and refactor flows.
- `references/ast-grep-rule-recipes.md` for CLI patterns, YAML rules/tests, result bounding, outline, and rewrite staging.
- `references/extensions-and-escalation.md` when the core tools cannot safely express a semantic, security, or multi-step migration task.
- `references/troubleshooting.md` for missing tools, update checks, PATH/config drift, watcher/index problems, parser gaps, and failed updates.

## Scripts

No runtime scripts. Use installed tools and repository-native validation commands; the catalog's deterministic contract validator is maintainer-only and is not installed with the skill.

## Output format

Adapt the response to the task rather than emitting fixed sections.

- **Setup/update:** current state, recommended profile, read-only checks, itemized approval checkpoint, then verification after approved actions.
- **Exploration/impact:** question, capability provenance, semantic findings, corroborating structural/source evidence, affected surface, uncertainty, and validation suggestions.
- **Rule/refactor/rewrite:** match inventory, rule/test evidence, exact scope, approval state, diff summary, project validation, and rollback or remaining risk.

## Completion criteria

- Installed capabilities, selected project root, and effective CodeGraph state directory are explicit.
- Stable update state was checked once for selected analysis tools, or an offline/opt-out limitation is reported.
- External update lookup and CodeGraph telemetry followed separate user/policy decisions; default-on telemetry was never treated as consent.
- Any available update was offered item-by-item before mutation.
- Semantic scope and structural matches use only verified capabilities and are reconciled where needed.
- Every potentially migrating project-opening diagnostic ran only after affirmative approval for that root or in an approved disposable copy.
- All writes were separately approved, bounded, reviewed, and paired with project-native validation.
- Runtime configuration is verified or a clearly labeled CLI/LSP/text fallback remains.

## Failure modes

- If remote update metadata is blocked, report `not checked`, do not retry through another channel, and continue with installed capabilities.
- If a tool is missing, provide a scoped, versioned setup proposal; do not install it from diagnostic intent.
- If current commands are absent, follow installed help and use a legacy or degraded path without pretending the newer capability exists.
- If MCP is disconnected, use CLI or LSP fallback and state what could not be verified.
- If a graph is missing or stale, diagnose watcher/status/root state and seek approval for the minimum init/sync/rebuild action.
- If ast-grep matches nothing, narrow to one known file, verify language and AST shape, then broaden deliberately.
- If an update fails or another binary shadows it, stop further updates, preserve config/index state, verify what still runs, and use only a pre-disclosed safe rollback.
- If evidence remains contradictory, report the disagreement and uncertainty instead of claiming complete coverage.
