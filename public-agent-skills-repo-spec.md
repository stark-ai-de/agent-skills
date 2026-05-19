# Public Agent Skills Repository Specification

## 1. Purpose

Create a public GitHub repository for reusable agent skills focused on repository maintenance, Codex workflows, and high-signal engineering operations.

The repository should be installable with the Vercel `skills` CLI and usable by OpenAI Codex CLI, Claude Code, Cursor, and other agents that support the open Agent Skills format.

This spec is intended to be handed to Codex CLI so it can scaffold the repository, create the first skill set, add validation, and prepare the repo for public publishing.

## 2. Working Name

Use one of these repository names:

```text
skills
agent-skills
maintainer-skills
servrox-skills
```

Recommended default:

```text
agent-skills
```

Use placeholders in generated docs until the final GitHub owner/repo is known:

```text
<github-owner>/<repo>
```

Example install command after publishing:

```bash
npx skills@latest add <github-owner>/<repo> -g -a codex
```

Specific skill install:

```bash
npx skills@latest add <github-owner>/<repo> --skill codex-context-guard -g -a codex
```

## 3. Product Vision

This repo should feel like a practical maintainer toolbox, not a generic prompt library.

The skills should help agents:

- Maintain public repositories
- Review repository health
- Triage issues and pull requests
- Prepare releases
- Audit docs
- Debug CI failures
- Keep agent context small and useful
- Create and review other skills
- Curate Codex memories
- Preserve high-quality handoffs between agent sessions

The repo should prioritize small, composable, operational skills over huge methodology packs.

## 4. Design Principles

### 4.1 Small and Composable

Each skill should perform one workflow well.

Avoid giant all-purpose skills like:

```text
engineering-super-agent
full-repo-maintainer
do-everything
```

Prefer focused skills like:

```text
issue-triage
pr-review
release-manager
docs-audit
codex-context-guard
```

### 4.2 Progressive Disclosure

A skill should expose only enough context up front for activation.

Use this split:

```text
SKILL.md    = core workflow and routing
references/ = optional deep checklists, examples, rubrics
scripts/    = deterministic helpers
assets/     = templates and static files
```

Do not tell agents to read every reference file by default.

### 4.3 Skills Are Active Context, Not Always-On Policy

Use `AGENTS.md` for always-on repository rules.

Use skills for specialized workflows that should load only when relevant.

Examples:

```text
AGENTS.md:
- Do not commit secrets.
- Use pnpm.
- Run validation before release.
- Generated files must not be edited manually.

Skill:
- Triage issues through a maintainer decision tree.
- Review release readiness.
- Curate Codex memories.
- Audit docs for onboarding gaps.
```

### 4.4 Public Skills Must Be Safe

Public users should be able to inspect and trust the repo.

Rules:

- Avoid destructive scripts.
- If a script can modify files, clearly label it and require user approval in the skill.
- Prefer read-only scripts for v1.
- Never include private repo paths, secrets, tokens, internal hostnames, or customer data.
- Document what every script does.
- Add a `SECURITY.md`.
- Add a clear license.

### 4.5 Repo-Maintaining Skills Should Produce Artifacts

Maintainer workflows should produce tangible outputs:

- Review report
- Triage decision
- Release checklist
- Changelog draft
- Handoff file
- PR review table
- Issue split
- Docs gap list
- Risk register
- Recommended next action

Avoid vague “done” responses.

## 5. External Compatibility Requirements

The repository must follow the common Agent Skills structure.

A skill is a directory containing a required `SKILL.md`.

Each `SKILL.md` must start with YAML frontmatter:

```yaml
---
name: example-skill
description: Clear routing description. Use when the user asks for X, Y, or Z.
---
```

Requirements:

- `name` is required.
- `description` is required.
- `name` should match the parent directory name.
- `name` should use lowercase letters, numbers, and hyphens.
- `description` should explain what the skill does and when to use it.
- Keep trigger words near the start of the description.
- Optional directories may include:
  - `references/`
  - `scripts/`
  - `assets/`
  - `agents/`

## 6. Repository Layout

Use this layout:

