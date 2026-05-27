# Target Selection Before Training

## Should Trigger

Yes.

## Prompt

SkillOpt setup is ready. Do you want me to run the SkillOpt training now?

## Expected Behavior

- Activate `skillopt-setup`.
- Do not run training until exactly one target skill is known.
- If the current setup state identifies one target skill, recommend a paste-ready new-terminal SkillOpt command for that target that automatically prints the compact result summary and dry-run adoption preview after successful training.
- Explain that a new terminal gives the user full logs and direct control.
- Offer `Should I run SkillOpt training for <target-skill> in this agent session anyway?` only as an explicit current-session option.
- If the target is ambiguous or missing, ask which Agent Skill should be optimized.
- Do not ask a generic "run SkillOpt training now" question.
