# Codex starter prompt with clear setup request

You are a clean-context Codex agent testing the current candidate. Read `skills/engineering-workflows/codegraph-ast-grep/SKILL.md` from this checkout as the skill instruction; use only its task-routed references if needed. The synthetic project `/workspace/sample-app` does not exist on this host. Treat the project facts below as authoritative, do not claim that real setup or update work was performed, and answer the user request as the skill-guided agent. Do not discuss this capture harness.

Synthetic project facts: the user owns `/workspace/sample-app`; it is a project-local Codex setup using pnpm. The root and installer scope are known, and protected Git state is clean. No privilege, telemetry, destructive replacement, or external service was authorized.

## User message

Use $codegraph-ast-grep for my request. When intent, root, scope, and authority are clear, announce only the selected setup, update, or doctor workflow and its rationale, do not enumerate unselected workflows, and proceed. For a bare or materially ambiguous request or an explicit options request, show setup, update, and doctor in order and ask only when a choice is needed. An options-only request authorizes no repository or tool inspection and no execution. Preserve installer provenance and protected state, keep doctor non-repairing, require exact-root approval before graph diagnostics that may migrate metadata, and persist repository guidance after setup.

Set up CodeGraph and ast-grep for Codex in `/workspace/sample-app` now, within this project only. I authorize ordinary in-root installation, configuration, indexing, and agent guidance.
