# SkillOpt Setup Runbook

Use this runbook after the skill has activated and the user has confirmed a target skill.

Do not proceed to setup or training with an implicit target. If the user did not name exactly one target skill, ask which skill should be optimized.

Resolve bundled helper scripts relative to the loaded skill directory. In commands below, `<skill-root>` means the installed `skillopt-setup` folder, for example `.agents/skills/skillopt-setup` in a repo-local install.

## Local Workspace

All third-party code, generated config, rollouts, traces, and backups belong under ignored `.agents/` paths:

```text
.agents/tools/SkillOpt/
.agents/tools/SkillOpt.commit
.agents/skillopt-work/<target-skill>/
```

Only curated run summaries should be committed under `skill-evals/<target-skill>/runs/`.

Do not clone SkillOpt into the installed skill folder. The installed skill should remain a portable runtime payload. Do not use a temporary directory for the main setup because the user needs the checkout, virtualenv, configs, split data, and run outputs for later SkillOpt commands.

## Setup Preference Check

Run setup as a wizard. Confirm one decision at a time, reuse answers the user already gave, and do not show copy-paste commands until the step needs them.

### Wizard Steps

1. Target skill: ask until exactly one target skill is known.
2. Existing setup: if `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt.commit`, or `.agents/skillopt-work` exists, ask remove vs reuse/update before any dry-run or production setup.
3. Goal: ask whether the user wants easiest no-provider exploration, official-parity proof, or just setup smoke testing.
4. Mode/profile: recommend the best configuration branch from the table below.
5. Python: prefer `uv`; if missing, ask whether to install `uv` or explicitly use local Python 3.10+.
6. Data quality: report split counts and whether official-parity proof is possible.
7. Credentials and model pins: collect only presence and model names, never secret values.
8. Dry-run choice: ask dry-run first vs production setup now. Dry-run output must include a compact readiness summary and no setup or training command.
9. Production setup: run setup as an agent action after approval.
10. Training handoff: print the new-terminal command only after successful production setup.

Training and `best_skill.md` adoption are separate choices after setup.
Use a fresh `--run-name` for proof runs unless the user explicitly wants to test SkillOpt resume behavior.

### Wizard Output Shape

Keep each wizard answer short and state the current decision before asking the next one:

- Dry-run: target, maturity/path, mode/profile, Python path, existing setup choice, setup readiness, training readiness, proof status/blockers, data-floor status, model-pin gaps, adapter-manifest refresh status, then the production setup question.
- Production setup success: completed setup steps, local paths, new-terminal training command, short manual result commands, then the current-session execution question.
- Readiness: separate setup readiness from training readiness and proof status. `safe_to_setup: true` means the helper can prepare `.agents/`; it does not mean an official-parity training run has all credentials and model pins.
- Existing setup: describe cleanup as global to `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt.commit`, and `.agents/skillopt-work`; it does not remove installed skills under `.agents/skills`.
- Codex probe: dry-run/readiness should skip the login probe unless the user asks, because the probe writes ignored diagnostics under `.agents/skillopt-work/_readiness`.

### Best-Practice Configuration Branches

| User goal | Mode | Profile | Requirements | Notes |
| --- | --- | --- | --- | --- |
| Fastest setup-to-run path without provider keys | `codex-cli-all` | `exploratory` | Logged-in Codex CLI; optional model pins for target, judge, and reflection | Recommended when the user wants to try SkillOpt now. It is not official parity. |
| Best local official-parity path with Codex target rollouts | `hybrid-codex-target` | `official-parity` | Provider credentials for optimizer/reflection, `SKILLOPT_OPTIMIZER_MODEL`, `SKILLOPT_TARGET_MODEL`, `SKILLOPT_JUDGE_MODEL`, Codex CLI login, data floor met | Uses Codex for target rollouts and judging, but keeps provider-backed optimizer behavior. |
| Most upstream-native provider-backed path | `native-provider` | `official-parity` | Provider credentials, `SKILLOPT_OPTIMIZER_MODEL`, `SKILLOPT_TARGET_MODEL`, data floor met | Use when the target can run through provider-backed chat instead of Codex CLI. |
| Smoke test only | any mode | `exploratory` | Minimal local prerequisites | Do not publish as official-parity proof. |

Official-parity config should keep validation gate, test evaluation, cosine schedule, slow update, meta skill, official-style edit budgets, fresh run output, artifact verification, eval-only proof, and curated public summaries. If any of those are unsupported or missing, report the exact proof blocker or gap.

## Startup Mode Note

Tell the user this before asking for setup depth:

```text
If you want setup-to-run SkillOpt without provider credentials, choose codex-cli-all. It uses Codex CLI for rollouts, semantic LLM judging, and adapter-managed reflection through the user's Codex login, so it is the easiest no-provider path. It is exploratory and not upstream-native official optimizer parity. hybrid-codex-target uses Codex CLI for rollouts and judging but still needs optimizer credentials.
```