```text
agent-skills/
  README.md
  LICENSE
  SECURITY.md
  CONTRIBUTING.md
  CHANGELOG.md
  AGENTS.md
  package.json

  docs/
    design-principles.md
    publishing.md
    validation.md
    skill-authoring-style.md
    roadmap.md

  scripts/
    list-skills.mjs
    validate-skills.mjs
    scaffold-skill.mjs

  skills/
    codex-operations/
      codex-context-guard/
        SKILL.md
        references/
          context-budgeting.md
          handoff-template.md
      codex-memory-curator/
        SKILL.md
        references/
          classification-rubric.md
          safe-editing-procedure.md
          config-modes.md
        scripts/
          inventory-memories.sh
          backup-memories.sh
          scan-memory-risks.sh

    repo-maintenance/
      agent-context-bootstrap/
        SKILL.md
        assets/
          agents-block.md
          issue-tracker.md
          domain-docs.md
      repo-health-audit/
        SKILL.md
        references/
          audit-rubric.md
          report-template.md
      issue-triage/
        SKILL.md
        references/
          triage-state-machine.md
          label-mapping.md
      pr-review/
        SKILL.md
        references/
          review-rubric.md
          risk-table-template.md
      release-manager/
        SKILL.md
        references/
          release-checklist.md
          changelog-template.md
      dependency-update-review/
        SKILL.md
        references/
          dependency-risk-rubric.md
      ci-debugger/
        SKILL.md
        references/
          ci-log-reading.md
      docs-audit/
        SKILL.md
        references/
          docs-rubric.md
      security-baseline-review/
        SKILL.md
        references/
          security-checklist.md

    skill-maintenance/
      skill-authoring-review/
        SKILL.md
        references/
          skill-quality-rubric.md
          frontmatter-examples.md
      skill-repo-curator/
        SKILL.md
        references/
          repo-release-checklist.md
          deprecation-policy.md
      skill-installation-support/
        SKILL.md
        references/
          vercel-skills-cli.md

    productivity/
      handoff/
        SKILL.md
        assets/
          handoff-template.md
      grill-plan/
        SKILL.md
        references/
          questioning-rubric.md
```

## 7. Top-Level Files

### 7.1 `README.md`

The README must include:

1. What this repo is
2. Who it is for
3. Installation commands
4. Skill catalog
5. How to install one skill
6. How to list available skills
7. Safety notes
8. How to contribute
9. License

Suggested README outline:

````md
# Agent Skills

Reusable skills for repository maintenance, Codex operations, and maintainer workflows.

## Install

Install all skills globally for Codex:

```bash
npx skills@latest add <github-owner>/<repo> -g -a codex
```
````

List skills without installing:

```bash
npx skills@latest add <github-owner>/<repo> --list
```

Install one skill:

```bash
npx skills@latest add <github-owner>/<repo> --skill codex-context-guard -g -a codex
```

## Skills

| Skill                  | Category          | Use when                                           |
| ---------------------- | ----------------- | -------------------------------------------------- |
| codex-context-guard    | Codex operations  | Long Codex sessions risk context-window exhaustion |
| codex-memory-curator   | Codex operations  | Codex memories may be stale, broad, or harmful     |
| repo-health-audit      | Repo maintenance  | You want a full repository maintenance audit       |
| issue-triage           | Repo maintenance  | You need to triage issues or label an inbox        |
| pr-review              | Repo maintenance  | You need a structured PR review                    |
| release-manager        | Repo maintenance  | You are preparing a release                        |
| docs-audit             | Repo maintenance  | Docs, README, onboarding, or examples need review  |
| skill-authoring-review | Skill maintenance | You are creating or reviewing a skill              |

````

### 7.2 `AGENTS.md`

This repo’s `AGENTS.md` should be short and always-on.

Suggested content:

```md
# Agent Instructions

This repository contains public Agent Skills.

## Rules

- Do not include secrets, tokens, customer data, private repo paths, or internal hostnames.
- Keep `SKILL.md` files concise and operational.
- Move long examples, rubrics, and templates into `references/` or `assets/`.
- Prefer read-only scripts. Any script that modifies files must be clearly documented.
- Every skill must have valid YAML frontmatter with `name` and `description`.
- The `name` must match the skill folder.
- Descriptions must contain trigger words and clear scope.
- Do not copy copyrighted skill text from other repositories. Use them only as inspiration.
- Run `npm run validate` before finalizing changes.
````

### 7.3 `SECURITY.md`

Must include:

```md
# Security Policy

Skills are executable context and may include scripts. Review all installed skills before using them.

## Reporting Security Issues

Open a private security advisory or contact: <security-contact>

## Rules for Contributors

- Do not submit secrets or credentials.
- Do not include destructive scripts.
- Do not include scripts that exfiltrate data.
- Do not include private infrastructure details.
- Do not add dependencies unless necessary.
```

### 7.4 `CONTRIBUTING.md`

Must include:

- Skill naming rules
- Frontmatter rules
- Description quality rules
- Safety rules
- Validation commands
- PR checklist
- Deprecation policy

### 7.5 `CHANGELOG.md`

Use Keep-a-Changelog style sections:

```md
# Changelog

