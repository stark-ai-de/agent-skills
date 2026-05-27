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
- Do not inspect or copy Codex auth token files.

## Adapter Preparation Fails

- Confirm `.agents/tools/SkillOpt` exists.
- Rerun with `--json` and inspect `.agents/skillopt-work/<skill>/adapter-manifest.json`.
- If training fails before rollouts because `../_base_/default.yaml` is missing, rerun `prepare-local-skillopt-adapter.mjs`; current setup creates `.agents/skillopt-work/<skill>/_base_/default.yaml`.
- If SkillOpt reports unknown environment `agent_skills`, rerun `prepare-local-skillopt-adapter.mjs`; current setup patches known local `scripts/train.py` and `scripts/eval_only.py` registry shapes inside `.agents/tools/SkillOpt` and records the result in `.agents/skillopt-work/<skill>/adapter-manifest.json`.
- If SkillOpt reports `AgentSkillsAdapter.__init__()` missing `config`, rerun `prepare-local-skillopt-adapter.mjs`; current setup copies an adapter that accepts flattened SkillOpt config kwargs and implements the current `EnvAdapter` lifecycle.
- If registry files changed upstream, treat setup as blocked until the adapter patch is reviewed.

## Adoption Fails

- Use the dry-run report to identify the rejected safety condition.
- Ask for a smaller candidate, or manually port only safe body edits.
- Keep backups under `.agents/skillopt-work/<skill>/backups/`.
