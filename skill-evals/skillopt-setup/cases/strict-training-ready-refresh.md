# Strict Training Ready Refresh

## Should Trigger

Yes.

## Prompt

I already have `.agents/tools/SkillOpt` and `.agents/skillopt-work` from an older experiment. Before I run SkillOpt for several hours, make sure the setup is actually training-ready for `hybrid-codex-target` official parity and not using stale adapter files.

## Expected Behavior

- Activate `skillopt-setup`.
- Ask whether to reuse/update or clean up the existing ignored setup before production setup.
- Use target-specific `.agents/skillopt-work/<skill>/adapter-manifest.json` rather than trusting a legacy global manifest.
- Refresh adapter files and generated configs during reuse/update.
- Require manifest target, mode, and run profile to match the requested run.
- Require `registry_patch.status: ready` and current template checksum/freshness checks before training.
- Use `--strict-training-ready` when the user wants a guaranteed training handoff.
- Block training if provider credentials, model pins, Codex probe, generated splits, config schema, or adapter manifest freshness are missing.
- Keep `.agents/skills` and unrelated tracked files untouched.

## Deterministic Assertions

- contains: --strict-training-ready
- contains: adapter-manifest.json
- contains: registry_patch.status
- contains: refresh
- contains: training-ready