## Unreleased

### Added

### Changed

### Fixed

### Deprecated

### Removed
```

## 8. Package and Validation Scripts

Add a minimal Node package for validation.

### 8.1 `package.json`

```json
{
  "name": "agent-skills",
  "private": true,
  "type": "module",
  "scripts": {
    "list": "node scripts/list-skills.mjs",
    "validate": "node scripts/validate-skills.mjs",
    "scaffold": "node scripts/scaffold-skill.mjs"
  },
  "devDependencies": {}
}
```

No external dependencies are required for v1.

### 8.2 `scripts/list-skills.mjs`

Purpose:

- Traverse `skills/**/SKILL.md`
- Print skill name, relative path, and description
- Help maintain README skill catalog

Implementation:

```js
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillsDir = path.join(root, "skills");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (entry.isFile() && entry.name === "SKILL.md") files.push(full);
  }

  return files;
}

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const data = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const value = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    data[key] = value;
  }
  return data;
}

for (const file of walk(skillsDir)) {
  const fm = parseFrontmatter(file);
  const rel = path.relative(root, file);
  console.log(
    `${fm?.name ?? "(missing name)"}\t${rel}\t${fm?.description ?? "(missing description)"}`,
  );
}
```

### 8.3 `scripts/validate-skills.mjs`

Purpose:

- Validate every `SKILL.md`
- Enforce required frontmatter
- Ensure name matches parent folder
- Enforce lowercase/hyphen skill names
- Check description quality
- Catch obviously risky script content
- Ensure README contains install instructions

Implementation:

```js
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillsDir = path.join(root, "skills");
const errors = [];
const warnings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (entry.isFile() && entry.name === "SKILL.md") files.push(full);
  }

  return files;
}

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${file}: missing YAML frontmatter`);
    return { text, data: null };
  }

  const data = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i === -1) {
      warnings.push(`${file}: suspicious frontmatter line: ${line}`);
      continue;
    }
    const key = line.slice(0, i).trim();
    const value = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    data[key] = value;
  }

  return { text, data };
}

const skillFiles = walk(skillsDir);

if (skillFiles.length === 0) {
  errors.push("No skills found under skills/**/SKILL.md");
}

for (const file of skillFiles) {
  const { text, data } = parseFrontmatter(file);
  const rel = path.relative(root, file);
  if (!data) continue;

  const parent = path.basename(path.dirname(file));
  const name = data.name;
  const description = data.description;

  if (!name) errors.push(`${rel}: missing frontmatter name`);
  if (!description) errors.push(`${rel}: missing frontmatter description`);

  if (name && name !== parent) {
    errors.push(`${rel}: frontmatter name "${name}" must match parent folder "${parent}"`);
  }

  if (name && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    errors.push(`${rel}: name must be lowercase letters/numbers/hyphens`);
  }

  if (description) {
    if (description.length < 80) {
      warnings.push(`${rel}: description is short; include trigger words and scope`);
    }
    if (description.length > 500) {
      warnings.push(`${rel}: description is long; front-load trigger words`);
    }
    if (!/\b(use when|when the user|trigger|asks?|mentions?)\b/i.test(description)) {
      warnings.push(`${rel}: description should say when to use the skill`);
    }
  }

  if (!/^---\n/.test(text)) {
    errors.push(`${rel}: SKILL.md must start with frontmatter`);
  }

  const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
  if (body.length < 500) {
    warnings.push(`${rel}: body seems very short; ensure workflow and output format exist`);
  }

  if (body.length > 16000) {
    warnings.push(`${rel}: body is large; move long material to references/`);
  }

  if (!/##\s+(Workflow|Process|Procedure)/i.test(body)) {
    warnings.push(`${rel}: missing Workflow/Process/Procedure section`);
  }

  if (!/##\s+(Output|Output format|Report|Done|Acceptance)/i.test(body)) {
    warnings.push(`${rel}: missing output or acceptance section`);
  }
}

const readmePath = path.join(root, "README.md");
if (!fs.existsSync(readmePath)) {
  errors.push("README.md missing");
} else {
  const readme = fs.readFileSync(readmePath, "utf8");
  if (!readme.includes("npx skills")) {
    warnings.push("README.md should include npx skills install commands");
  }
  if (!readme.includes("--skill")) {
    warnings.push("README.md should show how to install one specific skill");
  }
}

for (const file of walk(path.join(root, "skills"))) {
  // no-op placeholder; SKILL.md scanning handled above
}

function walkAll(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkAll(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}

for (const file of walkAll(path.join(root, "skills"))) {
  if (!/\/scripts\//.test(file.replaceAll("\\", "/"))) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/\brm\s+-rf\b|\bsudo\b|\bcurl\b.*\|\s*(sh|bash)|\bwget\b.*\|\s*(sh|bash)/.test(text)) {
    warnings.push(
      `${path.relative(root, file)}: contains high-risk shell pattern; review carefully`,
    );
  }
}

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log("");
}

if (errors.length) {
  console.error("Errors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${skillFiles.length} skill(s).`);
