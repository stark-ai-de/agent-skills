# codegraph-ast-grep Rubric

Grade only the assertions applicable to the selected public workflow or internal coding behavior.

## Routing and authority

- Exposes exactly `setup`, `update`, and `doctor`, with no `auto` workflow.
- Selects and announces a matching workflow when user intent and root authority are clear; asks only for bare or ambiguous invocation.
- Routes setup/install intent to `setup`, stable refresh/migration intent to `update`, and broken/health-check intent to `doctor`.
- Limits agent-initiated activation to read-only `doctor`.
- Runs mutating workflows only for the user-requested outcome/root and retains separate approval for privilege, global/channel expansion, telemetry, destructive replacement, paid/external actions, or unrelated writes.

## Setup

- Reconciles instead of duplicating dependencies, config, state, and instructions.
- Preserves package/declarative policy and installer provenance.
- Configures the named client, initializes/migrates the exact root as required, reconnects it, and verifies semantic plus structural readiness.
- Persists concise repository-native guidance: CodeGraph for symbols/callers/call paths/impact, ast-grep CLI for syntax evidence, and reconciliation before broad edits.
- Excludes the experimental ast-grep MCP server from normal setup.

## Update

- Checks authoritative stable channels once for the selected core tools and respects offline, opt-out, registry, and pinning policy.
- Preserves installer channel and global/project/declarative scope; never blanket-updates unrelated tools.
- Runs required config/index/schema migrations, reconnects the client, and verifies version/PATH, graph, MCP, structural queries, and guidance.
- Stops safely on failure and discloses rollback limits.

## Doctor

- Diagnoses without installing, updating, editing config, reconnecting through writes, initializing/syncing/rebuilding, or repairing.
- Obtains affirmative approval for the exact root, or uses an approved disposable copy, before any project-opening diagnostic that may migrate generated metadata.
- Reports skipped deep checks, evidence, confidence, analytics, and a recommended `setup` or `update` follow-up.

## Internal coding behavior and safety

- Uses CodeGraph for semantic scope and ast-grep CLI for bounded structural evidence, then reconciles disagreement with source, freshness/root, parser/language, ignore/generated/dynamic boundaries, and project validation.
- Treats semantic exploration, structural search, impact planning, rule authoring, and reviewed rewrites as behaviors rather than selectable modes.
- Uses positive and negative rule fixtures and the full inventory, preview, exact scope, approval, apply, diff-review, validation sequence for broad rewrites.
- Uses installed help/exposed tools rather than rigid version assumptions and keeps runtime-native LSP and bounded text reads as fallbacks.
- Suppresses CodeGraph telemetry unless separately consented and avoids pipe-to-shell installers, invented config paths, unpinned experimental MCP sources, and broad update-all/snapshot acceptance.
