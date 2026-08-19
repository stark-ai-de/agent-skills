# Design Principles

This repository treats skills as active context, not always-on policy.

## Format Standard

Follow the open Agent Skills specification at https://agentskills.io/specification. Keep skills portable across Codex CLI, Vercel skills CLI, Claude Code, Cursor, and other compatible agent environments where practical.

## Small and Composable

Each skill should do one workflow well. Prefer focused skills such as `pr-review`, `issue-triage`, or `codex-context-guard` over broad packs that try to own every maintenance task.

## Progressive Disclosure

Keep `SKILL.md` focused on routing, workflow, safety, and outputs. Move long rubrics, templates, examples, and troubleshooting guides into `references/` or `assets/`.

Agents should not be told to read every reference by default. The skill should explain which reference to open when a specific situation calls for it.

## Artifact-Oriented Workflows

Maintainer skills should produce concrete outputs: review reports, triage decisions, changelog drafts, handoff files, risk tables, docs gap lists, or recommended next actions.

Avoid final responses that only say a task is done.

For implementation spec persistence and ADR linkage, see [`docs/specs.md`](specs.md).

## Public Safety

Public skills must be inspectable and safe by default. Avoid destructive scripts, private data, hidden network actions, copied proprietary text, and broad automation that mutates live systems without explicit approval.

Do not vendor already-published third-party skills into this repository's public `skills/` catalog or `incubator/skills/`. Install those as project-local helper skills with `npx skills`; keep `.agents/skills/` and any local `skills-lock.json` ignored. The committed `.agents/plugins/marketplace.json` is repository plugin discovery, not a helper install. Only copy third-party material into this repo when redistribution is intentional and the license terms are clear.

## Promotion Boundary

Keep `skills/` promoted-only. Keep candidate public skills in `incubator/skills/` until they prove quality, activation fit, useful scope, and maintenance ROI. Keep eval prompts, rubrics, run summaries, and promotion proof in `skill-evals/` by default.

## Compatibility

Skills use the common Agent Skills structure: a folder with required `SKILL.md` frontmatter and optional `references/`, `scripts/`, `assets/`, and `agents/` directories.

## Decision Records

Use short ADRs in `docs/adrs/` for long-lived repo decisions such as format standards, publishing process, validation rules, license changes, or major category changes. Do not write ADRs for typo fixes, minor copy edits, or routine skill additions.

For implementation spec linkage to ADRs, see [`docs/specs.md`](specs.md).