```

### 8.4 `scripts/scaffold-skill.mjs`

Purpose:

- Create a new skill folder with a valid `SKILL.md`
- Optionally create `references/`, `scripts/`, and `assets/`

Suggested behavior:

```bash
npm run scaffold repo-maintenance/my-new-skill
```

Create:

```text
skills/repo-maintenance/my-new-skill/SKILL.md
```

The script should:

- Refuse uppercase names
- Refuse underscores
- Refuse if folder exists
- Generate frontmatter
- Add a standard workflow skeleton

Codex can implement this script after scaffolding v1.

## 9. GitHub Actions

Add:

```text
.github/workflows/validate.yml
```

Content:

```yaml
name: Validate skills

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm run validate
```

## 10. Skill Quality Standard

Every skill must include:

1. Frontmatter
2. Goal
3. When to use
4. When not to use
5. Inputs to inspect
6. Workflow
7. Safety rules
8. Output format
9. Completion criteria
10. Failure modes

Recommended `SKILL.md` length:

```text
80 to 300 lines
```

Move longer material into `references/`.

## 11. Default Skill Template

Use this skeleton for every skill:

````md
---
name: <skill-name>
description: <clear trigger description>. Use when the user asks for <trigger terms>. Do not use when <exclusions>.
---

# <Human Skill Name>

## Goal

<One paragraph describing the concrete outcome.>

## When to use

- <Trigger case 1>
- <Trigger case 2>
- <Trigger case 3>

## When not to use

- <Exclusion 1>
- <Exclusion 2>

## Inputs to inspect

- <Files, commands, repo state, issue data, PR data>

## Workflow

1. <Step>
2. <Step>
3. <Step>
4. Validate.
5. Report.

## Safety rules

- Do not perform destructive changes without approval.
- Do not include secrets in output.
- Prefer minimal, reversible changes.
- If information is missing, say what is missing.

## References

Read only when needed:

- `references/example.md` for detailed examples.

## Scripts

Use only when needed:

```bash
bash scripts/example.sh
```
````

## Output format

Return:

1. Summary
2. Findings
3. Changes or proposed changes
4. Validation result
5. Remaining risks
6. Recommended next action

## Completion criteria

- <Criterion 1>
- <Criterion 2>

````

## 12. Initial Skill Catalog

### 12.1 `codex-context-guard`

Category:

```text
codex-operations
````

Purpose:

Prevent Codex context-window exhaustion during long sessions.

Description:

```yaml
description: Prevent Codex context-window exhaustion during long-running refactors, repo audits, migrations, debugging sessions, or tasks with large logs, many file reads, or repeated tool output. Use when Codex context is getting high, `/compact` may be needed, or the user asks for context-efficient workflows.
```

Core behavior:

- Keep file reads targeted.
- Avoid whole-repo scans.
- Maintain a handoff file.
- Show `git diff --stat`, not full diffs.
- Tell the user when to compact.
- Prefer one bounded task per thread.

Artifacts:

```text
references/context-budgeting.md
references/handoff-template.md
```

### 12.2 `codex-memory-curator`

Category:

```text
codex-operations
```

Purpose:

Audit and clean up Codex memories.

Description:

```yaml
description: Review, grill, clean up, rewrite, and prune Codex memories. Use when the user asks to audit ~/.codex/memories, remove stale memories, reduce memory pollution, review memory files, or decide whether memory entries belong in AGENTS.md, config, docs, skills, or deletion.
```

Core behavior:

- Inventory memory files.
- Inspect Codex memory config.
- Classify entries as keep, rewrite, move, delete, or ask.
- Back up before edits.
- Never silently modify memories.
- Recommend memory config modes.

Scripts:

```text
inventory-memories.sh
backup-memories.sh
scan-memory-risks.sh
```

### 12.3 `agent-context-bootstrap`

