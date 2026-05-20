<p align="center">
  <img src="docs/assets/stark-ai-de-agent-skills-logo.svg" alt="Agent Skills by stark-ai-de" width="760">
</p>

# Agent Skills

[![skills.sh listing pending](https://img.shields.io/badge/skills.sh-listing_pending-lightgrey)](https://skills.sh/)

Public Agent Skills for repo maintenance, Codex operations, skill maintenance, productivity, and repeatable engineering workflows.

This catalog exists for the moments when a coding agent has enough ability to act, but not enough local process to act well. Skills make common workflows explicit: preserve context, review PRs, triage issues, debug failures, write ADRs, slice plans, and keep a public skills catalog installable without loading one giant always-on prompt.

## When Agents Fail, Use These Skills

| Problem                                  | Skills                                                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent loses context                      | [`codex-context-guard`](skills/codex-operations/codex-context-guard/SKILL.md), [`handoff`](skills/productivity/handoff/SKILL.md)                                   |
| Repo maintenance is unclear              | [`repo-health-audit`](skills/repo-maintenance/repo-health-audit/SKILL.md)                                                                                          |
| Pull request review is too shallow       | [`pr-review`](skills/repo-maintenance/pr-review/SKILL.md)                                                                                                          |
| Issues are messy                         | [`issue-triage`](skills/repo-maintenance/issue-triage/SKILL.md)                                                                                                    |
| Public skill quality is drifting         | [`skill-repo-curator`](skills/skill-maintenance/skill-repo-curator/SKILL.md), [`skill-authoring-review`](skills/skill-maintenance/skill-authoring-review/SKILL.md) |
| Codex memory is stale or harmful         | [`codex-memory-curator`](skills/codex-operations/codex-memory-curator/SKILL.md)                                                                                    |
| A bug needs evidence before a fix        | [`debugging-diagnosis`](skills/engineering-workflows/debugging-diagnosis/SKILL.md)                                                                                 |
| A broad plan needs implementation slices | [`issue-plan-slicer`](skills/engineering-workflows/issue-plan-slicer/SKILL.md)                                                                                     |

## Quickstart

List public skills from GitHub:

```bash
npx skills add stark-ai-de/agent-skills --list
```

Install all public skills globally for Codex:

```bash
npx skills add stark-ai-de/agent-skills -g -a codex
```

Install one public skill:

```bash
npx skills add stark-ai-de/agent-skills --skill repo-health-audit -g -a codex
```

Restore this repository's project-local helper skills from `skills-lock.json`:

```bash
npx skills@latest experimental_install -y
```

Bootstrap a downstream repository after installing the catalog:

```text
Use $agent-context-bootstrap to set up this repo's AGENTS.md, docs/agents, validation commands, issue tracker notes, and skill routing.
```

## Catalog

The public catalog lives under `skills/` and is stable-only. Draft, personal, private, or third-party helper skills do not belong in this tree.

- [Codex operations](skills/codex-operations/README.md)
- [Engineering workflows](skills/engineering-workflows/README.md)
- [Productivity](skills/productivity/README.md)
- [Repo maintenance](skills/repo-maintenance/README.md)
- [Skill maintenance](skills/skill-maintenance/README.md)

### Skill Index

**Codex operations:** [`codegraph-ast-grep`](skills/codex-operations/codegraph-ast-grep/SKILL.md), [`codex-context-guard`](skills/codex-operations/codex-context-guard/SKILL.md), [`codex-memory-curator`](skills/codex-operations/codex-memory-curator/SKILL.md)

**Engineering workflows:** [`debugging-diagnosis`](skills/engineering-workflows/debugging-diagnosis/SKILL.md), [`issue-plan-slicer`](skills/engineering-workflows/issue-plan-slicer/SKILL.md), [`prd-writer`](skills/engineering-workflows/prd-writer/SKILL.md), [`prototype-spike`](skills/engineering-workflows/prototype-spike/SKILL.md), [`repo-map-zoom-out`](skills/engineering-workflows/repo-map-zoom-out/SKILL.md), [`test-first-implementation`](skills/engineering-workflows/test-first-implementation/SKILL.md)

**Productivity:** [`grill-plan`](skills/productivity/grill-plan/SKILL.md), [`handoff`](skills/productivity/handoff/SKILL.md)

**Repo maintenance:** [`adr-writer`](skills/repo-maintenance/adr-writer/SKILL.md), [`agent-context-bootstrap`](skills/repo-maintenance/agent-context-bootstrap/SKILL.md), [`ci-debugger`](skills/repo-maintenance/ci-debugger/SKILL.md), [`dependency-update-review`](skills/repo-maintenance/dependency-update-review/SKILL.md), [`docs-audit`](skills/repo-maintenance/docs-audit/SKILL.md), [`issue-triage`](skills/repo-maintenance/issue-triage/SKILL.md), [`pr-review`](skills/repo-maintenance/pr-review/SKILL.md), [`release-manager`](skills/repo-maintenance/release-manager/SKILL.md), [`repo-health-audit`](skills/repo-maintenance/repo-health-audit/SKILL.md), [`security-baseline-review`](skills/repo-maintenance/security-baseline-review/SKILL.md)

**Skill maintenance:** [`skill-authoring-review`](skills/skill-maintenance/skill-authoring-review/SKILL.md), [`skill-installation-support`](skills/skill-maintenance/skill-installation-support/SKILL.md), [`skill-repo-curator`](skills/skill-maintenance/skill-repo-curator/SKILL.md)

## Development

List local skills:

```bash
npm run list
```

Validate the repository:

```bash
npm run validate
```

Run a clean public install smoke test:

```bash
npm run smoke:install
```

Check local public skill discovery:

```bash
npx skills@latest add ./skills --list
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

### Project-Local Helper Skills

This repo uses a few published skills while maintaining the catalog. They are installed with `npx skills` into `.agents/skills/`, which is ignored so those upstream skills are not republished from this repository.

Restore helpers with the lockfile command:

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

## Maintainer Docs

- [Domain glossary](CONTEXT.md)
- [Validation](docs/validation.md)
- [Publishing](docs/publishing.md)
- [Skill examples](docs/examples/README.md)
- [Out-of-scope boundaries](docs/out-of-scope/README.md)
- [Decision records](docs/adr/README.md)

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

MIT for the skills and repository material published from this repo. Project-local helper skills installed under `.agents/skills/` keep their upstream licenses and are not part of this published catalog.
