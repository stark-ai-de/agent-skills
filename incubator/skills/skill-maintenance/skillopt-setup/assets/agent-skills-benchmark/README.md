# Agent Skills Benchmark Assets

These files are templates for a local SkillOpt adapter. They are copied into `.agents/tools/SkillOpt/` by `prepare-local-skillopt-adapter.mjs`.

The tracked assets are not a vendored SkillOpt clone. They only describe how this repository's `skill-evals/` cases can be loaded, rolled out, scored, and reflected inside a local SkillOpt checkout.

## Modes

- `config.native-provider.yaml`: provider-backed target, optimizer/reflection, and semantic judge with official-parity defaults.
- `config.hybrid-codex-target.yaml`: Codex CLI target rollout and semantic judge with provider-backed optimizer and locally scaled official-parity defaults.
- `config.codex-cli-all.yaml`: exploratory Codex CLI target, semantic judge, and adapter-managed reflection without provider credentials.

Generated per-skill work configs keep `_base_: ../_base_/default.yaml`; the preparer creates the matching `.agents/skillopt-work/<skill>/_base_/default.yaml` during setup.

Target rollouts are text-only by default. Provider chat targets call installed SkillOpt `chat_target` and fail closed when a visual case remains active. Codex targets always use strict read-isolated permission profiles; cases with `visual_assertions` may additionally use bounded local workspace edits and shell commands for copied helper scripts, draw.io XML, validators, and requested PNG/SVG export. If draw.io Desktop CLI is required but no `drawio`/`diagrams.net` executable is on PATH, the rollout fast-fails with `visual_rollout_blocker` instead of hanging the trainer.

Review `.agents/skillopt-work/<skill>/adapter-manifest.json` after copying templates into a local clone. A legacy copy is also written to `.agents/skillopt-work/adapter-manifest.json` for older tooling.
