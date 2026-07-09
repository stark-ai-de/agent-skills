# Hybrid Codex Target Config

## Should Trigger

Yes.

## Prompt

Generate the SkillOpt config for optimizing `codex-spec-interviewer` with Codex CLI as the target rollout backend and OpenAI as the optimizer backend.

## Expected Behavior

- Activate `skillopt-setup`.
- Select `hybrid-codex-target` mode with the `official-parity` run profile.
- Generate `agent-skills.hybrid-codex-target.yaml` under `.agents/skillopt-work/codex-spec-interviewer/configs/`.
- Set `target_backend: codex_exec`.
- Set `codex_exec_use_sdk: cli`.
- Set `codex_exec_full_auto: false`.
- Set explicit sandbox, approval, network, and web search controls.
- State that optimizer credentials are still required for native reflection.
- Enable validation gate, test evaluation, slow update, meta skill, cosine schedule, and official-style edit budget settings unless the local SkillOpt commit does not support the key.

## Deterministic Assertions

- contains: hybrid-codex-target
- contains: agent-skills.hybrid-codex-target.yaml
- contains: target_backend: codex_exec
- contains: codex_exec_full_auto: false
- contains: use_slow_update: true
