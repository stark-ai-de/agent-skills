---
name: codegraph-ast-grep
description: Set up, update, or diagnose CodeGraph and ast-grep so coding agents can use semantic repository scope and structural syntax evidence automatically. Use when a repository needs an idempotent CodeGraph/ast-grep installation, stable tool and index migrations, MCP reconnection, persisted agent guidance, or a read-only setup diagnosis.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.3.2"
---

# CodeGraph + ast-grep

## Goal

Make a repository's coding agents ready to use CodeGraph for semantic scope and ast-grep CLI for structural evidence. Public workflows manage that capability; repository exploration and refactoring are ordinary internal coding behaviors after setup.

## When to use

- Install or reconcile CodeGraph, ast-grep CLI, MCP exposure, indexing, and agent guidance.
- Update the installed analysis stack and run required configuration, index, or schema migrations.
- Diagnose a missing, stale, disconnected, or apparently broken setup without repairing it.

## When not to use

Do not activate this skill merely because a coding task can benefit from an already-ready analysis stack. Follow the persisted repository guidance instead. Do not use it for general dependency audits, compiler/runtime proof, or an unreviewed broad rewrite.

## Workflow selection

Always expose these finite workflows in plain, benefit-first language when the skill is invoked directly:

- `setup`: supercharge the repository with Semantic Code Intelligence and structural code search, helping coding agents answer faster with fewer tool calls. Install missing pieces, connect the coding client, build the code index, add repository guidance, and safely reuse or repair any existing setup.
- `update`: bring an existing setup to current stable versions without changing how it was installed. Migrate configuration or index data when needed, reconnect the coding client, and verify that everything still works.
- `doctor`: diagnose setup health and report analytics without repairing anything.

There is no `auto` workflow. Select by intent:

- An explicit setup or installation request selects `setup`.
- An explicit stable-tool update, migration, or refresh request selects `update`.
- “Something is broken,” a health check, or a request for setup analytics selects `doctor`.
- A bare invocation or ambiguous intent requires showing all three workflows and asking the user to choose.

For clear direct intent, state the selected workflow, rationale, root, expected writes/artifacts, and protected state, then proceed. Agent-initiated activation may select and announce only `doctor`; it must not infer setup or update authority. Selecting `setup` or `update` is allowed only when the user already requested that outcome for the stated root. Privileged/global installation, paid or external services, publication/deployment, destructive replacement, telemetry changes, and scope expansion retain separate approval.

## Inputs to inspect

- Exact repository root, nested repositories or monorepo packages, package/declarative policy, and protected Git state.
- Effective `CODEGRAPH_DIR` (default `.codegraph/`), root `codegraph.json` when supported, `sgconfig.yml`/`sgconfig.yaml`, and repository instruction files.
- Executable paths, installer channel and scope, version pins, installed help, configured client, and exposed MCP tools.
- Approved scope for package/config/index writes and any exact-root project opening that may migrate generated metadata.

## Workflow

### `setup`

1. Capture the exact root, protected state, runtime client, package/declarative policy, existing installer provenance, and offline/telemetry constraints.
2. Inspect existing binaries, configuration, MCP exposure, state paths, and repository guidance before changing anything. Installed help and exposed tools are authoritative.
3. Reconcile the stable CodeGraph release and stable ast-grep CLI through the repository's approved installer channel and scope. Do not install the experimental ast-grep MCP server during normal setup.
4. Configure the selected runtime client and CodeGraph project root, then perform the help-confirmed initialization and any required configuration/index/schema migration within the approved root.
5. Persist concise repository-native guidance for coding agents. It must say, in equivalent terms: use CodeGraph for semantic symbols, callers, call paths, and impact; use ast-grep CLI for structural syntax evidence; reconcile both before broad edits.
6. Reconnect or restart the client when required, then verify one semantic query, one bounded structural query, state freshness, and guidance discovery.
7. Report installed versions/provenance, writes, migration/reconnection evidence, readiness, and remaining limitations.

Setup is idempotent and agent-complete: rerunning it reconciles drift instead of duplicating config, instructions, indexes, or dependencies.

### `update`

1. Capture the same root, policy, protected-state, telemetry, and provenance evidence as setup.
2. Compare installed core tools with their authoritative stable channels once. Respect offline intent, `DO_NOT_TRACK`, `CODEGRAPH_NO_UPDATE_CHECK`, registry restrictions, and repository pins.
3. Preserve the existing installer channel and global/project/declarative scope. Update only the stable CodeGraph and ast-grep CLI components selected by repository policy; never run a blanket update-all operation.
4. Run every version-required configuration, index, or schema migration in the approved root. Keep binary replacement, runtime-config changes, prompt hooks, telemetry, and graph operations visible in the execution receipt.
5. Reconnect/restart the client, refresh the graph only as required, and verify versions/PATH, MCP exposure, graph readiness, a semantic query, a structural query, and persisted guidance.
6. If an update fails, stop further mutation, preserve config/index state, report what still works, and use only a pre-disclosed safe rollback.

The user's explicit update request authorizes ordinary in-root update and required migration work. Ask separately for privilege escalation, installer-channel or scope changes, unrelated dependency changes, destructive rebuilds, or external-service actions.

