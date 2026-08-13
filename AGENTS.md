# Agent Instructions

This repository contains public Agent Skills.

## Rules

- Follow the Agent Skills specification: https://agentskills.io/specification.
- Every skill must have `SKILL.md` with valid `name` and `description`.
- Skill folder names must match frontmatter names.
- Do not include secrets, tokens, customer data, private repo paths, or internal hostnames.
- Keep `SKILL.md` files concise and operational.
- Move long examples, rubrics, and templates into `references/` or `assets/`.
- Prefer read-only scripts. Any script that modifies files must be clearly documented.
- Document repo-level decisions in `docs/adrs/`.
- Store every repository ADR as linked `.short.md`, `.long.md`, and `.guide.md` files. Long is canonical; Short is a faithful abstraction; Guide is non-normative.
- Keep one decision per ADR and do not impose numeric word, paragraph, or section limits.
- Keep accepted ADR IDs, filename stems, and decision text stable; change architecture through a reciprocal successor ADR, not an in-place decision rewrite.
- Treat Accepted repository ADRs as binding. If a user requests a conflicting change, name the conflict, warn visibly, and stop the affected implementation until an adaptation or successor decision is accepted.
- Stable public skills with multiple material workflows must expose their complete finite options. Select, explain, and proceed when task intent and existing authority are clear; ask on bare or materially ambiguous invocation, and never infer mutation beyond the user's requested outcome and scope, as required by ADR-0038.
- The [2026-07-31 Architecture Compass setup receipt](skill-evals/architecture-compass/runs/2026-07-31-setup-complete.md) is preserved as historical, non-normative evidence. It is stale for current proof; [ADR-0046](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.short.md) ([Long, canonical](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.guide.md)) governs hosted content-addressed validation and trusted aggregate proof, while [ADR-0047](docs/adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) ([Long, canonical](docs/adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · [Guide](docs/adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md)) governs Architecture Compass fixture execution.
- Follow `docs/specs.md` for spec persistence, ADR linkage, filename examples, and repo-facing documentation update rules.
- Do not copy copyrighted skill text from other repositories. Use them only as inspiration.
- Do not vendor already-published third-party skills into `skills/`; install them project-locally with `npx skills`.
- Do not stage files with `git add` unless the user explicitly asks.
- Do not unstage files or otherwise change Git index state unless the user explicitly asks.
- Create linked Git worktrees only under `<repo>/.worktrees/<name>`.
- Select local checks from changed contracts, owning boundaries, and explicit requirements. Reuse only exact verified task results under ADR-0046; ordinary local check evidence remains current-task evidence only. Run the local `npm run validate` aggregate for release intent or when a mandatory repository, ADR, user, or approved risk-plan gate requires it; do not run it merely because work is being finalized. Honor an explicit user exclusion while reporting any resulting evidence gap. Hosted `Validate` stays unfiltered with one stable required `validate` aggregator: pull requests select the fail-closed union of compatible base and candidate plans, while every `main` push and manual dispatch is logically full. Only the current successful full protected-main aggregate may authorize reusable release proof or a Pages deployment, as required by [ADR-0046](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.short.md) ([Long, canonical](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.guide.md)).
