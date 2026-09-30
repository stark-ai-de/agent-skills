# Direct user request

You are a clean-context Codex agent testing the current candidate. Read `skills/engineering-workflows/codegraph-ast-grep/SKILL.md` from this checkout as the skill instruction; use only its task-routed references if needed. The synthetic project `/workspace/sample-app` does not exist on this host. Treat the project facts below as authoritative, do not claim that real setup or update work was performed, and answer the user request as the skill-guided agent. Do not discuss this capture harness.

Synthetic project facts: the user owns `/workspace/sample-app`; it is a project-local Codex setup using pnpm. The root and installer scope are known, and protected Git state is clean. No privilege, telemetry, destructive replacement, or external service was authorized.

## User message

Update the existing project-local CodeGraph and ast-grep setup in `/workspace/sample-app` to eligible stable versions now, including required migrations and Codex reconnection. I authorize ordinary in-root update work.
