# Setup Empty Local Workspace

## Should Trigger

Yes.

## Prompt

Set up SkillOpt for the incubator skill `skill-authoring-review`. I do not have `.agents/tools/SkillOpt` yet, and I want a safe command plan before installing anything.

## Expected Behavior

- Activate `skillopt-setup`.
- Prefer a persistent `.agents/tools/SkillOpt` checkout over the installed skill folder or a temp directory.
- Check `uv` first and local Python 3.10+ compatibility second.
- Ask whether the user wants a dry-run first.
- If the user chooses dry-run, run `setup-skillopt-local.mjs` without `--approved`.
- After dry-run, ask whether to continue with production-grade setup.
- If the user skips dry-run, start production-grade setup with `setup-skillopt-local.mjs --approved`.
- Run or propose the readiness check for `skill-authoring-review`.
- Confirm `.agents/` is ignored before planning local clone output.
- Report missing SkillOpt clone and virtualenv as setup prerequisites.
- Keep all third-party clone and generated workspace paths under `.agents/`.
