# Codex CLI Runner

Codex CLI mode is for users who are already authenticated locally and want SkillOpt target rollouts to run through `codex exec`.

## Probe

Use the bundled probe before Codex-backed runs:

```bash
node <skill-root>/scripts/probe-codex-cli.mjs --json
```

Resolve `<skill-root>` to the loaded `skillopt-setup` skill directory, such as `.agents/skills/skillopt-setup` for a repo-local install.

The probe asks Codex to return exactly `CODEX_READY` and stores only redacted readiness files under `.agents/skillopt-work/_readiness/`.

## Default Execution Settings

Generated configs should set:

```yaml
target_backend: codex_exec
codex_exec_path: codex
codex_exec_use_sdk: cli
codex_exec_full_auto: false
codex_exec_reasoning_effort: none
codex_exec_sandbox: workspace-write
codex_exec_network_access: false
codex_exec_web_search: false
codex_exec_approval_policy: never
tool_rollout_for_visual_assertions: true
require_drawio_cli_for_visual_rollouts: true
visual_exec_timeout: 120
visual_eval_policy: auto
```

Use `read-only` for probes. `codex_exec_sandbox` remains in generated configs for compatibility with older local adapters, but current target rollouts do not rely on legacy sandboxes because they permit host-wide reads.

Every Codex target, judge, and reflection launch selects a strict permission profile with `:minimal` platform reads, a narrow read-only grant for the resolved Codex executable or `@openai/codex` package, no inherited trainer secrets, and network disabled. Non-visual cases receive no workspace read or write grant and remain final-response-only. A case with `visual_assertions` may additionally use bounded rollout-workspace edits and shell commands for copied helper scripts, draw.io XML, deterministic validators, and requested PNG/SVG export; its protected control-output directory remains denied. `--strict-config` makes incompatible Codex versions fail closed instead of falling back to `workspace-write`. Strict readiness verifies this with an actual bounded config-parse launch that deliberately fails on a missing local output schema before session creation, model access, or network access. Browser, hosted, install, network, and out-of-workspace access remain disabled. When `visual_eval_policy: auto` and no `drawio`/`diagrams.net` executable is on PATH, generated configs should use `data-text-only`; that fallback bypasses draw.io only and still requires the strict Codex isolation probe. Provider-backed targets cannot create visual artifacts and must select `data-text-only` whenever source cases contain visual assertions. When visual cases remain active and `require_drawio_cli_for_visual_rollouts` is enabled, the adapter should fast-fail with `visual_rollout_blocker` before launching nested Codex.

## Usage Limits

Codex CLI runs through a ChatGPT plan may avoid direct API-key setup for target rollouts, but they still consume local plan allowance and can hit rate limits. Keep exploratory runs small and record target backend, optimizer backend, and Codex CLI version in public summaries.

## Slow/Meta Boundary

`codex-cli-all` is provider-free only while `optimizer.use_slow_update` and `optimizer.use_meta_skill` stay disabled. SkillOpt's upstream slow update and meta skill functions call the provider-backed optimizer path, so use `hybrid-codex-target` or `native-provider` when those mechanisms are required.
