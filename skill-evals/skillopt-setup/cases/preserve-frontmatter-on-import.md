# Preserve Frontmatter On Import

## Should Trigger

Yes.

## Prompt

Review `.agents/skillopt-work/skill-authoring-review/outputs/run-001/best_skill.md` and import it into the target `SKILL.md` if it looks better.

## Expected Behavior

- Activate `skillopt-setup`.
- Treat `best_skill.md` as a candidate, not a merge-ready artifact.
- Run or propose `apply-skillopt-best.mjs --dry-run`.
- The dry-run output reports the amount of change before any full diff.
- Preserve original frontmatter unless frontmatter optimization was explicitly requested.
- Reject changes that alter `name`, `description`, `license`, or `metadata`.
- Require explicit approval before writing tracked files.
