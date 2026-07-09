# Verify Run Artifacts

## Should Trigger

Yes.

## Prompt

Training finished for `.agents/skillopt-work/codex-spec-interviewer/outputs/run-002`. Check whether the run has enough artifacts to count as SkillOpt proof before writing a public summary.

## Expected Behavior

- Activate `skillopt-setup`.
- Use or propose `verify-skillopt-run-artifacts.mjs --skill codex-spec-interviewer --run .agents/skillopt-work/codex-spec-interviewer/outputs/run-002 --terminal`.
- Verify `config.json`, `history.json`, `runtime_state.json`, `best_skill.md`, `steps/`, and `skills/`.
- If slow update or meta skill is enabled, verify their output directories or report that the proof is partial or blocked.
- Report eval-only status separately from training completion.
- Check optional WebUI importability only when explicitly requested; do not silently install WebUI dependencies.
- Do not read or publish raw trajectories.

## Deterministic Assertions

- contains: verify-skillopt-run-artifacts.mjs
- contains: config.json
- contains: history.json
- contains: runtime_state.json
- contains: best_skill.md