Use `codex-cli-all` first when the user has no optimizer credentials or wants the simplest Codex-only path. Use `hybrid-codex-target` when the user wants upstream-native SkillOpt reflection and has optimizer credentials. Classify tiny datasets as exploratory even in provider-backed modes.

## Python Setup

Prefer `uv` for Python work. With `uv`, setup can create `.venv` with the requested Python version and let `uv` provision Python when needed:

```bash
uv venv --python 3.10 .venv
uv pip install --python .venv/bin/python -e .
```

If `uv` is not installed, do not silently fall back to local Python. Ask the user whether to:

- install `uv` with the official Astral installer by rerunning setup with `--install-uv`,
- use local Python 3.10+ explicitly with `--python-manager local --python python3`,
- install `uv` manually and rerun readiness.

Use local Python only after that explicit choice:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
```

## Setup Sequence

1. Immediately check current setup state. If `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt.commit`, or `.agents/skillopt-work` exists, ask:

```text
Remove the current local SkillOpt setup before continuing, or reuse/update it?
```

If the user chooses removal, run cleanup yourself before dry-run or production setup. Do not present cleanup as a copy-paste command. Cleanup removes the local SkillOpt clone, commit file, and all `.agents/skillopt-work` contents; it does not remove installed skills under `.agents/skills/`.

```bash
node <skill-root>/scripts/setup-skillopt-local.mjs \
  --skill <target-skill> \
  --mode hybrid-codex-target \
  --cleanup-only \
  --approved
```

If the user chooses reuse/update instead, add `--existing-setup-choice reuse` to later dry-run and production setup helper invocations.

2. Ask:

```text
Do you want a dry-run first, or should I start production-grade setup now?
```

3. If the user chooses dry-run first, run:

```bash
node <skill-root>/scripts/setup-skillopt-local.mjs \
  --skill <target-skill> \
  --mode hybrid-codex-target \
  --run-profile official-parity \
  --python-manager auto
```

If the user chose to reuse/update existing setup, include `--existing-setup-choice reuse`.

Report the dry-run result only, including setup readiness, training readiness, proof status/blockers, data-floor status, model-pin gaps, and adapter-manifest refresh status. Do not show production setup commands, reset commands, or SkillOpt training commands after a dry-run. Then ask:

```text
Continue with production-grade setup for <target-skill> using the existing .agents setup in <mode> <profile> mode?
```

4. If the user continues, or if the user skipped dry-run, run production-grade setup as an agent action:

```bash
node <skill-root>/scripts/setup-skillopt-local.mjs \
  --skill <target-skill> \
  --mode hybrid-codex-target \
  --run-profile official-parity \
  --python-manager auto \
  --approved
```

If the user chose to reuse/update existing setup, include `--existing-setup-choice reuse`.

Add `--install-uv` only after the user chooses the `uv` installer path. Add `--python-manager local --python python3` only after the user chooses local Python. Add `--probe-codex` only when the user wants a live Codex CLI login probe during setup.

5. Run readiness:

```bash
node <skill-root>/scripts/check-skillopt-readiness.mjs \
  --skill <target-skill> \
  --mode hybrid-codex-target \
  --run-profile official-parity \
  --json
```

6. Clone SkillOpt locally when missing, if running setup manually:

```bash
mkdir -p .agents/tools .agents/skillopt-work
git clone https://github.com/microsoft/SkillOpt.git .agents/tools/SkillOpt
cd .agents/tools/SkillOpt
uv venv --python 3.10 .venv
. .venv/bin/activate
uv pip install --python .venv/bin/python -e .
python -c "import skillopt; print('SkillOpt import ok')"
git rev-parse HEAD > ../SkillOpt.commit
```

7. Prepare local data, if not using the setup orchestrator:

```bash
node <skill-root>/scripts/prepare-skillopt-split.mjs \
  --skill <target-skill> \
  --seed 42
```

8. Prepare the adapter and configs, if not using the setup orchestrator:

```bash
node <skill-root>/scripts/prepare-local-skillopt-adapter.mjs \
  --skill <target-skill> \
  --skillopt .agents/tools/SkillOpt \
  --mode hybrid-codex-target \
  --run-profile official-parity
