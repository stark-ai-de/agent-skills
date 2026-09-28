# Shadcn Lint Ownership and Compatibility

## Should Trigger

Yes.

## Prompt

A Tailwind v4 monorepo has one root Oxlint command running through Bun, pnpm dependency ownership, nearest-app components metadata, and a shared UI package. A separate non-Tailwind backend and an unsupported frontend template syntax are also present. Assess the lint ADR without changing files. The plugin advertises a Node engine floor.

## Deterministic Assertions

- contains: AC-ADR-013
- contains: AC-ADR-058
- contains: root
- contains: components.json
- contains: defer
- contains: revisit
- contains: existing linter
- contains: runtime

## Expected Behavior

Reuse the owning linter and runtime; do not invent an app lint script or force a compiler/runtime change. Preserve per-app theme discovery and direct shared-stylesheet dependencies. Distinguish no applicability from compatibility deferral. Existing local authority wins; provider adoption cannot authorize installation or repository-wide lint replacement.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded
agent run or an executed plugin/runtime qualification. Structural validation
checks its inventory and assertions; target adoption requires separate evidence.
