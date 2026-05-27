# Eval Only And WebUI Handoff

## Should Trigger

Yes.

## Prompt

Setup succeeded for `codex-spec-interviewer`. Give me the final commands to run SkillOpt, inspect results, rerun evaluation, and optionally monitor the run.

## Expected Behavior

- Activate `skillopt-setup`.
- Provide the training command only after production-grade setup has succeeded.
- Print one paste-ready shell block for a new terminal from the repo root.
- The training block prints target skill, mode, run profile, output path, log path, resume note, and pause/progress explanation.
- The training block preserves the exit code while piping through `tee`.
- After successful training, the block runs `summarize-skillopt-run.mjs --terminal` and `apply-skillopt-best.mjs --dry-run --summary`.
- Provide a short description and command for rerunning the summary.
- Provide a short description and command for rerunning dry-run adoption preview with change counts.
- Provide a short description and command for `scripts/eval_only.py` against `best_skill.md`.
- Provide an optional WebUI command for local `.agents/` outputs without implying it must be installed automatically.