```

9. Recommend the paste-ready SkillOpt command for a new terminal from the repo root. Explain that terminal execution keeps full logs and direct user control. Then offer current-session execution as an explicit option: `Should I run SkillOpt training for <target-skill> in this agent session anyway?`

## Continue After Setup

The setup orchestrator prints a command block for the selected target skill. Recommend pasting it into a new terminal from the repo root so the user keeps full logs and can interrupt or rerun without depending on the active agent session. The command should stream training logs, then automatically print a compact run summary and dry-run adoption preview. A typical hybrid start command is:

```bash
run_skillopt_training() {
  skillopt_repo_root=$(pwd)
  set -o pipefail
  cd .agents/tools/SkillOpt || return
  . .venv/bin/activate
  mkdir -p ../../skillopt-work/<target-skill>/outputs/run-001
  echo "Starting SkillOpt training for <target-skill> (hybrid-codex-target, official-parity)"
  echo "Rerunning this command should resume from .agents/skillopt-work/<target-skill>/outputs/run-001/runtime_state.json when SkillOpt has written one."
  echo "Streaming output and writing log to .agents/skillopt-work/<target-skill>/outputs/run-001/training.log"
  echo "If output pauses, a rollout, judge, or reflection subprocess is probably running."
  python -u scripts/train.py \
    --config ../../skillopt-work/<target-skill>/configs/agent-skills.hybrid-codex-target.yaml \
    --split_dir ../../skillopt-work/<target-skill>/data \
    --skill_init ../../skillopt-work/<target-skill>/initial/skill-body.md \
    --out_root ../../skillopt-work/<target-skill>/outputs/run-001 \
    --num_epochs 4 \
    --batch_size 20 \
    --workers 4 \
    2>&1 | tee ../../skillopt-work/<target-skill>/outputs/run-001/training.log
  status=$?
  if [ "$status" -eq 0 ]; then
    echo "SkillOpt training finished successfully for <target-skill>."
    echo "Log: .agents/skillopt-work/<target-skill>/outputs/run-001/training.log"
    cd "$skillopt_repo_root" || return
    echo ""
    echo "Artifact verification:"
    node <skill-root>/scripts/verify-skillopt-run-artifacts.mjs --skill <target-skill> --run .agents/skillopt-work/<target-skill>/outputs/run-001 --terminal
    verify_status=$?
    if [ "$verify_status" -ne 0 ]; then
      echo "Artifact verification reported proof blockers; continuing to summary for diagnostics."
    fi
    echo ""
    echo "Result summary:"
    node <skill-root>/scripts/summarize-skillopt-run.mjs --skill <target-skill> --run .agents/skillopt-work/<target-skill>/outputs/run-001 --terminal
    echo ""
    echo "Adoption preview:"
    node <skill-root>/scripts/apply-skillopt-best.mjs --skill <target-skill> --best .agents/skillopt-work/<target-skill>/outputs/run-001/best_skill.md --dry-run --summary
    preview_status=$?
    if [ "$preview_status" -ne 0 ]; then
      echo "Adoption preview reported review blockers; training still completed."
    fi
  else
    echo "SkillOpt training failed for <target-skill> with exit code $status."
    echo "Log: .agents/skillopt-work/<target-skill>/outputs/run-001/training.log"
    cd "$skillopt_repo_root" || return
  fi
  return "$status"
}
run_skillopt_training
```

Manual result commands, if the user wants to rerun them later:

```bash
# Return to the repo root.
cd ../../..
# Verify expected run artifacts without reading raw transcripts.
node <skill-root>/scripts/verify-skillopt-run-artifacts.mjs \
  --skill <target-skill> \
  --run .agents/skillopt-work/<target-skill>/outputs/run-001 \
  --terminal
# Summarize the SkillOpt run without raw transcripts.
node <skill-root>/scripts/summarize-skillopt-run.mjs \
  --skill <target-skill> \
  --run .agents/skillopt-work/<target-skill>/outputs/run-001 \
  --terminal
# Preview best_skill.md adoption; dry-run only, no tracked edits.
node <skill-root>/scripts/apply-skillopt-best.mjs \
  --skill <target-skill> \
  --best .agents/skillopt-work/<target-skill>/outputs/run-001/best_skill.md \
  --dry-run \
  --summary

# Evaluate best_skill.md on all splits without another training run.
cd .agents/tools/SkillOpt
. .venv/bin/activate
python -u scripts/eval_only.py \
  --config ../../skillopt-work/<target-skill>/configs/agent-skills.hybrid-codex-target.yaml \
  --skill ../../skillopt-work/<target-skill>/outputs/run-001/best_skill.md \
  --split all \
  --split_dir ../../skillopt-work/<target-skill>/data \
  2>&1 | tee ../../skillopt-work/<target-skill>/outputs/run-001/eval-only.log
cd ../../..

# Optional local WebUI for .agents outputs.
cd .agents/tools/SkillOpt
. .venv/bin/activate
python -c "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('skillopt_webui') else 1)"
python -m skillopt_webui.app --host 127.0.0.1 --port 7860
```

## Adoption

Use `apply-skillopt-best.mjs --dry-run` before any write. Require `--approved` for tracked changes and a version bump for promoted public skills.