### `doctor`

1. Inspect executable/provenance, versions/help, config presence, MCP registration, state paths, ignore policy, repository guidance, and non-opening connectivity evidence.
2. Do not install, update, reconnect by writing config, initialize/rebuild/sync, repair, or rewrite source.
3. Before `codegraph status`, an MCP graph query, or another diagnostic that opens a project and may migrate generated metadata, name the exact root and obtain affirmative approval, or use an approved disposable copy. Without that approval, report the skipped deep check.
4. When approved, gather bounded graph health and useful analytics such as freshness, indexed languages, symbol/file coverage, and query readiness. Do not describe this as strictly read-only if metadata migration was possible.
5. Return diagnosis, evidence, confidence, recommended `setup` or `update` follow-up, and any unverified boundary. Do not repair as part of `doctor`.

## Internal coding behaviors

Once the setup is ready, coding agents use these behaviors without treating them as public skill modes:

Routine semantic exploration, structural search, impact analysis, rule authoring, and reviewed rewrites are internal coding behaviors.

- **Semantic exploration:** prefer exposed `codegraph_explore`, then installed-help-confirmed `codegraph explore`, then narrower verified CodeGraph capabilities.
- **Structural search:** use ast-grep CLI after the syntax shape is known; specify language when ambiguous and bound paths/output.
- **Impact analysis:** reconcile semantic ownership/call paths with structural match inventory and targeted source reads.
- **Rule authoring:** use tested YAML rules for reusable or relational patterns, including positive and negative fixtures.
- **Reviewed rewrites:** inventory, test, preview, approve exact bounded scope, apply, inspect the diff, and run repository-native validation.

When semantic and structural evidence disagree, check graph freshness/root, parser/language, generated or dynamic code, ignore rules, and targeted source before claiming coverage. Runtime-native LSP and bounded text/file inspection are fallbacks; neither core tool is compiler, type, taint, or runtime proof.

## Safety rules

- Keep ast-grep CLI as the supported default; the experimental ast-grep MCP server is excluded from normal setup.
- Suppress CodeGraph telemetry for skill-driven checks and approved setup/update commands with `CODEGRAPH_TELEMETRY=0` unless the user separately consented to telemetry. Default-on telemetry is not consent.
- Prefer exact packages or checksummed release assets. Do not default to pipe-to-shell or pipe-to-PowerShell installation.
- Preserve installer channel and scope; do not bypass package-manager freshness, trust, lifecycle-script, checksum, or declarative policy.
- Do not invent `.codegraph/config.json`. Treat effective `CODEGRAPH_DIR` as generated state and root `codegraph.json` as version/capability dependent.
- Do not assume auto-sync without an active supported watcher or require manual sync when status proves freshness.
- Do not apply an untested ast-grep rewrite or indiscriminately accept snapshots/update-all behavior.
- Redact secrets, static headers, customer data, private service names, and internal hostnames from persisted or public artifacts.

## References

Read only what the selected workflow or later coding task needs:

- `references/setup-and-mcp-config.md` for installation scopes, runtime configuration, state paths, and initialization.
- `references/update-and-provenance.md` for stable channels, provenance-preserving updates, migrations, verification, and rollback.
- `references/troubleshooting.md` for the read-only doctor ladder and follow-up routing.
- `references/codegraph-capability-guide.md` for current/legacy capability discovery, graph freshness, and exact-root project opening.
- `references/usage-playbook.md` for the persisted agent guidance and internal semantic/structural/impact behaviors.
- `references/ast-grep-rule-recipes.md` for bounded CLI patterns, rules/tests, and reviewed rewrites.
- `references/extensions-and-escalation.md` only when the core stack cannot safely express the task.

## Scripts

No runtime scripts. Use installed tools and repository-native validation commands; the catalog's deterministic contract validator is maintainer-only and is not installed with the skill.

## Output format

Report the selected workflow and rationale, exact root, protected state, installer provenance, versions/capabilities, writes or skipped writes, migrations/reconnect state, verification evidence, and remaining limitations. For `doctor`, separate non-opening evidence from exact-root deep analytics and provide diagnosis plus a recommended follow-up without repair.

## Completion criteria

- The selected `setup`, `update`, or `doctor` workflow and intent rationale are explicit.
- Setup/update preserve provenance and protected state, and required migrations/reconnection are verified.
- Target-repository guidance makes semantic plus structural evidence the default for broad coding work.
- Doctor performs no repair and labels exact-root graph-opening approval and possible metadata mutation accurately.
- Readiness is proven with verified capabilities and representative semantic/structural checks, or limitations are explicit.

## Failure modes

- If intent or root is ambiguous, expose all three workflows and ask before inspection or mutation.
- If stable metadata is blocked, report `not checked`; do not bypass offline, opt-out, registry, or pinning policy.
- If setup/update needs an unauthorized privilege, channel, scope, destructive rebuild, or external action, preserve current state and request that specific authority.
- If a tool or client remains unavailable, retain verified intermediates/configuration, report incomplete readiness, and give the narrowest next action.
- If evidence conflicts, report the disagreement and confidence rather than claiming complete semantic or structural coverage.
