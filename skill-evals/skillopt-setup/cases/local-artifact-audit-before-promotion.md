# Local Artifact Audit Before Promotion

## Should Trigger

Yes.

## Prompt

We have a lot of SkillOpt scripts, run outputs, generated configs, and learnings under `.agents/`. Evaluate which parts should move into the `skillopt-setup` skill and adjust the skill so the next setup is fully working. Keep looping until evaluation and implementation are green.

## Deterministic Assertions

- runs or explicitly uses `audit-skillopt-local-artifacts.mjs` before moving `.agents` content
- classifies `.agents/tools/SkillOpt`, `.agents/tools/SkillOpt/.venv`, `.agents/skills`, raw data splits, raw run outputs, transcripts, and readiness diagnostics as not commit-ready
- promotes only sanitized scripts, references, templates, eval cases, or curated run summaries
- treats an installed `.agents/skills/skillopt-setup` copy as comparison-only, not source of truth
- refreshes or blocks stale adapter manifests and template mismatches before training handoff
- adds validation or eval coverage for every promoted setup behavior
- runs `npm run validate` before finalizing

## Visual Assertions

- None.
