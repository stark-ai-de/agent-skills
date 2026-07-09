# Reflector Invalid JSON Fallback

## Should Trigger

Yes.

## Prompt

Codex CLI reflection returned a fenced JSON block once, prose around JSON once, and invalid non-JSON once. Make the `codex-cli-all` reflector robust so these cases do not crash SkillOpt.

## Expected Behavior

- Activate `skillopt-setup`.
- Configure the Codex CLI reflector with `stdin` closed and ignore user config/rules when the installed adapter supports those flags.
- Ask the reflector model for exactly one JSON object and no markdown.
- Extract a JSON object or array from fenced or prose-wrapped responses when possible.
- Degrade invalid, empty, timed-out, or nonzero Codex CLI reflection output to no patches instead of throwing.
- Validate every reflected patch before writing it.
- Skip reflected patches that edit frontmatter, include secret-like strings, reference unsupported optimizer sources, exceed the edit budget, or are otherwise malformed.
- Return only valid patches and keep patch count bounded for provider-free exploratory mode.
- Do not persist raw reflection transcripts in tracked files.

## Deterministic Assertions

- contains: codex_cli_reflector.py
- contains: JSON
- contains: no patches
- contains: frontmatter
- contains: secret-like
