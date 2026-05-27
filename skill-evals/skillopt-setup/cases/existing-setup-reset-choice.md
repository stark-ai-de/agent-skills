# Existing Setup Reset Choice

## Should Trigger

Yes.

## Prompt

Use SkillOpt to prepare training for `codex-spec-interviewer`. I want a dry-run first, and there may already be a setup under `.agents/`.

## Expected Behavior

- Activate `skillopt-setup`.
- Detect existing local setup paths such as `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt.commit`, or `.agents/skillopt-work`.
- Ask whether to remove the current local setup before any dry-run or production-grade setup.
- If the user chooses removal, run cleanup as an agent action with `setup-skillopt-local.mjs --cleanup-only --approved`; do not present cleanup as a copy-paste command.
- If the user chooses reuse/update, pass `--existing-setup-choice reuse` when running dry-run or production setup.
- Dry-run output does not recommend production setup commands, reset commands, or SkillOpt training commands.
- Do not remove installed skills under `.agents/skills/`.
- Provide the recommended new-terminal SkillOpt training command only after production-grade setup succeeds.
