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
codex_exec_sandbox: workspace-write
codex_exec_network_access: false
codex_exec_web_search: false
```

Use `read-only` for probes. Use `workspace-write` only for isolated rollout workspaces.

## Usage Limits

Codex CLI runs through a ChatGPT plan may avoid direct API-key setup for target rollouts, but they still consume local plan allowance and can hit rate limits. Keep exploratory runs small and record target backend, optimizer backend, and Codex CLI version in public summaries.
