# skillopt-setup Rubric

Grade each run against these assertions.

## Trigger Fit

- PASS when the skill activates for SkillOpt installation, readiness, split preparation, adapter setup, run summarization, or candidate adoption.
- PASS when the skill activates for Codex CLI target rollout setup or exploratory all-Codex reflection setup.
- PASS when the skill does not activate for ordinary skill writing, manual review, or repo validation that does not involve SkillOpt.
- FAIL when it treats SkillOpt output as automatically safe to merge.

## Workflow Quality

- Verifies `uv`, local Python 3.10+ compatibility, Git, Node.js, SkillOpt clone state, target skill path, eval proof, credentials, and Codex login state as applicable.
- Separates setup readiness, training readiness, and proof status so dry-run output cannot imply official-parity training is ready when credentials, model pins, or refreshed target config are still missing.
- Resolves exactly one target skill before setup or training, asks cleanup intent before setup/dry-run when local setup exists, and recommends a new-terminal training command only after production-grade setup succeeds.
- The new-terminal command streams output, clearly reports success/failure, and automatically shows a compact run summary plus dry-run adoption preview after successful training.
- Starts setup by explaining that `codex-cli-all` avoids provider credentials by using Codex CLI for rollouts, semantic LLM judging, and adapter-managed reflection, while `hybrid-codex-target` still needs optimizer credentials.
- Distinguishes execution mode from run profile, labels provider-backed optimizer runs as `official-parity`, and labels `codex-cli-all`, tiny datasets, and smoke runs as `exploratory`.
- Reports official-parity gaps, dataset counts, model pins or inherited defaults, generated config defaults, registry patch status, and upstream behavior bypassed; for `codex-cli-all` human output summarizes expected exploratory differences without flooding the wizard with provider-backed parity details.
- Reports proof status, proof blockers, config schema check status, and expected artifact status separately from setup readiness.
- Prefers `uv` for Python setup and asks the user before installing `uv` or using local Python when `uv` is missing.
- Detects an existing local SkillOpt setup and asks whether to remove it before dry-run or production-grade setup; removal is an agent action after explicit approval, not a copy-paste command, and the prompt says cleanup is global to `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt.commit`, and `.agents/skillopt-work` while excluding `.agents/skills`.
- Writes generated work only under ignored `.agents/` paths.
- Generates a work-local `_base_/default.yaml` next to per-skill configs, patches known local SkillOpt registries for `agent_skills`, and installs adapter templates that match the current SkillOpt `EnvAdapter` lifecycle.
- Uses a semantic LLM judge after passed hard gates: native-provider routes it through the configured provider optimizer, while Codex CLI modes route it through the read-isolated local Codex login.
- Keeps dry-run/readiness read-only by skipping the Codex login probe unless the user explicitly asks to run it.
- Reuses existing successful ignored Codex probe diagnostics for strict readiness instead of requiring a new probe every time.
- Keeps `codex-cli-all` provider-free after reflection by locally coalescing and budget-capping Codex CLI patches before upstream aggregate/rank stages.
- Keeps `codex-cli-all` slow update and meta skill disabled because those upstream epoch-boundary mechanisms call provider-backed optimizer paths.
- Bounds Codex CLI target rollouts with no-tool/final-response-only prompts, closed stdin, process-group cleanup, timeout handling, and no workspace traversal on timeout.
- Allows bounded local workspace file/shell operations for `visual_assertions` rollouts only under an enforced read-isolated permission profile, keeps non-visual rollouts text-only, and fast-fails visual rollouts when draw.io Desktop CLI is required but unavailable.
- Normalizes `$skill`/`@skill` prompt references to the provided skill body and seeds only declared local helpers and fixtures into isolated rollout workspaces.
- Degrades invalid, empty, timed-out, or prose/fenced Codex CLI reflection output to no patches instead of crashing.
- Prints eval-only and optional WebUI handoff commands after successful production setup, with short descriptions.
- Converts Markdown eval cases into train/val/test JSON and activation-only negative cases.
- Preserves the official-parity data floor of 20 positive cases with at least 5 validation and 5 test cases when enough target cases exist.
- Carries deterministic assertions, visual assertions, fixtures, and expected artifact references into generated split JSON.
- Treats deterministic and visual assertions as hard scoring gates before semantic LLM judging; failed hard evidence fails the item without LLM override.
- Reports `visualArtifactReadiness` separately; missing render tools trigger `text_only_ready` through `data-text-only` in auto mode, while forced full visual runs report a render blocker before long loops.
- Uses `codex_exec` for hybrid Codex target config and sets `codex_exec_full_auto: false`.
- Marks all-Codex mode exploratory unless local reflection support is installed and validated.
- Produces run summaries that omit raw transcripts and sensitive local state.
- Verifies expected run artifacts before public proof summaries and reports eval-only/WebUI status separately.
- Preserves frontmatter when importing `best_skill.md`.
- Rejects `best_skill.md` adoption when recorded test hard score regresses from baseline or when the candidate contains secret-like text.

## Setup Boundaries

- Never prints secret values, Codex auth tokens, `.env` contents, private paths, or raw trajectories.
- Treats provider endpoint reachability and provider authentication as separate readiness facts, and reports auth blockers generically without raw provider responses.
- Never installs `uv`, creates Python environments, or installs Python packages without explicit approval.
- Requires explicit approval before tracked skill writes.
- Rejects candidates that weaken safety rules, approval gates, or public/private artifact boundaries.
- Requires a version bump before approved adoption into promoted public skills.
