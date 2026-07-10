# Troubleshooting

## Readiness Fails

- Missing `uv`: ask whether to install `uv` with `--install-uv`, use local Python with `--python-manager local`, or install `uv` manually.
- Missing Python: prefer `uv` so setup can provision Python; otherwise install Python 3.10 or newer and rerun readiness with `--python-manager local`.
- Missing Git: install Git before cloning SkillOpt.
- Missing SkillOpt clone: run the setup sequence in `references/runbook.md`.
- Missing eval cases: add `skill-evals/<skill>/cases/*.md` before training.
- Stale local setup: ask at startup whether to remove the current ignored setup. If approved, run `setup-skillopt-local.mjs --cleanup-only --approved` as an agent action before dry-run or production setup.

## Codex Probe Fails

- Run `codex` interactively once and complete local sign-in.
- Rerun `probe-codex-cli.mjs --json`.
- Check `.agents/skillopt-work/_readiness/codex-probe-final.txt` for the redacted final response.
- Strict readiness can reuse an existing successful probe; rerun the probe only when the cached final marker or diagnostic is missing/stale.
- Do not inspect or copy Codex auth token files.

## Adapter Preparation Fails

- Confirm `.agents/tools/SkillOpt` exists.
- Rerun with `--json` and inspect `.agents/skillopt-work/<skill>/adapter-manifest.json`.
- If training fails before rollouts because `../_base_/default.yaml` is missing, rerun `prepare-local-skillopt-adapter.mjs`; current setup creates `.agents/skillopt-work/<skill>/_base_/default.yaml`.
- If SkillOpt reports unknown environment `agent_skills`, rerun `prepare-local-skillopt-adapter.mjs`; current setup patches known local `scripts/train.py` and `scripts/eval_only.py` registry shapes inside `.agents/tools/SkillOpt` and records the result in `.agents/skillopt-work/<skill>/adapter-manifest.json`.
- If SkillOpt reports `AgentSkillsAdapter.__init__()` missing `config`, rerun `prepare-local-skillopt-adapter.mjs`; current setup copies an adapter that accepts flattened SkillOpt config kwargs and implements the current `EnvAdapter` lifecycle.
- If registry files changed upstream, treat setup as blocked until the adapter patch is reviewed.
- If readiness reports a legacy, stale, or checksum-mismatched adapter manifest, rerun production setup with `--existing-setup-choice reuse`; the adapter/config templates must be refreshed before training.
- If `codex-cli-all` readiness blocks on slow update or meta skill, keep both disabled or switch to `hybrid-codex-target`/`native-provider`; those mechanisms call upstream provider-backed optimizer functions.

## Visual Artifact Rollouts Fail

- If visual cases hang or always fail, rerun readiness and inspect `visualArtifactReadiness`.
- `missing_drawio_cli` means the active split still contains visual assertions and cannot produce PNG/SVG artifacts in this environment. Rerun adapter preparation with `--visual-eval-policy auto` or `text-only`, or install/expose `drawio`/`diagrams.net`.
- `text_only_ready` means setup selected `data-text-only`; full visual proof is deferred until render tooling exists. Codex target/judge/reflection execution must still pass the strict read-isolation capability probe.
- Non-visual cases must stay text-only. Visual cases may use local workspace file edits and shell commands only when `tool_rollout_for_visual_assertions` is enabled, and only for copied helper scripts, draw.io XML, validators, and requested PNG/SVG exports. Browser, hosted, install, network, and out-of-workspace access remain disabled.
- Every Codex target, judge, or reflection launch requires a Codex version that accepts the strict custom permission profile in the bounded config-parse probe. If Codex rejects it, fail closed; `data-text-only` bypasses draw.io only and is not an isolation fallback. Do not restore the legacy `workspace-write` path.
- `unsupported_visual_target_backend` means the active split still contains visual assertions while the target is provider-backed. Select `data-text-only` or switch to the artifact-capable `codex_exec` target; provider chat responses cannot satisfy artifact gates.
- If bubblewrap cannot re-execute Codex, verify that `codex_exec_path` resolves to the real executable or an npm/pnpm `@openai/codex` package. The rollout grants only that resolved runtime path read-only; opaque wrapper scripts that launch an unrelated hidden path must be replaced with a directly resolvable Codex command.
- If visual rollout timeouts occur with draw.io CLI present, lower `visual_exec_timeout`, inspect the preserved redacted workspace path, and keep the rollout bounded before increasing loops or workers.

## Local OpenAI-Compatible Gateway Fails

- `/v1/models` works but chat fails: do not mark the endpoint ready. Run `probe-openai-compatible-endpoint.mjs` and inspect only redacted status/error fields.
- `401`: auth is enabled; provide the configured bearer token to the probe without printing it.
- `400 cwd_subdir`: the metadata path must be relative and already exist under the configured workspace.
- Startup rejection for `allow_write` or `workspace-write`: the bundled gateway is text-only and read-isolated. Use a separately designed external OS/container boundary for any future write-capable service.
- Startup rejection for `ignore_user_config=false`, `ignore_rules=false`, `inherit_env=true`, or a non-empty profile setting: these controls are mandatory for untrusted SkillOpt prompts and cannot be relaxed in the bundled gateway.
- `413`: reduce the prompt/request body or increase the local gateway limit only for a justified local run.
- `500 codex_process_failed`: run `probe-codex-cli.mjs --json` and verify local Codex login without inspecting auth files.

## Adoption Fails

- Use the dry-run report to identify the rejected safety condition.
- Ask for a smaller candidate, or manually port only safe body edits.
- Keep backups under `.agents/skillopt-work/<skill>/backups/`.
