# Review-Fix Swarm evaluation (candidate; not released)

This folder defines how to test the incubator [review-fix-swarm](../../incubator/skills/engineering-workflows/review-fix-swarm/SKILL.md). **No live comparative quality, runtime or cost results are claimed here.**

- [Acceptance cases](cases.md): concrete positive, negative and failure cases.
- [Reusable test prompt](../../incubator/skills/engineering-workflows/review-fix-swarm/references/test-prompt.md).
- [A/B measurement protocol](../../incubator/skills/engineering-workflows/review-fix-swarm/references/benchmark.md).

Promotion needs fresh task contexts, immutable matched starting snapshots, actual agent/command receipts, independent code-quality adjudication, and truthful missing-cost reporting. Document any protocol deviations; do not pass off a working orchestration smoke test as proof of improved code quality.

## Cloud pilot resources

- [Executable synthetic fixture kit](fixtures.md) — five built-in red/green cases and a mechanical grader; model-free `selftest` is not evidence of LLM quality.
- [Cloud environment setup](../../incubator/skills/engineering-workflows/review-fix-swarm/references/cloud-environment.md) — create/publish the cloud workspace and validate credentials.
- [Autonomous Cloud Master handover](../../incubator/skills/engineering-workflows/review-fix-swarm/references/cloud-master-handover.md) — copy into a Codex Cloud task to run actual swarms and refine prompts.
