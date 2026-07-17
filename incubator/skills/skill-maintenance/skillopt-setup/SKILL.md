---
name: skillopt-setup
description: Set up Microsoft SkillOpt for Agent Skills improvement. Use when installing SkillOpt, preparing per-skill train/val/test eval splits, configuring Codex CLI or provider-backed execution, running SkillOpt against SKILL.md bodies, reviewing best_skill.md, or importing optimized skill changes. Do not use for ordinary skill authoring or manual repo validation.
license: Apache-2.0
compatibility: Designed for local SkillOpt runs with provider-backed official-parity execution or exploratory Codex CLI execution. Prefers uv-managed Python setup; can use local Python 3.10+ by explicit choice. Requires Git, Node.js 22+, npm/pnpm, network access for setup, and either provider credentials or a logged-in Codex CLI depending on the selected mode.
metadata:
  author: stark-ai-de
  category: skill-maintenance
  internal: true
  version: "0.1.1"
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
- Local `.agents/` artifact audit when mining prior setup work or troubleshooting stale workspaces.
- Local `uv` availability and local Python 3.10+ compatibility.
- Local Codex CLI availability and login state if Codex mode is requested.
- Visual assertion cases, render-capable requirements, and draw.io Desktop CLI availability when target evals need PNG/SVG artifacts.

## Workflow

Guide the user through setup as a short wizard. Ask one decision at a time unless the user already supplied the answer; do not dump every command or option before the relevant step.

1. Wizard step: target. Identify exactly one target skill and whether it is incubator or promoted. If missing or ambiguous, ask which skill should be optimized.
2. Wizard step: existing setup. Immediately inspect `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt.commit`, and `.agents/skillopt-work`. If any exist, ask whether to remove the current local setup or reuse/update it before dry-run or production setup. Cleanup is global to the local SkillOpt setup and must not remove `.agents/skills/`.
3. If the user chooses cleanup, run `setup-skillopt-local.mjs --cleanup-only --approved` yourself before setup. Do not present cleanup as a copy-paste command.
4. When the user asks to move prior `.agents/` learnings into the skill, run `audit-skillopt-local-artifacts.mjs` first. Promote only sanitized scripts, references, templates, eval cases, or curated summaries; never promote raw clones, installed skill copies, data splits, run outputs, transcripts, or readiness diagnostics.
5. Wizard step: setup goal. Explain the recommended branches:
  - easiest no-provider path: `codex-cli-all`, exploratory, uses Codex CLI login for rollouts, semantic judging, and adapter-managed reflection; keep slow update and meta skill disabled in this mode because those upstream epoch-boundary mechanisms call the provider-backed optimizer path,
  - best official-parity path: `hybrid-codex-target` or `native-provider`, provider-backed optimizer/reflection, requires credentials and model pins.
6. Wizard step: Python. Prefer `uv`. If `uv` is missing, ask whether to install `uv` or explicitly use compatible local Python 3.10+.
7. Wizard step: data quality. Run readiness or split preparation early enough to report positive, validation, and test counts. Official-parity proof needs at least 20 positive cases, 5 validation cases, and 5 test cases; otherwise classify the run as exploratory or blocked for proof.
8. Wizard step: execution and visual readiness. Require the bounded strict-config capability probe for every active Codex target, judge, or reflection role, including text-only cases. If any cases declare `visual_assertions`, also check `visualArtifactReadiness`, generated `tool_rollout_for_visual_assertions`, and `visual_eval_policy`. Visual Codex cases may use bounded file edits and shell commands only under the enforced read-isolated rollout permission profile, for copied helper scripts, draw.io XML, validation, and requested PNG/SVG exports; non-visual Codex rollouts remain text-only with no workspace read or write grant. If draw.io CLI is missing, use the generated `data-text-only` split and report that full visual proof still requires the renderer. Native-provider `auto` mode must also select `data-text-only` because provider chat targets cannot create local artifacts.
9. Wizard step: best-practice configuration. For official-parity, require provider credential presence plus `SKILLOPT_OPTIMIZER_MODEL`, `SKILLOPT_TARGET_MODEL`, and judge model pins. For `codex-cli-all`, preserve exploratory defaults, require slow update/meta skill to stay disabled, and report which upstream provider-backed behavior is bypassed.
10. Wizard step: dry-run. Ask whether the user wants a dry-run first unless already answered. If yes, run setup without `--approved`, report the dry-run result only, and ask whether to continue. Do not show production setup commands or SkillOpt training commands after dry-run.
11. Wizard step: production setup. If the user skips dry-run or approves continuation, run production-grade setup with `--approved`, using `.agents/` as the persistent workspace and passing `--existing-setup-choice reuse` when reuse was chosen.
12. Prepare or update the ignored SkillOpt workspace, split JSON, local adapter, target manifest, and mode/profile config.
13. When the user wants a guaranteed training-ready setup, use `--strict-training-ready`; block rather than hand off a training command if credentials, model pins, Codex probe, visual artifact readiness, adapter patches, or refreshed target manifest checks are missing.
14. After successful production setup, recommend the paste-ready new-terminal SkillOpt command. It must stream logs, print explicit success/failure, run artifact verification, show a compact summary, and run `best_skill.md` dry-run adoption preview.
15. Include manual rerun commands with short descriptions for artifact verification, run summary, dry-run adoption preview, eval-only evaluation, and optional WebUI.
16. Offer current-session execution only as an explicit option: `Should I run SkillOpt training for <target-skill> in this agent session anyway?`
17. Inspect `best_skill.md`, diff it against the original skill body, validate adoption gates, ask before tracked writes, and save only curated public evidence under `skill-evals/<target>/runs/`.

