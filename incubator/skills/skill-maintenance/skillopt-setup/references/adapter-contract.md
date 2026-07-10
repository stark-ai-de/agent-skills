# Agent Skills Adapter Contract

The local adapter is copied into `.agents/tools/SkillOpt/skillopt/envs/agent_skills/`. It is not committed after expansion into the SkillOpt clone.

`prepare-local-skillopt-adapter.mjs` also creates `.agents/skillopt-work/<skill>/_base_/default.yaml` for generated work configs, writes `.agents/skillopt-work/<skill>/adapter-manifest.json`, and patches known local SkillOpt `scripts/train.py` and `scripts/eval_only.py` registries so `env.name: agent_skills` can instantiate the adapter. Registry patches are isolated to the ignored local SkillOpt clone.

## Files

- `adapter.py`: coordinates dataset loading, rollout, scoring, and reflection.
- `dataloader.py`: loads split JSON and returns deterministic batches.
- `rollout.py`: executes one case in an isolated workspace.
- `evaluator.py`: scores Agent Skill responses. Native-provider mode uses the configured provider optimizer path as a semantic judge; Codex CLI modes use a read-isolated Codex-CLI judge through the user's local login. Deterministic and visual checks remain hard gates before either semantic judge.
- `codex_cli_reflector.py`: implements exploratory Codex CLI patch reflection.

## Required Behavior

- Optimize only the skill body by default.
- Preserve frontmatter outside explicit trigger-description work.
- Route `codex_exec` targets through the read-isolated local Codex runner and supported HTTP provider chat targets through installed SkillOpt `skillopt.model.chat_target`. Fail closed for `claude_chat`, which invokes a local host-readable CLI in upstream SkillOpt rather than a provider HTTP boundary, and for `claude_code_exec`, which this rollout adapter does not implement. Treat `minimax_chat` as target-only because installed SkillOpt has no MiniMax optimizer branch.
- Match the installed SkillOpt `EnvAdapter` lifecycle: constructor kwargs or `config` can come from the flattened config, `setup(cfg)` initializes splits, `get_dataloader()` returns a batch planner, and rollout/reflection methods accept the trainer's batch signatures.
- Return rollout records with `id`, `hard`, `soft`, `prediction`, `assertion_results`, and `task_type`.
- Require semantic judging for official-parity runs: `judge_backend: provider` uses the configured supported optimizer provider, while `judge_backend: codex_cli` uses the verified read-isolated Codex judge. Keep the literal-match heuristic exploratory-only.
- Keep provider targets and non-visual Codex target rollouts text-only. Provider chat targets must fail closed on active `visual_assertions`; use the generated text-only split or an artifact-capable Codex target with `tool_rollout_for_visual_assertions` enabled.
- Inline only a bounded, UTF-8, secret-sanitized snapshot of seeded textual helpers and fixtures for text-only targets. Fail closed when a required fixture is binary or exceeds the per-file/total context limits.
- Enforce a strict Codex permission profile for every local target rollout. Non-visual cases receive minimal runtime reads only, no workspace read/write grant, a protected host-written final-output path, no network, and a minimal shell environment.
- For `visual_assertions` cases, enforce a strict Codex permission profile with minimal platform reads, a narrow read-only grant for the resolved Codex executable/package, write access only to the rollout workspace, a denied control-output directory, and network disabled. Within that boundary, allow shell/file operations only for copied helper scripts, draw.io XML, deterministic validators, and requested PNG/SVG artifacts. Browser, hosted, install, network, and out-of-workspace access remain forbidden.
- Reject symlink artifacts and enforce file-count, byte, dimension, decoded-pixel, and decompression limits during trusted post-processing so generated artifacts cannot reintroduce host reads or exhaust the trainer.
- If `require_drawio_cli_for_visual_rollouts` is enabled and neither `drawio` nor `diagrams.net` is on PATH, return a fast-fail rollout with `visual_rollout_blocker` instead of starting nested Codex.
- Before any Codex-backed target, judge, or reflection handoff, require readiness to run its bounded `--strict-config` parse probe with the real permission profile. The probe deliberately stops on a missing local output schema before a session or network/model call can start. Help text alone is not proof, and a text-only split bypasses draw.io readiness only, never Codex read isolation.
- Generated configs must honor `visual_eval_policy`: `auto` uses the full split only for an artifact-capable `codex_exec` target with render tooling and uses `data-text-only` for provider targets or missing render tooling; `full` keeps visual cases active and therefore blocks provider targets; `text-only` always uses the generated text-only split.
- In `codex-cli-all`, judge expected behavior semantically with `codex exec`; do not require OpenAI API keys or inspect Codex auth material.
- In `native-provider`, set `judge_backend: provider` and judge expected behavior semantically through `skillopt.model.chat_optimizer`; do not classify literal-substring heuristic judging as official parity.
- In `codex-cli-all`, return at most one reflected raw patch capped to the edit budget, so SkillOpt's aggregate/select stages use deterministic fallbacks and do not call provider-backed optimizer ranking or merging.
- Reject reflection patches that include frontmatter, secrets, raw auth paths, whole-skill rewrites in patch mode, or unsupported dependencies.

## Drift Handling

SkillOpt source shape can change. The preparer records a manifest, template checksums, and local registry/config patch status. It must refuse silent registry edits when the local clone does not match known patterns. Readiness must block training when the manifest is missing, legacy/global, for another target/mode/profile, checksum-mismatched, or records anything other than `registry_patch.status: ready`.
