# Publishing

This repository is published by pushing it to a public GitHub repository. There is no separate registry publish step.

## Public Repository

The public repository is expected to be:

```text
stark-ai-de/agent-skills
```

Recommended GitHub description during incubation:

```text
Agent Skills incubator for repo maintenance, Codex operations, skill maintenance, and agent workflow control.
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

Use after at least one skill is promoted:

```bash
npx skills add stark-ai-de/agent-skills --list
npx skills add stark-ai-de/agent-skills --skill <skill-name> -g -a codex
```

## Local Smoke Test

From the repository root:

```bash
npm run validate
npm run list
npm run smoke:install
```

`npm run smoke:install` creates a temporary clean copy of the repo, excludes `.agents/` and `skills-lock.json`, runs `npx skills@latest add . --list`, verifies every public skill is listed when present, verifies incubator skills are not listed, and removes the temporary copy. It does not install global skills.

Do not publish, push, tag, or install globally unless the maintainer explicitly asks for that action.

Test one local install after approval:

```bash
npx skills add ./skills --skill <skill-name> -a codex --copy -y
```

## First Public Release Checklist

- README explains that the public catalog is empty until promotion.
- README has the public catalog boundary.
- README explains the incubator and skill-eval roots.
- LICENSE exists.
- SECURITY.md exists.
- CONTRIBUTING.md exists.
- CHANGELOG.md exists.
- AGENTS.md exists.
- `docs/adr/` exists with initial ADRs.
- Every public and incubator skill has `SKILL.md`.
- Every public and incubator skill name matches its folder name.
- Every public and incubator skill follows agentskills.io naming constraints.
- Every description explains what the skill does and when to use it.
- No private names, URLs, secrets, or customer details are present.
- No destructive scripts are present.
- Published upstream skills are not vendored under `skills/`.
- Incubator skills use `metadata.internal: true` and are not discoverable through the public install path by default.
- Project-local helper skills under `.agents/skills/` and local `skills-lock.json` files are ignored.
- Category README files exist and match `SKILL.md` frontmatter.
- Clean-copy smoke install passes without listing project-local helper skills.
- `npm run validate` passes.
- `npm run smoke:install` works from the local checkout, including the empty public catalog state.
- At least one promoted skill can be locally installed after maintainer approval when a promoted skill exists.
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

1. Update public or incubator skills.
2. Run `npm run validate`.
3. Run `npx skills add ./skills --list` locally when public skills exist.
4. Run `npm run smoke:install`.
5. Update `CHANGELOG.md`.
6. Add an ADR only if a decision changed.
7. Commit changes after approval.
8. Tag version after approval.
9. Push tag after approval.
10. Create GitHub Release.
11. Verify public install when public skills exist.
