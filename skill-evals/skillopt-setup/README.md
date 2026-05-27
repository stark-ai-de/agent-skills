# skillopt-setup Eval Proof

This folder contains the initial incubator proof for `skillopt-setup`.

## Purpose

The skill helps agents set up Microsoft SkillOpt locally for Agent Skills optimization without committing optimizer clones, raw traces, credentials, or temporary candidates.

## Eval Set

Cases cover setup, data conversion, credential handling, Codex CLI probing, config generation, adoption, summarization, and negative trigger behavior:

- `cases/setup-empty-local-workspace.md`
- `cases/existing-setup-reset-choice.md`
- `cases/setup-dry-run-continuation.md`
- `cases/target-selection-before-training.md`
- `cases/uv-python-setup-preference.md`
- `cases/prepare-split-from-markdown-evals.md`
- `cases/reject-secret-leaking-env.md`
- `cases/reject-codex-auth-token-leak.md`
- `cases/preserve-frontmatter-on-import.md`
- `cases/summarize-run-without-transcripts.md`
- `cases/codex-cli-login-probe.md`
- `cases/hybrid-codex-target-config.md`
- `cases/codex-cli-all-mode-reflection.md`
- `cases/local-adapter-config-and-registry.md`
- `cases/official-parity-profile.md`
- `cases/official-parity-proof-blocked.md`
- `cases/verify-run-artifacts.md`
- `cases/codex-spec-benchmark-hardening.md`
- `cases/eval-only-and-webui-handoff.md`
- `cases/negative-ordinary-skill-review.md`

Use `rubric.md` to grade outputs. `runs/` stores curated run summaries only.
