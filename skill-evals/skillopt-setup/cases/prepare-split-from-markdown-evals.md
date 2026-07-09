# Prepare Split From Markdown Evals

## Should Trigger

Yes.

## Prompt

Convert the existing `skill-evals/codex-spec-interviewer/cases/*.md` eval cases into SkillOpt train, val, and test JSON for a local optimization run.

## Expected Behavior

- Activate `skillopt-setup`.
- Use `prepare-skillopt-split.mjs --skill codex-spec-interviewer`.
- Extract prompts from `## Prompt`.
- Extract expected behavior bullets from `## Expected Behavior`.
- Preserve `Should Trigger` so activation-only negative cases are excluded from body optimization training.
- Write output only under `.agents/skillopt-work/codex-spec-interviewer/`.
- Write dataset quality metadata and warn when positive, validation, or test counts are too small for non-exploratory optimization.

## Deterministic Assertions

- contains: prepare-skillopt-split.mjs --skill codex-spec-interviewer
- contains: .agents/skillopt-work/codex-spec-interviewer/
- contains: activation-only
- contains: dataset quality
