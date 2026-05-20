# Publishing

This repository is published by pushing it to a public GitHub repository. There is no separate registry publish step.

## Public Repository

The public repository is expected to be:

```text
stark-ai-de/agent-skills
```

Recommended GitHub description:

```text
Public Agent Skills for repo maintenance, Codex operations, and repeatable engineering workflows.
```

Recommended GitHub topics:

```text
agent-skills
codex
openai-codex
ai-agents
repository-maintenance
developer-tools
workflow-automation
pr-review
release-management
adr
```

Use:

```bash
npx skills add stark-ai-de/agent-skills --list
npx skills add stark-ai-de/agent-skills -g -a codex
npx skills add stark-ai-de/agent-skills --skill repo-health-audit -g -a codex
```

## Local Smoke Test

From the repository root:

```bash
npm run validate
npm run list
npx skills@latest add ./skills --list
npm run smoke:install
```

`npm run smoke:install` creates a temporary clean copy of the repo, excludes `.agents/`, runs `npx skills@latest add . --list`, verifies every public skill is listed, and removes the temporary copy. It does not install global skills.

Do not publish, push, tag, or install globally unless the maintainer explicitly asks for that action.

Test one local install after approval:

```bash
npx skills add ./skills --skill repo-health-audit -a codex --copy -y
```

## First Public Release Checklist

- README has install instructions.
- README has the skill catalog.
- LICENSE exists.
- SECURITY.md exists.
- CONTRIBUTING.md exists.
- CHANGELOG.md exists.
- AGENTS.md exists.
- `docs/adr/` exists with initial ADRs.
- Every skill has `SKILL.md`.
- Every skill name matches its folder name.
- Every skill follows agentskills.io naming constraints.
- Every description explains what the skill does and when to use it.
- No private names, URLs, secrets, or customer details are present.
- No destructive scripts are present.
- Published upstream skills are not vendored under `skills/`.
- Project-local helper skills under `.agents/skills/` are ignored and can be restored from `skills-lock.json`.
- Category README files exist and match `SKILL.md` frontmatter.
- Clean-copy smoke install passes without listing project-local helper skills.
- `npm run validate` passes.
- `npx skills@latest add ./skills --list` works from the local checkout.
- At least one skill can be locally installed after maintainer approval.
- GitHub Actions validation is configured.

## First Release

Use semantic version tags:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Create a GitHub Release:

```text
Title: v0.1.0
Summary:
- Initial Agent Skills repo
- agentskills.io-compatible structure
- Vercel skills CLI install support
- Lightweight ADR process
```

## Release Update Process

1. Update skills.
2. Run `npm run validate`.
3. Run `npx skills add ./skills --list` locally.
4. Run `npm run smoke:install`.
5. Update `CHANGELOG.md`.
6. Add an ADR only if a decision changed.
7. Commit changes after approval.
8. Tag version after approval.
9. Push tag after approval.
10. Create GitHub Release.
11. Verify public install.
