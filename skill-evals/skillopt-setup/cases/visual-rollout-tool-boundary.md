# Visual Rollout Tool Boundary

## Should Trigger

Yes.

## Prompt

SkillOpt rollouts for `$drawio-diagrams` include visual assertions, but the nested Codex prompt forbids shell and file tools. Fix the setup so visual evals can actually create and export artifacts without opening the rest of the environment.

## Expected Behavior

- Activate `skillopt-setup`.
- Keep non-visual Codex target rollouts text-only and final-response-only.
- For cases with `visual_assertions`, allow bounded local workspace file edits and shell commands only for copied helper scripts, draw.io XML files, validators, and requested PNG/SVG exports.
- Enforce a strict Codex permission profile with minimal platform reads, narrow read-only access to the resolved Codex runtime, write access only to the temporary rollout workspace, a protected control-output path, and network disabled; do not rely on prompt text or legacy `workspace-write` for the read boundary.
- Keep browser, hosted, install, network, MCP, and out-of-workspace access disabled unless explicitly approved.
- Add config/readiness fields such as `tool_rollout_for_visual_assertions`, `require_drawio_cli_for_visual_rollouts`, `visual_exec_timeout`, and `visualArtifactReadiness`.
- Generate a `data-text-only` split that excludes visual assertion cases.
- In `visual_eval_policy: auto`, use `data-text-only` and report `text_only_ready` when `drawio` or `diagrams.net` is missing.
- If the user forces a full visual split without render tooling, fast-fail visual cases with a clear visual rollout blocker instead of starting nested Codex or hanging.

## Deterministic Assertions

- contains: visual_assertions
- contains: visualArtifactReadiness
- contains: tool_rollout_for_visual_assertions
- contains: visual_eval_policy
- contains: data-text-only
- contains: draw.io
- contains: text-only
- contains: permission profile
- contains: read
