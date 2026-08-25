# Agent Instructions

This repository contains public Agent Skills.

## Rules

- Follow the Agent Skills specification: https://agentskills.io/specification.
- Follow the Agent Plugins specification for repository-managed portable plugins: https://agent-plugins.org/specification.
- Keep client-native plugin packages that cannot share the portable root contract in separate generated adapter projections, as required by [ADR-0043](docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)).
- Do not commit `adapters/`. Generate OpenAI-native packages into disposable staging and archive them under `dist/openai/` with `npm run package:openai-plugin`; `npm run sync:openai-plugin` is a refuse-redirect.
- Follow [`docs/listing/openai/stark-ai-developer-first-publication.md`](docs/listing/openai/stark-ai-developer-first-publication.md) for OpenAI portal upload and first-publication observations.
- Bundled `agents/openai.yaml` is canonical skill-local metadata. Copy it unchanged into projections; do not adapter-overlay, rewrite, or generate it.
- Edit bundled skills only under `skills/<category>/<skill>/`. Do not edit `plugins/stark-ai-developer/` by hand, including copies under `plugins/stark-ai-developer/skills/`. After changing a bundled skill or `plugins/stark-ai-developer.source.json`, run `npm run sync:agent-plugin`. Confirm with `npm run validate:projections` when the portable contract changed.
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
- The [2026-07-31 Architecture Compass setup receipt](skill-evals/architecture-compass/runs/2026-07-31-setup-complete.md) is preserved as historical, non-normative evidence. It is stale for current proof; [ADR-0041](docs/adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](docs/adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](docs/adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)) records the current AC-ADR-049 adaptation, and accepted local ADRs remain authoritative.
- Follow `docs/specs.md` for spec persistence, ADR linkage, filename examples, and repo-facing documentation update rules.
- Do not copy copyrighted skill text from other repositories. Use them only as inspiration.
- Do not vendor already-published third-party skills into `skills/`; install them project-locally with `npx skills`.
- Do not stage files with `git add` unless the user explicitly asks.
- Do not unstage files or otherwise change Git index state unless the user explicitly asks.
- Follow [ADR-0029](docs/adrs/0029-keep-linked-worktrees-inside-the-repository.short.md) ([Long, canonical](docs/adrs/0029-keep-linked-worktrees-inside-the-repository.long.md) · [Guide](docs/adrs/0029-keep-linked-worktrees-inside-the-repository.guide.md)) for agent worktrees: any agent writing repository state uses one assigned worktree under `<root>/.worktrees/<repo>-worktrees/` as its working directory and write scope; the canonical checkout and sibling worktrees are read-only to that writer by default.
- Worktree enforcement state: repository instructions define the invariant; no shared writable root is configured because granting `<root>/.worktrees/<repo>-worktrees/` to every worker would permit cross-worktree writes. Launch each writing agent in its assigned worktree and enforce that workspace as the only repository write scope where the host supports it. Re-check this state only when host capabilities or repository policy change.
- Select checks from changed contracts, owning boundaries, and explicit requirements. Reuse only exact, current evidence. Run the local `npm run validate` aggregate for release intent or when a mandatory repository, ADR, user, or approved risk-plan gate requires it; do not run it merely because work is being finalized. Honor an explicit user exclusion while reporting any resulting evidence gap, as required by [ADR-0041](docs/adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](docs/adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](docs/adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)).