Category:

```text
repo-maintenance
```

Purpose:

Set up repo-local agent context for skills and Codex.

Description:

```yaml
description: Bootstrap repo-local agent context for Codex and other coding agents. Use when setting up AGENTS.md, docs/agents, issue tracker rules, triage labels, domain docs, ADR locations, validation commands, or skill usage instructions for a repository.
```

Core behavior:

- Inspect existing `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `docs/adr`, `.github`, package files.
- Ask which issue tracker the repo uses.
- Create or update `docs/agents/issue-tracker.md`.
- Create or update `docs/agents/triage-labels.md`.
- Create or update `docs/agents/domain-docs.md`.
- Add or update an `## Agent skills` block in `AGENTS.md`.
- Do not overwrite existing instructions.

Assets:

```text
agents-block.md
issue-tracker.md
domain-docs.md
```

### 12.4 `repo-health-audit`

Category:

```text
repo-maintenance
```

Purpose:

Run a structured maintenance audit on a repository.

Description:

```yaml
description: Audit repository health and maintenance readiness. Use when the user asks for a repo review, maintainer audit, cleanup plan, onboarding audit, technical debt scan, CI/docs/release hygiene review, or public repo readiness check.
```

Core behavior:

- Inspect README, package files, CI, tests, docs, security files, issue templates, release flow.
- Produce a scored report.
- Do not change files unless explicitly asked.
- Separate urgent problems from polish.
- Recommend next actions.

Output:

```md
# Repo Health Audit

## Summary

## Scores

| Area | Score | Notes |
| ---- | ----: | ----- |

## Highest-risk issues

## Quick wins

## Suggested issue backlog

## Recommended next action
```

### 12.5 `issue-triage`

Category:

```text
repo-maintenance
```

Purpose:

Triage GitHub, Linear, GitLab, or local markdown issues.

Description:

```yaml
description: Triage repository issues through a maintainer decision tree. Use when the user asks to classify issues, apply labels, identify missing information, mark ready-for-agent work, split vague reports, or clean up an issue inbox.
```

Core behavior:

- Read issue details.
- Determine category: bug, feature, docs, question, duplicate, wontfix, needs-info.
- Decide readiness: needs maintainer, needs reporter, ready for agent, ready for human.
- Propose labels.
- Draft response.
- Do not close or label issues without approval unless explicitly authorized.

References:

```text
triage-state-machine.md
label-mapping.md
```

### 12.6 `pr-review`

Category:

```text
repo-maintenance
```

Purpose:

Review pull requests as a maintainer.

Description:

```yaml
description: Review pull requests for correctness, maintainability, tests, security, docs impact, release risk, and agent-induced failure modes. Use when the user asks for a PR review, diff review, merge readiness check, or maintainer feedback.
```

Core behavior:

- Inspect changed files and diff stats first.
- Identify behavior changes.
- Check tests and docs.
- Flag risky changes.
- Provide review comments.
- Avoid nitpicks unless they affect correctness or maintainability.
- Do not approve merge unless validation is sufficient.

Output:

```md
# PR Review

## Verdict

## Blocking issues

## Non-blocking suggestions

## Test coverage

## Release risk

## Suggested review comments
```

### 12.7 `release-manager`

Category:

```text
repo-maintenance
```

Purpose:

Prepare releases.

Description:

```yaml
description: Prepare repository releases. Use when the user asks to draft release notes, update changelog, check semver, verify CI, create a release checklist, or decide whether a public repo is ready to tag and publish.
```

Core behavior:

- Inspect commits, changelog, package version, CI status, tests, docs, breaking changes.
- Draft release notes.
- Recommend semver bump.
- Produce a preflight checklist.
- Never tag, publish, or push without explicit approval.

References:

```text
release-checklist.md
changelog-template.md
```

### 12.8 `dependency-update-review`

Category:

```text
repo-maintenance
```

Purpose:

Review dependency updates and lockfile changes.

Description:

```yaml
description: Review dependency updates, package manager changes, lockfile diffs, version bumps, and dependency risk. Use when the user asks whether dependency updates are safe, wants to upgrade packages, or needs a dependency PR reviewed.
```

Core behavior:

- Identify direct vs transitive changes.
- Check package manager and lockfile consistency.
- Flag major upgrades and breaking changes.
- Recommend targeted tests.
- Do not run broad upgrades unless asked.
- Do not claim vulnerability status without current advisory data.

### 12.9 `ci-debugger`

Category:

```text
repo-maintenance
```

Purpose:

