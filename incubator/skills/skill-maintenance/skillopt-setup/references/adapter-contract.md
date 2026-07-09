# Agent Skills Adapter Contract

The local adapter is copied into `.agents/tools/SkillOpt/skillopt/envs/agent_skills/`. It is not committed after expansion into the SkillOpt clone.

`prepare-local-skillopt-adapter.mjs` also creates `.agents/skillopt-work/<skill>/_base_/default.yaml` for generated work configs, writes `.agents/skillopt-work/<skill>/adapter-manifest.json`, and patches known local SkillOpt `scripts/train.py` and `scripts/eval_only.py` registries so `env.name: agent_skills` can instantiate the adapter. Registry patches are isolated to the ignored local SkillOpt clone.

## Files

- `adapter.py`: coordinates dataset loading, rollout, scoring, and reflection.
- `dataloader.py`: loads split JSON and returns deterministic batches.
- `rollout.py`: executes one case in an isolated workspace.
- `evaluator.py`: scores Agent Skill responses. Codex CLI modes use a Codex-CLI LLM judge through the user's local Codex login; deterministic scoring remains the fallback for non-Codex modes or judge failures.
- `codex_cli_reflector.py`: implements exploratory Codex CLI patch reflection.

## Required Behavior

- Optimize only the skill body by default.
- Preserve frontmatter outside explicit trigger-description work.
- Use SkillOpt `codex_exec` for Codex target rollouts where available.
- Match the installed SkillOpt `EnvAdapter` lifecycle: constructor kwargs or `config` can come from the flattened config, `setup(cfg)` initializes splits, `get_dataloader()` returns a batch planner, and rollout/reflection methods accept the trainer's batch signatures.
- Return rollout records with `id`, `hard`, `soft`, `prediction`, `assertion_results`, and `task_type`.
- In `codex-cli-all`, judge expected behavior semantically with `codex exec`; do not require OpenAI API keys or inspect Codex auth material.
- In `codex-cli-all`, return at most one reflected raw patch capped to the edit budget, so SkillOpt's aggregate/select stages use deterministic fallbacks and do not call provider-backed optimizer ranking or merging.
- Reject reflection patches that include frontmatter, secrets, raw auth paths, whole-skill rewrites in patch mode, or unsupported dependencies.

## Drift Handling

SkillOpt source shape can change. The preparer records a manifest and should refuse silent registry edits when the local clone does not match known patterns.
