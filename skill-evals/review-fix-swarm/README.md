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

## Specification and deterministic verification

- [Accepted feature specification](../../docs/specs/review-fix-swarm-spec.md).
- `pnpm run validate:review-fix-swarm` executes the offline fixture regressions in the repository aggregate.
- Live CODEX pilot, HYBRID comparison and Cloud qualification are separate evidence stages. Never promote a fixture selftest or a mechanical grade into an agent-quality claim.

## Local CODEX evidence

- [2026-10-16 pilot and remediation receipt](runs/2026-10-16-codex-pilot.md): five behavioral/semantic case passes; workflow qualification remains PARTIAL with index and runtime evidence gaps.
