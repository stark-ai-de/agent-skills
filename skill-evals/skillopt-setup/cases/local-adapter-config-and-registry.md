# Local Adapter Config And Registry

## Should Trigger

Yes.

## Prompt

SkillOpt setup created configs, but training failed before rollouts because `_base_/default.yaml` was missing. After fixing that, SkillOpt reported that `agent_skills` was not registered in `scripts/train.py`. A later run reached adapter construction and failed with `AgentSkillsAdapter.__init__()` missing `config`. Fix the setup flow for the next run.

## Expected Behavior

- Activate `skillopt-setup`.
- Treat the problem as a setup-generation defect, not a training-data defect.
- Rerun or propose `prepare-local-skillopt-adapter.mjs` for the selected target skill.
- Ensure `.agents/skillopt-work/<skill>/_base_/default.yaml` exists for generated per-skill configs.
- Patch known local `.agents/tools/SkillOpt/scripts/train.py` and `scripts/eval_only.py` registry shapes so `agent_skills` is available.
- Install an adapter/dataloader pair that matches the current SkillOpt `EnvAdapter` lifecycle and accepts flattened config kwargs from `get_adapter`.
- Record the result in `.agents/skillopt-work/<skill>/adapter-manifest.json` with `registry_patch.status` set to `ready`, or block with manual review if the local SkillOpt entrypoints have an unknown shape.
- Do not edit tracked SkillOpt sources or stage files.

## Deterministic Assertions

- contains: prepare-local-skillopt-adapter.mjs
- contains: _base_/default.yaml
- contains: agent_skills
- contains: adapter-manifest.json