## Safety rules

- Never print or persist secrets.
- Never copy, inspect, or commit Codex auth tokens.
- Never commit `.agents/` output.
- Never move `.agents/` content without first classifying it with the local artifact audit.
- Never overwrite `SKILL.md` without explicit approval.
- Never install `uv`, create Python environments, or install Python packages without explicit setup approval.
- Preserve frontmatter unless the user explicitly requests a description or frontmatter optimization pass.
- For promoted skills, require a `metadata.version` bump before final validation.
- In Codex CLI mode, allow no live web search or network access. Every target, judge, and reflection launch must use a verified strict read-isolated permission profile and a minimal environment. Allow shell/file operations only inside the visual rollout workspace profile for `visual_assertions` cases; browser, hosted, install, network, inherited trainer secrets, and out-of-workspace reads remain disabled.
- Treat SkillOpt-Sleep as a separate `v0.2.0` companion surface, not the default Agent Skills training workflow; do not harvest transcripts or configure sleep cycles unless the user explicitly asks for SkillOpt-Sleep.
- Treat readiness and dry-run as read-only: use `--no-codex-probe` there, reuse existing successful probe diagnostics when present, and ask before running a new Codex login probe because it writes ignored diagnostics under `.agents/skillopt-work/_readiness`.

## References

Read only when needed:

- `references/runbook.md`
- `references/credential-modes.md`
- `references/official-best-practices.md`
- `references/codex-cli-runner.md`
- `references/local-openai-gateway.md`
- `references/local-artifact-audit.md`
- `references/data-schema.md`
- `references/adapter-contract.md`
- `references/adoption-policy.md`
- `references/troubleshooting.md`

## Scripts

- `scripts/check-skillopt-readiness.mjs`
- `scripts/audit-skillopt-local-artifacts.mjs`
- `scripts/setup-skillopt-local.mjs`
- `scripts/probe-codex-cli.mjs`
- `scripts/codex-local-openai-chat-gateway.mjs`
- `scripts/probe-openai-compatible-endpoint.mjs`
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
6. Visual artifact readiness and render-tool blockers when evals include `visual_assertions`
7. Generated or planned local paths
8. Existing setup state, local artifact audit result, and early cleanup choice, when present
9. Dry-run result or production-grade setup result
10. If this is only a dry-run: the next wizard question, with no production setup command and no SkillOpt training command
11. If production setup succeeded: recommended new-terminal SkillOpt training command, post-training commands, and optional current-session execution question
12. Validation result

## Completion criteria

- SkillOpt workspace is ready or the missing prerequisites are explicit.
- The run proof is classified as `ready`, `ready_with_gaps`, `blocked`, `partial`, or `exploratory`.
- Existing setup was reused by explicit choice, cleaned up by explicit choice before setup, or reported as absent.
- Data splits and config exist for the target skill.
- Codex CLI mode has passed a login probe if selected.
- Visual assertion cases either have an artifact-capable Codex target, render-capable readiness (`drawio` or `diagrams.net` on PATH), a supported strict permission profile, and a visual smoke path, or the active run uses the generated `data-text-only` split with `visualArtifactReadiness.status=text_only_ready`. Every active Codex target, judge, or reflection role still requires strict isolation on a text-only split.
- Setup output tells the user exactly how to start SkillOpt training for the selected target skill in a new terminal, automatically prints the compact result summary and dry-run adoption preview after successful training, and provides manual rerun commands for summary, adoption preview, eval-only, and optional WebUI.
- Any training or eval run has a clear output path, artifact verification status, and summary.
- `best_skill.md` adoption is reviewable, reversible, and approved.
- Repository validation commands are listed or completed.

## Failure modes

- If SkillOpt cannot be installed, report the failing prerequisite and command.
- If Codex CLI mode is requested but `codex exec` fails, report the probe failure without printing auth material.
- If eval cases are insufficient, propose additional cases before training.
- If visual assertion cases exist but draw.io CLI is missing, auto-select `visual_eval_policy: text-only` when possible, report `visualArtifactReadiness.status=text_only_ready`, and do not scale full visual loops until the CLI is installed or exposed. Native-provider `auto` mode also selects text-only even when draw.io exists. If the user forces `full`, report `missing_drawio_cli` for a Codex target or `unsupported_visual_target_backend` for a provider target.
- If the installed Codex CLI rejects the strict permission profile, fail closed for every active Codex target, judge, and reflection role. A text-only split bypasses only draw.io readiness, not read isolation; use a compatible Codex version or a supported provider-only text path.
- If `best_skill.md` changes frontmatter or weakens safety, reject adoption.
- If run evidence contains sensitive data, do not persist it publicly.