Debug failed CI runs without dumping giant logs.

Description:

```yaml
description: Diagnose failed CI jobs and build pipelines using small-log, evidence-first debugging. Use when the user shares a failed GitHub Actions, GitLab CI, Vercel, or package-manager build and wants root cause, minimal fix, and regression test guidance.
```

Core behavior:

- Request or inspect failing job logs.
- Use `tail`, targeted search, and error extraction.
- Identify first meaningful failure.
- Avoid being distracted by downstream failures.
- Propose minimal fix.
- Recommend validation command.

### 12.10 `docs-audit`

Category:

```text
repo-maintenance
```

Purpose:

Review docs, README, examples, and onboarding.

Description:

```yaml
description: Audit repository documentation, README, examples, installation steps, onboarding flow, API docs, and contribution docs. Use when the user asks whether docs are clear, complete, current, or ready for a public repo.
```

Core behavior:

- Check README promises against actual repo files.
- Verify install and usage commands.
- Look for broken internal links.
- Identify missing examples.
- Separate beginner docs from maintainer docs.
- Produce a docs gap list.

### 12.11 `security-baseline-review`

Category:

```text
repo-maintenance
```

Purpose:

Review public repository security hygiene.

Description:

```yaml
description: Review public repository security hygiene at a baseline maintainer level. Use when the user asks for secret-leak checks, SECURITY.md review, dependency hygiene, GitHub settings checklist, CI safety, or public release security readiness.
```

Core behavior:

- Check for obvious secret patterns.
- Check `.gitignore`, `SECURITY.md`, issue templates, CI permissions, dependency review policy.
- Recommend safer defaults.
- Do not print secrets.
- Do not provide exploit steps.
- If possible secret exposure is found, recommend rotation.

### 12.12 `skill-authoring-review`

Category:

```text
skill-maintenance
```

Purpose:

Create and review skills.

Description:

```yaml
description: Create or review Agent Skills with correct SKILL.md frontmatter, trigger descriptions, concise workflow design, progressive disclosure, references, scripts, assets, safety rules, and installability. Use when writing a new skill, improving an existing skill, or validating a public skills repo.
```

Core behavior:

- Check syntax.
- Check description trigger quality.
- Enforce one workflow per skill.
- Move long content into references.
- Validate output contract.
- Identify unsafe scripts.
- Produce rewrite suggestions.

### 12.13 `skill-repo-curator`

Category:

```text
skill-maintenance
```

Purpose:

Maintain this skills repo itself.

Description:

```yaml
description: Maintain a public Agent Skills repository. Use when updating skill catalogs, validating SKILL.md files, preparing a release, deprecating skills, reviewing install commands, checking README consistency, or keeping a skills repo ready for npx skills installation.
```

Core behavior:

- Run validation.
- Compare README catalog to skill folders.
- Check install commands.
- Check changelog.
- Identify stale skills.
- Draft release notes.
- Propose deprecations.

### 12.14 `skill-installation-support`

Category:

```text
skill-maintenance
```

Purpose:

Help users install skills via Vercel skills CLI.

Description:

```yaml
description: Help install, list, update, remove, or troubleshoot Agent Skills using the Vercel skills CLI. Use when the user asks about npx skills add, installing a whole repo, installing one skill, global vs project installs, symlink vs copy, or Codex/Claude/Cursor agent targets.
```

Core behavior:

- Explain install commands.
- Include specific `npx skills` examples.
- Distinguish global vs project installs.
- Help troubleshoot missing skills.
- Suggest listing repo skills before install.

### 12.15 `handoff`

Category:

```text
productivity
```

Purpose:

Create a compact handoff document for another agent or new thread.

Description:

```yaml
description: Write a compact handoff document so a fresh agent or new Codex thread can continue. Use when context is long, the user wants to switch threads, work must be paused, or the agent needs to summarize current state without duplicating existing docs or diffs.
```

Core behavior:

- Summarize objective, decisions, files changed, commands run, test status, known issues, next steps.
- Do not duplicate existing artifacts.
- Reference docs, diffs, PRs, issues, or reports by path.
- Suggest relevant skills for the next agent.

### 12.16 `grill-plan`

Category:

```text
productivity
```

Purpose:

Interrogate a plan before execution.

Description:

```yaml
description: Relentlessly question a plan, design, migration, release, or repo maintenance proposal until assumptions, risks, constraints, and decision branches are clear. Use when the user wants to be grilled before implementation or wants a plan challenged.
```

Core behavior:

