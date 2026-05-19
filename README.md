<p align="center">
  <img src="stark-ai-de-agent-skills-logo.png" alt="Agent Skills by stark-ai-de" width="760">
</p>

# Agent Skills

Reusable Agent Skills for Codex workflows, repository maintenance, and engineering automation.

This repository is a practical maintainer toolbox. It is for people who want coding agents to review repositories, triage issues, prepare releases, preserve handoffs, write ADRs, and keep skill repositories healthy without loading a giant always-on prompt.

## Install

List available skills:

```bash
npx skills add stark-ai-de/agent-skills --list
```

Install all skills globally for Codex:

```bash
npx skills add stark-ai-de/agent-skills -g -a codex
```

Install one skill:

```bash
npx skills add stark-ai-de/agent-skills --skill repo-health-audit -g -a codex
```

Update installed skills:

```bash
npx skills update -g
```

Install from a local checkout:

```bash
npx skills@latest add ./skills --list
npx skills@latest add ./skills --skill repo-health-audit -g -a codex
```

## Skills

| Skill                        | Category          | Use when                                                    |
| ---------------------------- | ----------------- | ----------------------------------------------------------- |
| `codex-context-guard`        | Codex operations  | Long Codex sessions risk context-window exhaustion          |
| `codex-memory-curator`       | Codex operations  | Codex memories may be stale, broad, duplicated, or harmful  |
| `agent-context-bootstrap`    | Repo maintenance  | A repository needs repo-local agent instructions and docs   |
| `adr-writer`                 | Repo maintenance  | A repo-level decision needs a short ADR                     |
| `repo-health-audit`          | Repo maintenance  | You want a full repository maintenance audit                |
| `issue-triage`               | Repo maintenance  | You need to triage issues or label an inbox                 |
| `pr-review`                  | Repo maintenance  | You need a structured PR review                             |
| `release-manager`            | Repo maintenance  | You are preparing a release                                 |
| `dependency-update-review`   | Repo maintenance  | You need dependency or lockfile changes reviewed            |
| `ci-debugger`                | Repo maintenance  | CI or build logs need root-cause analysis                   |
| `docs-audit`                 | Repo maintenance  | Docs, README, onboarding, or examples need review           |
| `security-baseline-review`   | Repo maintenance  | Public repo security hygiene needs review                   |
| `skill-authoring-review`     | Skill maintenance | You are creating or reviewing a skill                       |
| `skill-repo-curator`         | Skill maintenance | This skills repo needs catalog, release, or validation work |
| `skill-installation-support` | Skill maintenance | Users need help with `npx skills` installation              |
| `handoff`                    | Productivity      | A compact handoff is needed for another agent or thread     |
| `grill-plan`                 | Productivity      | A plan needs pressure-testing before implementation         |

## Development

List local skills:

```bash
npm run list
```

Validate the repository:

```bash
npm run validate
```

Optional formatting and linting use Oxc tooling:

```bash
pnpm install
pnpm format:check
pnpm lint
```

Scaffold a new skill:

```bash
npm run scaffold repo-maintenance/my-new-skill
```

The scaffold command creates files. Review generated content before committing.

### Project-local helper skills

This repo uses a few published skills while maintaining the catalog. They are
installed with `npx skills` into `.agents/skills/`, which is ignored so those
upstream skills are not republished from this repository.

Restore the helper skills from `skills-lock.json`:

```bash
npx skills@latest experimental_install -y
```

Current project-local helpers:

- `agent-browser`
- `grill-me`
- `improve-codebase-architecture`
- `shadcn`
- `vercel-composition-patterns`
- `vercel-react-best-practices`

## Compatibility

This repo follows the open Agent Skills specification:

https://agentskills.io/specification

Each skill is a directory with a required `SKILL.md` file containing `name` and `description` frontmatter, plus optional `references/`, `scripts/`, and `assets/`.

Codex CLI is the primary runtime, but the skills are kept portable for Vercel skills CLI, Claude Code, Cursor, GitHub Copilot agent environments where compatible, and other agents that support the open Agent Skills format.

## Decision Records

Repo-level decisions are documented in `docs/adr/`.

ADRs are intentionally short. The hard limit is 250 words.

## Safety

Skills are executable context. Review any skill before installing it into an agent runtime.

This repository avoids destructive scripts in v1. Helper scripts are read-only unless their own documentation explicitly says otherwise. Do not add secrets, tokens, customer data, private repo paths, or internal hostnames to skills, references, assets, tests, or examples.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for naming, frontmatter, safety, validation, and review rules. Every skill must keep `SKILL.md` concise and move long rubrics, examples, and templates into `references/` or `assets/`.

## License

MIT for the skills and repository material published from this repo. Project-local helper skills installed under `.agents/skills/` keep their upstream licenses and are not part of this published catalog.
