# Official Best Practices Gap Notes

Use this when deciding whether a local Agent Skills run is `official-parity` or `exploratory`.

## Wizard Principle

Guide users toward the best configuration by asking for one setup decision at a time:

1. target skill,
2. cleanup or reuse of the existing `.agents/` setup,
3. no-provider exploration vs official-parity proof,
4. Python setup with `uv` preferred,
5. data floor readiness,
6. provider credentials and model pins when official parity is requested,
7. dry-run vs production setup,
8. new-terminal training handoff after setup.

Do not present production setup or training commands during the dry-run step. Do not claim official parity until credentials, model pins, data floor, config schema, and run artifacts are verified.

## Official-Parity Profile

Use `official-parity` only when the optimizer path is provider-backed:

- `native-provider`: provider-backed target rollout and optimizer/reflection.
- `hybrid-codex-target`: Codex CLI target rollout and judging, with provider-backed optimizer/reflection.

Expected setup properties:

- Provider credentials are present for native optimizer/reflection.
- Validation gate and test evaluation are enabled.
- Slow update and meta skill are enabled.
- Learning-rate schedule is `cosine`.
- Edit budget is close to the official default: `learning_rate: 4`, `min_learning_rate: 2`.
- Model choices are pinned or the summary explicitly records inherited defaults.
- Target data has enough positive cases and held-out validation/test cases to avoid overfitting.

Recommended data floor for an official-parity claim:

- 20 or more positive optimization cases.
- 5 or more validation cases.
- 5 or more test cases.
- Deterministic assertions or fixture-backed checks where possible.

## Exploratory Profile

Use `exploratory` for:

- `codex-cli-all`.
- tiny datasets.
- local smoke runs.
- missing model pins.
- setup-only validation before provider credentials are available.

`codex-cli-all` is useful because it avoids provider credentials by using the user's Codex login for rollouts, semantic judging, and adapter-managed reflection. It is not upstream-native official optimizer parity because provider-backed reflection, aggregation, ranking, slow update, and meta skill are bypassed or locally managed.

## Reporting Requirements

Readiness and summaries should report:

- proof status and proof blockers,
- run profile,
- official-parity status,
- official-parity gaps,
- dataset split counts,
- deterministic assertion, fixture, and expected-artifact coverage,
- model pins or inherited defaults,
- SkillOpt commit and config schema check result,
- generated config defaults,
- registry patch status,
- expected local artifacts such as `config.json`, `history.json`, `runtime_state.json`, and `best_skill.md`.

## Proof Checklist

Before calling a run official-parity proof:

- Re-check the local SkillOpt clone, `scripts/train.py --help`, and `scripts/eval_only.py --help` against generated config keys.
- Use a fresh output directory unless the goal is explicitly to test resume behavior.
- Require provider credentials and explicit optimizer/target/judge model pins for provider-backed proof modes.
- Verify `config.json`, `history.json`, `runtime_state.json`, `best_skill.md`, `steps/`, and `skills/`.
- If slow update or meta skill is enabled, verify the corresponding output directory or record why it was skipped.
- Run or separately schedule eval-only on `best_skill.md`.
- Check whether optional WebUI support is importable before recommending it as available.
- Publish only curated summaries under `skill-evals/<target>/runs/`; keep raw `.agents/` logs and trajectories ignored.
