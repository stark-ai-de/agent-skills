<p align="center">
  <img src="docs/assets/stark-ai-de-agent-skills-logo.svg" alt="Agent Skills by stark-ai-de" width="760">
</p>

# Agent Skills

![skills.sh listing updating](https://img.shields.io/badge/skills.sh-listing_updating-lightgrey)
[![Release](https://img.shields.io/github/v/release/stark-ai-de/skills)](https://github.com/stark-ai-de/skills/releases)
[![Validate](https://github.com/stark-ai-de/skills/actions/workflows/validate.yml/badge.svg)](https://github.com/stark-ai-de/skills/actions/workflows/validate.yml)
[![License](https://img.shields.io/github/license/stark-ai-de/skills)](LICENSE)

Public Agent Skills for Codex operations, repo maintenance, skill maintenance, productivity, and engineering workflows.

Skills in this repository are reviewed before they are added to the public catalog. Draft and experimental skills live in the incubator until they have enough evaluation proof and maintenance clarity.

## Install

List public skills:

```bash
npx skills add stark-ai-de/skills --list
```

Install the first promoted public skill for Codex:

```bash
npx skills add stark-ai-de/skills --skill codex-spec-interviewer -g -a codex
```

Use it when a coding request is still fuzzy:

```text
Use $codex-spec-interviewer to turn this refactor idea into a Codex-ready implementation spec with acceptance criteria, validation commands, and an ADR gate result.
```

Latest release: [`v0.1.0`](https://github.com/stark-ai-de/skills/releases/tag/v0.1.0)

## Public Catalog

The public catalog lives under [`skills/`](skills/README.md). Candidate, experimental, personal, private, or third-party helper skills do not belong in this tree.

| Skill                                                                               | Use when                                                                                                                                | Proof                                                                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`codex-spec-interviewer`](skills/codex-operations/codex-spec-interviewer/SKILL.md) | A feature, bugfix, refactor, migration, repo-wide change, or architecture task needs a concrete Codex-ready spec before implementation. | [`skill-evals/codex-spec-interviewer/`](skill-evals/codex-spec-interviewer/README.md) |

## Repository Layout

- [`skills/`](skills/README.md) - promoted public skills installable through `npx skills`.
- [`incubator/skills/`](incubator/README.md) - candidate skills with `metadata.internal: true`; not public catalog entries.
- [`skill-evals/`](skill-evals/README.md) - maintainer proof for promotion decisions, kept outside runtime skill payloads.
- [`docs/adr/`](docs/adr/README.md) - short decision records for repo-level policy.
- `.agents/skills/` - ignored maintainer-local helper installs; not part of this catalog.

<details>
<summary>Incubator map</summary>

| Problem                                     | Candidate skills                                                                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent loses context                         | [`codex-context-guard`](incubator/skills/codex-operations/codex-context-guard/SKILL.md), [`handoff`](incubator/skills/productivity/handoff/SKILL.md)                                   |
| Repo maintenance is unclear                 | [`repo-health-audit`](incubator/skills/repo-maintenance/repo-health-audit/SKILL.md)                                                                                                    |
| Pull request review is too shallow          | [`pr-review`](incubator/skills/repo-maintenance/pr-review/SKILL.md)                                                                                                                    |
| Issues are messy                            | [`issue-triage`](incubator/skills/repo-maintenance/issue-triage/SKILL.md)                                                                                                              |
| Skill quality or installability is drifting | [`skill-repo-curator`](incubator/skills/skill-maintenance/skill-repo-curator/SKILL.md), [`skill-authoring-review`](incubator/skills/skill-maintenance/skill-authoring-review/SKILL.md) |
| Codex memory is stale or harmful            | [`codex-memory-curator`](incubator/skills/codex-operations/codex-memory-curator/SKILL.md)                                                                                              |

</details>

## Promotion Model

Promotion is a folder move from `incubator/skills/<category>/<skill>/` to `skills/<category>/<skill>/`.

Before promotion, a skill needs:

- evidence that it improves work quality,
- activation tests for when it should and should not trigger,
- a general or high-value use case,
- manageable maintenance cost,
- reviewable proof under `skill-evals/<skill>/`.

## Development

Install dependencies:

```bash
pnpm install
```

Common commands:

| Command                                 | Purpose                                                             |
| --------------------------------------- | ------------------------------------------------------------------- |
| `npm run list`                          | List promoted public skills.                                        |
| `npm run list:incubator`                | List incubator skills.                                              |
| `npm run validate`                      | Validate skills, ADRs, scripts, and repository contracts.           |
| `npm run smoke:install`                 | Test public install discovery from a clean copy without `.agents/`. |
| `npx skills@latest add ./skills --list` | Check local public skill discovery.                                 |
| `pnpm format:check`                     | Check formatting.                                                   |
| `pnpm lint`                             | Lint scripts.                                                       |
| `node scripts/validate-release.mjs`     | Validate release readiness from `package.json`.                     |
| `node scripts/print-release-notes.mjs`  | Print release notes from `CHANGELOG.md`.                            |

Scaffold a promoted skill only when promotion proof is ready:

```bash
npm run scaffold repo-maintenance/my-new-skill
```

Scaffold an incubator skill:

```bash
npm run scaffold:incubator engineering-workflows/my-candidate-skill
```

## Maintainer Docs

- [Domain glossary](CONTEXT.md)
- [Validation](docs/validation.md)
- [Publishing](docs/publishing.md)
- [Skill examples](docs/examples/README.md)
- [Out-of-scope boundaries](docs/out-of-scope/README.md)
- [Decision records](docs/adr/README.md)

## Relevant Sources

- [Agent Skills specification](https://agentskills.io/specification) - canonical `SKILL.md` format, frontmatter constraints, optional `scripts/`, `references/`, and `assets/`, progressive disclosure, and validation.
- [Agent Skills evaluation guide](https://agentskills.io/skill-creation/evaluating-skills) - upstream guidance for skill eval cases, with-skill versus baseline runs, assertions, grading evidence, timing, and benchmark summaries.
- [Agent Skills description optimization](https://agentskills.io/skill-creation/optimizing-descriptions) - upstream guidance for trigger eval queries, positive and negative cases, repeated runs, and train/validation splits.
- [Agent Skills client implementation guide](https://agentskills.io/client-implementation/adding-skills-support) - discovery, activation, `.agents/skills/` conventions, and progressive disclosure behavior across clients.
- [Vercel Agent Skills docs](https://vercel.com/docs/agent-resources/skills) - `npx skills` installation flow and public skill discovery.
- [Vercel skills CLI README](https://github.com/vercel-labs/skills/blob/main/README.md) - CLI source formats and `metadata.internal: true` behavior for hiding work-in-progress skills from normal discovery.
- [OpenAI agent evals guide](https://developers.openai.com/api/docs/guides/agent-evals) and [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) - broader guidance for traces, graders, datasets, repeatable eval runs, and continuous evaluation.
- [Anthropic evaluation guidance](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) - broader guidance for success criteria, task-specific evals, edge cases, and grading methods.

## Compatibility

This repo follows the open Agent Skills specification:

https://agentskills.io/specification

Each skill is a directory with a required `SKILL.md` file containing `name` and `description` frontmatter, plus optional `references/`, `scripts/`, and `assets/`.

Codex CLI is the primary runtime, but the skills are kept portable for Vercel skills CLI, Claude Code, Cursor, GitHub Copilot agent environments where compatible, and other agents that support the open Agent Skills format. Claude-specific plugin metadata is intentionally omitted until an ADR makes it a supported publishing surface.

## Safety

Skills are executable context. Review any skill before installing it into an agent runtime.

This repository avoids destructive scripts in v1. Helper scripts are read-only unless their own documentation explicitly says otherwise. Do not add secrets, tokens, customer data, private repo paths, or internal hostnames to skills, references, assets, tests, or examples.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for naming, frontmatter, safety, validation, and review rules. Every skill must keep `SKILL.md` concise and move long rubrics, examples, and templates into `references/` or `assets/`.

## License

Apache-2.0 for the skills and repository material published from this repo.