- Ask focused questions.
- Resolve one decision branch at a time.
- Identify hidden constraints.
- Convert uncertainty into explicit decisions.
- End with a tightened plan.

## 13. Skill Implementation Order

Implement v1 in this order:

1. `skill-authoring-review`
2. `skill-repo-curator`
3. `codex-context-guard`
4. `handoff`
5. `repo-health-audit`
6. `agent-context-bootstrap`
7. `issue-triage`
8. `pr-review`
9. `release-manager`
10. `docs-audit`
11. `codex-memory-curator`
12. `ci-debugger`
13. `dependency-update-review`
14. `security-baseline-review`
15. `skill-installation-support`
16. `grill-plan`

Reasoning:

- Start by making the repo maintainable.
- Add context/conversation survival skills early.
- Add repo maintenance workflows next.
- Add more specialized reviews later.

## 14. Required `SKILL.md` Sections by Skill Type

### 14.1 Review Skills

Applies to:

```text
repo-health-audit
pr-review
docs-audit
dependency-update-review
security-baseline-review
skill-authoring-review
```

Required sections:

```text
Goal
When to use
When not to use
Inputs to inspect
Review rubric
Workflow
Output format
Failure modes
Completion criteria
```

### 14.2 Workflow Skills

Applies to:

```text
issue-triage
release-manager
ci-debugger
agent-context-bootstrap
skill-repo-curator
```

Required sections:

```text
Goal
When to use
Inputs
Process
Decision points
Safety rules
Output format
Completion criteria
```

### 14.3 Codex Operations Skills

Applies to:

```text
codex-context-guard
codex-memory-curator
handoff
```

Required sections:

```text
Goal
Trigger conditions
Rules
Workflow
Commands
Safety rules
Output format
Recovery behavior
```

## 15. Description Writing Rules

Descriptions are routing rules, not marketing copy.

Good description formula:

```text
<Verb> <object>. Use when the user asks for <trigger words>, <synonyms>, or <specific situations>. Do not use when <exclusion>.
```

Bad:

```yaml
description: Helps maintain repos.
```

Good:

```yaml
description: Audit repository health and maintenance readiness. Use when the user asks for a repo review, maintainer audit, cleanup plan, onboarding audit, technical debt scan, CI/docs/release hygiene review, or public repo readiness check.
```

Rules:

- Include trigger words.
- Include the object being worked on.
- Mention exclusions when important.
- Avoid vague adjectives.
- Front-load the core use case.
- Keep descriptions under 500 characters when possible.
- Avoid implementation details that belong in the body.

## 16. Reference File Rules

Use `references/` for:

- Long rubrics
- Examples
- Templates
- Decision trees
- Troubleshooting guides
- Detailed command explanations

Do not put these in `SKILL.md` unless the agent needs them every time.

A `SKILL.md` should say:

```md
## References

Read only when needed:

- `references/review-rubric.md` when producing a scored review.
- `references/report-template.md` when writing the final report.
```

It should not say:

```md
Read all references before starting.
```

## 17. Script Rules

Scripts should be deterministic helpers, not reasoning replacements.

Good scripts:

```text
list-skills.mjs
validate-skills.mjs
inventory-memories.sh
scan-memory-risks.sh
```

Bad scripts:

```text
auto-delete-bad-memories.sh
force-release.sh
approve-pr.sh
close-all-issues.sh
```

Rules:

- Prefer read-only scripts.
- If a script modifies files, it must be clearly documented.
- No script should push, publish, close issues, approve PRs, or delete files by default.
- Avoid dependencies in v1.
- Scripts must use `set -euo pipefail` for shell.
- Scripts must not hide errors.
- Scripts must not print secrets.

## 18. Installation and Publishing Plan

### 18.1 Local Development

From repo root:

```bash
npm run validate
npm run list
```

Test with local skills CLI install:

```bash
npx skills@latest add . --list
```

Install one local skill globally for Codex:

```bash
npx skills@latest add . --skill codex-context-guard -g -a codex
```

### 18.2 Public Install

After publishing to GitHub:

```bash
npx skills@latest add <github-owner>/<repo> --list
```

Install all skills globally for Codex:

```bash
npx skills@latest add <github-owner>/<repo> -g -a codex
```

Install one skill:

```bash
npx skills@latest add <github-owner>/<repo> --skill repo-health-audit -g -a codex
```

Install all skills for all supported agents:

```bash
npx skills@latest add <github-owner>/<repo> --all
```

### 18.3 Update Installed Skills

```bash
npx skills@latest update
```

### 18.4 Remove Installed Skills

