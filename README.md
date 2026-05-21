<p align="center">
  <img src="docs/assets/stark-ai-de-agent-skills-logo.svg" alt="Agent Skills by stark-ai-de" width="760">
</p>

# Agent Skills

[![skills.sh listing pending](https://img.shields.io/badge/skills.sh-listing_pending-lightgrey)](https://skills.sh/)

Agent Skills for repo maintenance, Codex operations, skill maintenance, productivity, and engineering workflows. The public catalog is promoted-only; candidates start in the incubator until they have proof of quality, utility, and maintenance fit.

This catalog exists for the moments when a coding agent has enough ability to act, but not enough local process to act well. Skills make common workflows explicit: preserve context, review PRs, triage issues, debug failures, write ADRs, slice plans, and keep a public skills catalog installable without loading one giant always-on prompt.

## Incubator Map

| Problem                                     | Candidate skills                                                                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent loses context                         | [`codex-context-guard`](incubator/skills/codex-operations/codex-context-guard/SKILL.md), [`handoff`](incubator/skills/productivity/handoff/SKILL.md)                                   |
| Repo maintenance is unclear                 | [`repo-health-audit`](incubator/skills/repo-maintenance/repo-health-audit/SKILL.md)                                                                                                    |
| Pull request review is too shallow          | [`pr-review`](incubator/skills/repo-maintenance/pr-review/SKILL.md)                                                                                                                    |
| Issues are messy                            | [`issue-triage`](incubator/skills/repo-maintenance/issue-triage/SKILL.md)                                                                                                              |
| Skill quality or installability is drifting | [`skill-repo-curator`](incubator/skills/skill-maintenance/skill-repo-curator/SKILL.md), [`skill-authoring-review`](incubator/skills/skill-maintenance/skill-authoring-review/SKILL.md) |
| Codex memory is stale or harmful            | [`codex-memory-curator`](incubator/skills/codex-operations/codex-memory-curator/SKILL.md)                                                                                              |

## Quickstart

List public skills from GitHub:

```bash
npx skills add stark-ai-de/agent-skills --list
```

Install the first promoted public skill:

```bash
npx skills add stark-ai-de/agent-skills --skill codex-spec-interviewer -g -a codex
```

Use it in a downstream repository when a request is still fuzzy:

```text
Use $codex-spec-interviewer to turn this refactor idea into a Codex-ready implementation spec with acceptance criteria, validation commands, and an ADR gate result.
```

## Catalog

The public catalog lives under [`skills/`](skills/README.md) and is promoted-only. Candidate, experimental, personal, private, or third-party helper skills do not belong in this tree.

- [Codex operations](skills/codex-operations/README.md)

### Skill Index

**Codex operations:** [`codex-spec-interviewer`](skills/codex-operations/codex-spec-interviewer/SKILL.md)

## Incubator and Promotion

Candidate skills live under [`incubator/skills/`](incubator/README.md). They use the same `SKILL.md` structure and validation rules, but they are not part of the public catalog and should not be listed, promoted, or released through normal `npx skills` discovery.

Incubator categories:

- [Codex operations](incubator/skills/codex-operations/README.md)
- [Engineering workflows](incubator/skills/engineering-workflows/README.md)
- [Productivity](incubator/skills/productivity/README.md)
- [Repo maintenance](incubator/skills/repo-maintenance/README.md)
- [Skill maintenance](incubator/skills/skill-maintenance/README.md)

Promotion is a folder move from `incubator/skills/<category>/<skill>/` to `skills/<category>/<skill>/` after the skill proves quality, activation fit, broad or high-value use, and acceptable maintenance cost. Maintainer proof belongs in [`skill-evals/`](skill-evals/README.md), not in the runtime skill payload by default.

## Development

List public skills:

```bash
npm run list
```

List incubator skills:

```bash
npm run list:incubator
```

Validate public and incubator skills:

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

Check release readiness without tagging:

```bash
node scripts/validate-release.mjs --version 0.1.0
node scripts/print-release-notes.mjs --version 0.1.0
```

Scaffold a promoted public skill only when promotion proof is ready:

```bash
npm run scaffold repo-maintenance/my-new-skill
```

Scaffold an incubator skill:

```bash
npm run scaffold:incubator engineering-workflows/my-candidate-skill
```

The scaffold command creates files. Review generated content before committing.

### Project-Local Helper Skills

Maintainers may install published or private helper skills into `.agents/skills/` while working on this catalog. The whole `.agents/` tree and `skills-lock.json` are ignored so local helper choices are not republished, reviewed, or treated as this repo's recommended base set.

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
