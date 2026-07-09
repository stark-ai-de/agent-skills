---
name: skillopt-setup
description: Set up Microsoft SkillOpt for Agent Skills improvement. Use when installing SkillOpt, preparing per-skill train/val/test eval splits, configuring Codex CLI or provider-backed execution, running SkillOpt against SKILL.md bodies, reviewing best_skill.md, or importing optimized skill changes. Do not use for ordinary skill authoring or manual repo validation.
license: Apache-2.0
compatibility: Designed for local SkillOpt runs with provider-backed official-parity execution or exploratory Codex CLI execution. Prefers uv-managed Python setup; can use local Python 3.10+ by explicit choice. Requires Git, Node.js 22+, npm/pnpm, network access for setup, and either provider credentials or a logged-in Codex CLI depending on the selected mode.
metadata:
  author: stark-ai-de
  category: skill-maintenance
  internal: true
  version: "0.1.0"
---

# SkillOpt Setup

## Goal

Set up and operate a local SkillOpt workflow that improves one Agent Skill at a time while preserving frontmatter, validation, and public-proof boundaries.

## When to use

- Installing or checking Microsoft SkillOpt for this repo.
- Preparing SkillOpt train/val/test data from `skill-evals/`.
- Configuring provider-backed, hybrid Codex CLI, or exploratory all-Codex CLI execution.
- Running SkillOpt for a target `SKILL.md`.
- Reviewing, summarizing, or importing `best_skill.md`.
- Creating public run evidence without committing raw transcripts.

## When not to use

- Ordinary skill authoring or manual `SKILL.md` review.
- Trigger-description tuning only.
- Repo validation without SkillOpt.
- Directly implementing an optimized skill before review.

## Inputs to inspect

- Target skill path under `skills/` or `incubator/skills/`.
- `skill-evals/<skill>/README.md`, `cases/`, `fixtures/`, `expected/`, `rubric.md`, and `runs/`.
- Current `SKILL.md` frontmatter and body.
- `.gitignore` and `AGENTS.md` safety rules.
- Local `.agents/tools/SkillOpt` state, if present.
- Local `uv` availability and local Python 3.10+ compatibility.
- Local Codex CLI availability and login state if Codex mode is requested.

## Workflow

Guide the user through setup as a short wizard. Ask one decision at a time unless the user already supplied the answer; do not dump every command or option before the relevant step.

1. Wizard step: target. Identify exactly one target skill and whether it is incubator or promoted. If missing or ambiguous, ask which skill should be optimized.
2. Wizard step: existing setup. Immediately inspect `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt.commit`, and `.agents/skillopt-work`. If any exist, ask whether to remove the current local setup or reuse/update it before dry-run or production setup. Cleanup is global to the local SkillOpt setup and must not remove `.agents/skills/`.
3. If the user chooses cleanup, run `setup-skillopt-local.mjs --cleanup-only --approved` yourself before setup. Do not present cleanup as a copy-paste command.
4. Wizard step: setup goal. Explain the recommended branches:
  - easiest no-provider path: `codex-cli-all`, exploratory, uses Codex CLI login for rollouts, semantic judging, and adapter-managed reflection; keep slow update and meta skill disabled in this mode because those upstream epoch-boundary mechanisms call the provider-backed optimizer path,
  - best official-parity path: `hybrid-codex-target` or `native-provider`, provider-backed optimizer/reflection, requires credentials and model pins.
5. Wizard step: Python. Prefer `uv`. If `uv` is missing, ask whether to install `uv` or explicitly use compatible local Python 3.10+.
6. Wizard step: data quality. Run readiness or split preparation early enough to report positive, validation, and test counts. Official-parity proof needs at least 20 positive cases, 5 validation cases, and 5 test cases; otherwise classify the run as exploratory or blocked for proof.
7. Wizard step: best-practice configuration. For official-parity, require provider credential presence plus `SKILLOPT_OPTIMIZER_MODEL`, `SKILLOPT_TARGET_MODEL`, and judge model pins. For `codex-cli-all`, preserve exploratory defaults, require slow update/meta skill to stay disabled, and report which upstream provider-backed behavior is bypassed.
8. Wizard step: dry-run. Ask whether the user wants a dry-run first unless already answered. If yes, run setup without `--approved`, report the dry-run result only, and ask whether to continue. Do not show production setup commands or SkillOpt training commands after dry-run.
9. Wizard step: production setup. If the user skips dry-run or approves continuation, run production-grade setup with `--approved`, using `.agents/` as the persistent workspace and passing `--existing-setup-choice reuse` when reuse was chosen.
10. Prepare or update the ignored SkillOpt workspace, split JSON, local adapter, target manifest, and mode/profile config.
11. After successful production setup, recommend the paste-ready new-terminal SkillOpt command. It must stream logs, print explicit success/failure, run artifact verification, show a compact summary, and run `best_skill.md` dry-run adoption preview.
12. Include manual rerun commands with short descriptions for artifact verification, run summary, dry-run adoption preview, eval-only evaluation, and optional WebUI.
13. Offer current-session execution only as an explicit option: `Should I run SkillOpt training for <target-skill> in this agent session anyway?`
14. Inspect `best_skill.md`, diff it against the original skill body, validate adoption gates, ask before tracked writes, and save only curated public evidence under `skill-evals/<target>/runs/`.