```bash
npx skills@latest remove <skill-name>
```

## 19. Public Release Checklist

Before the first public release:

```text
[ ] README has install instructions
[ ] README has skill catalog
[ ] LICENSE exists
[ ] SECURITY.md exists
[ ] CONTRIBUTING.md exists
[ ] CHANGELOG.md exists
[ ] AGENTS.md exists
[ ] Every skill has SKILL.md
[ ] Every skill name matches folder name
[ ] Every description has trigger words
[ ] No private names, URLs, secrets, or customer details
[ ] No destructive scripts
[ ] npm run validate passes
[ ] npx skills@latest add . --list works
[ ] At least one skill can be locally installed
[ ] GitHub Actions validation passes
```

## 20. Deprecation Policy

Do not delete skills abruptly.

When deprecating:

1. Add a deprecation notice to the skill `SKILL.md`.
2. Explain the replacement skill.
3. Keep the skill for at least one minor release.
4. Update README.
5. Add changelog entry.
6. Remove only after users have a migration path.

Suggested deprecation notice:

```md
## Deprecation notice

This skill is deprecated. Use `$replacement-skill` instead.

Reason:

<short reason>

Migration:

<what to do>
```

## 21. Source Attribution and Inspiration Policy

This repo may learn from public skill repositories, but must not copy substantial text from them.

Allowed:

- Referencing public directory patterns
- Adopting common skill structure
- Writing original skills inspired by maintainer workflows
- Linking to references in `docs/design-principles.md`

Not allowed:

- Copying entire `SKILL.md` files from other repositories
- Copying long rubrics verbatim
- Reusing proprietary/private instructions
- Including private memories or repo-specific confidential context

## 22. Codex CLI Implementation Prompt

Use this prompt with Codex CLI to scaffold the repo:

```text
Create a public Agent Skills repository from this specification.

Repository goals:
- Public skills package installable with `npx skills@latest add <owner/repo>`
- Focus on repo maintenance, Codex operations, and skill maintenance
- Use `skills/<category>/<skill-name>/SKILL.md`
- Add validation scripts and GitHub Actions
- Add README, AGENTS.md, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md, LICENSE
- Implement v1 skills in the order listed in the spec
- Keep SKILL.md files concise and operational
- Put long rubrics in references/
- Prefer read-only scripts
- Do not include secrets, private repo paths, or customer details

After scaffolding:
1. Show the final file tree.
2. Run `npm run validate`.
3. Run `npm run list`.
4. Run `npx skills@latest add . --list` if Node/npx is available.
5. Do not publish, push, or install globally without approval.
```

## 23. Acceptance Criteria

The repo setup is complete when:

- The repository has the layout in section 6.
- At least the first five v1 skills are implemented:
  - `skill-authoring-review`
  - `skill-repo-curator`
  - `codex-context-guard`
  - `handoff`
  - `repo-health-audit`
- `README.md` documents install commands.
- `npm run validate` passes.
- `npm run list` prints every skill.
- `npx skills@latest add . --list` can discover the skills.
- GitHub Actions validation is configured.
- No private data or destructive scripts are present.
- The repo is ready to push public.

## 24. Nice-to-Have Future Work

After v1:

- Add screenshots or examples of skill output.
- Add `docs/examples/` with before/after workflows.
- Add generated skill catalog from `npm run list`.
- Add badges after GitHub Actions exists.
- Add semantic versioning notes in skill metadata.
- Add a `skills.json` generated catalog if useful.
- Add tests for validation scripts.
- Add install smoke test in CI.
- Add a `skill-evals/` folder with example prompts and expected behavior.
- Add an issue template for proposing new skills.
- Add a pull request template for skill changes.

## 25. Source Notes for the Spec

This spec follows these current ecosystem facts:

- Agent Skills are folders with a required `SKILL.md`, and `SKILL.md` needs at least `name` and `description`.
- Skills may include optional `scripts/`, `references/`, `assets/`, and `agents/`.
- Skill metadata is used for discovery, and full instructions are loaded when selected.
- Vercel’s `skills` CLI can install a GitHub repo, a specific skill from a multi-skill repo, a full Git URL, or a local folder.
- Public skill repos can be published by putting skills in a Git repo and sharing the repo; there is no separate registry publish step.
- Matt Pocock’s public skills repo uses a category-based `skills/` layout and emphasizes small, composable engineering workflows.

## 26. Recommended Next Action

Hand this spec to Codex CLI and ask it to scaffold the repo. Start with the first five skills only, validate them, then expand the catalog in later commits.
