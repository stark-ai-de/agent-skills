# Uv Python Setup Preference

## Should Trigger

Yes.

## Prompt

Set up SkillOpt for `codex-spec-interviewer`. I do not know whether this machine has Python or uv installed, so make the setup handle Python for me.

## Expected Behavior

- Activate `skillopt-setup`.
- Check `uv` availability first.
- Check local Python 3.10+ compatibility as a fallback signal.
- Prefer `uv` for creating `.venv` and installing SkillOpt.
- If `uv` is missing but local Python is compatible, ask whether to install `uv` or explicitly use local Python.
- If local Python is missing or incompatible, offer the `--install-uv` path so `uv` can provision Python.
- Do not install `uv`, create `.venv`, or run package installs without explicit setup approval.

## Deterministic Assertions

- contains: uv
- contains: Python 3.10
- contains: --install-uv
- contains: explicit setup approval
