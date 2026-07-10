# Local Artifact Audit

Use this when prior SkillOpt work under `.agents/` might contain reusable setup improvements.

## Command

```bash
node incubator/skills/skill-maintenance/skillopt-setup/scripts/audit-skillopt-local-artifacts.mjs --skill <skill>
```

Add `--json` when another script or review needs machine-readable output.

## Promotion Rules

Promote only sanitized, reusable material:

- skill-owned helper scripts,
- concise operational references,
- adapter/config templates,
- eval cases,
- curated run summaries under `skill-evals/<skill>/runs/`.

Do not promote these raw local artifacts:

- `.agents/tools/SkillOpt`,
- `.agents/tools/SkillOpt/.git`,
- `.agents/tools/SkillOpt/.venv`,
- `.agents/skills`,
- `.agents/skillopt-work/*/data`,
- `.agents/skillopt-work/*/outputs`,
- `.agents/skillopt-work/_readiness`,
- raw histories, transcripts, auth diagnostics, temporary candidates, or local probe output.

## Required Loop

1. Run the audit before inspecting or moving local `.agents` work.
2. Treat `.agents/skills/<skill>` as an installed copy only; tracked skill source wins.
3. If adapter files differ from tracked templates or the target-specific manifest lacks identity/template freshness metadata, refresh setup before training.
4. Treat `.agents/skillopt-work/adapter-manifest.json` as a legacy compatibility copy when a current target-specific manifest is present; it is not enough by itself for training handoff.
5. Use run summaries only for adoption decisions. A negative held-out test hard-score delta blocks `best_skill.md` adoption.
6. Summary discovery inspects only `.agents/skillopt-work/<skill>/outputs/<run-directory>/summary.json`. It ignores unrelated output files, does not recurse through arbitrary trees, and reports `discovery.status: incomplete` instead of silently trusting a result when a bounded scan limit is reached.
7. Add validator and eval coverage for every promoted behavior.
8. Run repo validation before finalizing tracked changes.
