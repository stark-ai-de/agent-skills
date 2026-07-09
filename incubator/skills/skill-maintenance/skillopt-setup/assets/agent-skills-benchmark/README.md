# Agent Skills Benchmark Assets

These files are templates for a local SkillOpt adapter. They are copied into `.agents/tools/SkillOpt/` by `prepare-local-skillopt-adapter.mjs`.

The tracked assets are not a vendored SkillOpt clone. They only describe how this repository's `skill-evals/` cases can be loaded, rolled out, scored, and reflected inside a local SkillOpt checkout.

## Modes

- `config.native-provider.yaml`: provider-backed target and optimizer with official-parity defaults.
- `config.hybrid-codex-target.yaml`: Codex CLI target rollout and semantic judge with provider-backed optimizer and locally scaled official-parity defaults.
- `config.codex-cli-all.yaml`: exploratory Codex CLI target, semantic judge, and adapter-managed reflection without provider credentials.

Generated per-skill work configs keep `_base_: ../_base_/default.yaml`; the preparer creates the matching `.agents/skillopt-work/<skill>/_base_/default.yaml` during setup.

Review `.agents/skillopt-work/<skill>/adapter-manifest.json` after copying templates into a local clone. A legacy copy is also written to `.agents/skillopt-work/adapter-manifest.json` for older tooling.