## Safety rules

- Never print or persist secrets.
- Never copy, inspect, or commit Codex auth tokens.
- Never commit `.agents/` output.
- Never overwrite `SKILL.md` without explicit approval.
- Never install `uv`, create Python environments, or install Python packages without explicit setup approval.
- Preserve frontmatter unless the user explicitly requests a description or frontmatter optimization pass.
- For promoted skills, require a `metadata.version` bump before final validation.
- In Codex CLI mode, default to no live web search and no network access unless the eval case explicitly requires it.
- Treat SkillOpt-Sleep as a separate `v0.2.0` companion surface, not the default Agent Skills training workflow; do not harvest transcripts or configure sleep cycles unless the user explicitly asks for SkillOpt-Sleep.
- Treat readiness and dry-run as read-only: use `--no-codex-probe` there, then ask before running the Codex login probe because it writes ignored diagnostics under `.agents/skillopt-work/_readiness`.

## References

Read only when needed:

- `references/runbook.md`
- `references/credential-modes.md`
- `references/official-best-practices.md`
- `references/codex-cli-runner.md`
- `references/data-schema.md`
- `references/adapter-contract.md`
- `references/adoption-policy.md`
- `references/troubleshooting.md`

## Scripts

- `scripts/check-skillopt-readiness.mjs`
- `scripts/setup-skillopt-local.mjs`
- `scripts/probe-codex-cli.mjs`
- `scripts/prepare-skillopt-split.mjs`
- `scripts/prepare-local-skillopt-adapter.mjs`
- `scripts/summarize-skillopt-run.mjs`
- `scripts/verify-skillopt-run-artifacts.mjs`
- `scripts/apply-skillopt-best.mjs`

## Output format

Return:

1. Target skill and current maturity state
2. Startup mode note, selected SkillOpt execution mode, and run profile
3. Whether optimizer credentials are needed for that mode
4. Selected Python setup path: `uv`, `local`, or user choice needed
5. Setup readiness, training readiness, proof status, proof blockers, data-floor status, and model-pin gaps
6. Generated or planned local paths
7. Existing setup state and early cleanup choice, when present
8. Dry-run result or production-grade setup result
9. If this is only a dry-run: the next wizard question, with no production setup command and no SkillOpt training command
10. If production setup succeeded: recommended new-terminal SkillOpt training command, post-training commands, and optional current-session execution question
11. Validation result

## Completion criteria

- SkillOpt workspace is ready or the missing prerequisites are explicit.
- The run proof is classified as `ready`, `ready_with_gaps`, `blocked`, `partial`, or `exploratory`.
- Existing setup was reused by explicit choice, cleaned up by explicit choice before setup, or reported as absent.
- Data splits and config exist for the target skill.
- Codex CLI mode has passed a login probe if selected.
- Setup output tells the user exactly how to start SkillOpt training for the selected target skill in a new terminal, automatically prints the compact result summary and dry-run adoption preview after successful training, and provides manual rerun commands for summary, adoption preview, eval-only, and optional WebUI.
- Any training or eval run has a clear output path, artifact verification status, and summary.
- `best_skill.md` adoption is reviewable, reversible, and approved.
- Repository validation commands are listed or completed.

## Failure modes

- If SkillOpt cannot be installed, report the failing prerequisite and command.
- If Codex CLI mode is requested but `codex exec` fails, report the probe failure without printing auth material.
- If eval cases are insufficient, propose additional cases before training.
- If `best_skill.md` changes frontmatter or weakens safety, reject adoption.
- If run evidence contains sensitive data, do not persist it publicly.
