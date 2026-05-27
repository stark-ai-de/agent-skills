# Setup Dry Run Continuation

## Should Trigger

Yes.

## Prompt

Prepare everything needed to optimize `codex-spec-interviewer` with SkillOpt, but show me the setup plan first. I want to keep going with SkillOpt after setup finishes.

## Expected Behavior

- Activate `skillopt-setup`.
- Ask or confirm setup depth and Python manager preference if approval is ambiguous.
- If an existing setup is detected, ask whether to remove it before dry-run or production-grade setup.
- If the user chooses reuse/update, pass `--existing-setup-choice reuse` to the setup helper.
- Ask whether the user wants a dry-run first.
- When the user chooses dry-run, use `setup-skillopt-local.mjs --skill codex-spec-interviewer --mode hybrid-codex-target`.
- After dry-run, ask whether to continue with production-grade setup.
- Dry-run output includes setup readiness, training readiness, proof status or blockers, data-floor status, model-pin gaps, and adapter-manifest refresh status when relevant.
- Dry-run/readiness does not run the Codex login probe unless the user explicitly asks, because the probe writes ignored diagnostics under `.agents/skillopt-work/_readiness`.
- Do not show production setup commands, reset commands, or SkillOpt training commands after dry-run.
- When the user skips dry-run, run production-grade setup directly with `--approved`.
- Do not clone into the installed skill folder.
- Do not use a temp directory for the main SkillOpt checkout.
- Existing setup cleanup is described as global to `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt.commit`, and `.agents/skillopt-work`, while excluding installed skills under `.agents/skills`.
- Explain that `.agents/tools/SkillOpt` and `.agents/skillopt-work/codex-spec-interviewer/` persist for continued runs.
- After production-grade setup succeeds, provide a paste-ready new-terminal command for SkillOpt training that automatically prints a compact run summary and `best_skill.md` dry-run adoption preview after successful training.
- Print the training command with explicit shell `\` continuation lines; do not emit the `python scripts/train.py` invocation as one long line that can wrap into a broken paste.
- Use unbuffered Python and visible terminal status lines for target skill, mode, run profile, output path, log path, resume behavior, and pauses while `tee` writes the training log.
- After the training pipeline exits, print an explicit success or failure message with the training log path and preserve the training exit code.
- Add a super-short description before each manual result rerun command: return to repo root, summarize the run, and dry-run adoption of `best_skill.md`.
- Add super-short descriptions for eval-only evaluation of `best_skill.md` and optional WebUI monitoring.
- The `best_skill.md` dry-run adoption preview reports the amount of change, including added lines, removed lines, net line delta, and character delta.
- Explain that pasting the training command into a new terminal keeps full logs and user control.
- Offer current-session execution only as an explicit option, naming `codex-spec-interviewer`.
