# Agent Skills Repository Spec v2: agentskills.io + Publishing + Lightweight ADRs

## 1. Purpose

Create and maintain the public repository:

```text
stark-ai-de/agent-skills
```

This repo publishes reusable Agent Skills for Codex workflows, repository maintenance, skill maintenance, and engineering automation.

This v2 spec adds three required pillars:

1. Use the open Agent Skills specification at `https://agentskills.io/specification` as the repo's format contract.
2. Publish skills through a public GitHub repository and validate/install them with the Vercel `skills` CLI.
3. Create `docs/adr/` and document all important repo decisions as short, easy-to-read Architecture Decision Records.

The repository should be usable by Codex CLI first, but it must not be Codex-only. It should stay compatible with the broader Agent Skills ecosystem where practical.

## 2. Repository Identity

Recommended GitHub repo:

```text
stark-ai-de/agent-skills
```

Recommended GitHub description:

```text
Reusable Agent Skills for Codex workflows, repository maintenance, and engineering automation.
```

Recommended README title:

```md
# Agent Skills

Reusable Agent Skills for Codex workflows, repository maintenance, and engineering automation.
```

Recommended topics:

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

## 3. Normative Standards

### 3.1 Primary format standard

Use `https://agentskills.io/specification` as the normative skill format.

The repo must follow these core rules:

- A skill is a directory.
- Every skill directory must contain a required `SKILL.md`.
- `SKILL.md` must start with YAML frontmatter.
- `name` is required.
- `description` is required.
- `name` must match the parent directory name.
- `name` must be 1 to 64 characters.
- `name` may use lowercase letters, numbers, and hyphens.
- `name` must not start or end with a hyphen.
- `name` must not contain consecutive hyphens.
- `description` must be non-empty and at most 1024 characters.
- `description` must describe what the skill does and when to use it.
- Optional frontmatter fields may include:
  - `license`
  - `compatibility`
  - `metadata`
  - `allowed-tools`

### 3.2 Compatibility with Codex and Vercel skills CLI

The repo should work with:

```text
Codex CLI
Vercel skills CLI
Claude Code
Cursor
GitHub Copilot agent environments where compatible
Other agents that support the open Agent Skills format
```

Codex is the primary runtime, but the skill format must stay portable.

### 3.3 Progressive disclosure

Skills must use progressive disclosure:

```text
SKILL.md     = short operational workflow
references/ = optional deep rubrics, examples, and checklists
scripts/    = deterministic helper scripts
assets/     = templates and static resources
```

Rules:

- Do not put long essays in `SKILL.md`.
- Keep `SKILL.md` under 500 lines.
- Prefer 80 to 300 lines.
- Keep long examples in `references/`.
- Keep templates in `assets/`.
- Do not instruct agents to read every reference by default.
- Use relative paths from the skill root.
- Avoid deeply nested reference chains.

## 4. Repository Layout

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

  .github/
    workflows/
      validate.yml

  docs/
    adr/
      README.md
      TEMPLATE.md
      0001-use-open-agent-skills-spec.md
      0002-publish-through-github-and-vercel-skills-cli.md
      0003-keep-adrs-short.md
    design-principles.md
    publishing.md
    validation.md
    skill-authoring-style.md
    roadmap.md

  scripts/
    list-skills.mjs
    validate-skills.mjs
    validate-adrs.mjs
    new-adr.mjs
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
      adr-writer/
        SKILL.md
        assets/
          adr-template.md
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

## 5. Skill Frontmatter Standard

Every `SKILL.md` must use this frontmatter shape:

```yaml
---
name: repo-health-audit
description: Audit repository health and maintenance readiness. Use when the user asks for a repo review, maintainer audit, cleanup plan, onboarding audit, technical debt scan, CI/docs/release hygiene review, or public repo readiness check.
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---
```

### 5.1 Required fields

```yaml
name: <folder-name>
description: <what it does + when to use it>
```

### 5.2 Optional fields

Use `license` for public repo clarity:

```yaml
license: MIT
```

Use `metadata` for cataloging:

```yaml
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
```

Use `compatibility` only when truly needed:

```yaml
compatibility: Requires git and shell access for repository inspection.
```

Avoid `allowed-tools` in v1 unless a specific agent target requires it. It is experimental and support varies by agent.

## 6. Skill Description Rules

Descriptions are routing rules, not marketing copy.

Good formula:

```text
<Verb> <object>. Use when the user asks for <trigger terms>, <synonyms>, or <specific situations>. Do not use when <exclusion>.
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

- Include the main object.
- Include likely trigger words.
- Include "Use when".
- Mention exclusions when useful.
- Keep descriptions under 500 characters if possible.
- Never exceed 1024 characters.
- Put the most important trigger words near the start.

## 7. Skill Body Standard

Each `SKILL.md` should include:

```text
Goal
When to use
When not to use
Inputs to inspect
Workflow
Safety rules
References
Scripts
Output format
Completion criteria
Failure modes
```

Do not include long background sections unless needed.

Preferred skill body shape:

````md
---
name: <skill-name>
description: <description>
license: MIT
metadata:
  author: stark-ai-de
  category: <category>
  version: "0.1.0"
---

# <Human Skill Name>

## Goal

<One short paragraph.>

## When to use

- <Trigger>
- <Trigger>

## When not to use

- <Exclusion>
- <Exclusion>

## Inputs to inspect

- <Files, command output, repo state>

## Workflow

1. <Step>
2. <Step>
3. Validate.
4. Report.

## Safety rules

- Do not perform destructive changes without approval.
- Do not include secrets in output.
- Prefer minimal, reversible changes.

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
3. Proposed changes
4. Validation result
5. Remaining risks
6. Recommended next action

## Completion criteria

- <Criterion>

````

## 8. ADR System

Create:

```text
docs/adr/
````

This folder records important repository decisions.

The ADRs must be short and easy to read. Bloated ADRs are forbidden.

### 8.1 ADR purpose

Use ADRs to capture decisions that affect the repo long-term.

Examples:

- Use agentskills.io as the skill format standard.
- Publish via public GitHub repo and Vercel skills CLI.
- Keep ADRs short.
- Use category-based skill folders.
- Use MIT license.
- Add or remove a major skill category.
- Change validation rules.
- Change publishing process.
- Deprecate a skill.

### 8.2 When not to write an ADR

Do not write ADRs for:

- Typo fixes
- Small copy edits
- Minor template polish
- Routine version bumps
- Normal skill additions that follow existing rules
- One-off implementation details

### 8.3 ADR anti-bloat rules

Every ADR must follow these limits:

```text
Max body length: 250 words
Target length: 120 to 180 words
Max sections: 6
Max bullets per section: 3
Max paragraph length: 55 words
No long quotes
No giant context dumps
No duplicated history
No diagrams
No code blocks unless absolutely necessary
```

If a decision needs more detail, link to a separate design doc. The ADR itself remains short.

### 8.4 ADR naming

Use:

```text
docs/adr/0001-short-kebab-title.md
docs/adr/0002-short-kebab-title.md
```

Rules:

- Four-digit numeric prefix.
- Kebab-case title.
- No skipped numbers unless a file was intentionally removed before commit.
- Never rename accepted ADRs unless fixing a typo before first public release.

### 8.5 ADR status values

Allowed statuses:

```text
Proposed
Accepted
Superseded
Deprecated
Rejected
```

If superseded:

```text
Status: Superseded by ADR-0007
```

If deprecated:

```text
Status: Deprecated
```

### 8.6 Editing ADRs

After an ADR is accepted:

Allowed edits:

- Fix typos
- Add a superseded/deprecated status
- Add a link to a replacement ADR

Forbidden edits:

- Rewriting the decision
- Expanding the rationale into a long essay
- Changing history to match later opinions

For a new direction, write a new ADR.

## 9. Optimized ADR Template

This template is inspired by the short ADR style from common ADR templates and the concise tagging/risk language from Planguage-style records, but it is optimized for this repo.

Create:

```text
docs/adr/TEMPLATE.md
```

Content:

```md
# ADR-0000: <short title>

Status: Proposed  
Date: YYYY-MM-DD  
Owner: <person or team>  
Gist: <one-line summary>

## Decision

We will <state the decision in one sentence>.

## Why

- <reason 1>
- <reason 2>
- <reason 3>

## Options

- Chosen: <option>
- Rejected: <option and short reason>
- Rejected: <option and short reason>

## Consequences

- Good: <positive result>
- Tradeoff: <cost or downside>
- Risk: <main risk or "none known">

## Follow-up

- <one next action, or "None">
```

### 9.1 Template rules

- `Decision` must be one sentence.
- `Gist` must be one line.
- `Why` may have at most 3 bullets.
- `Options` may have at most 3 bullets.
- `Consequences` may have at most 3 bullets.
- `Follow-up` may have at most 3 bullets.
- If a section has no content, write `None`.
- No ADR should be longer than one screen.

## 10. docs/adr/README.md

Create:

```text
docs/adr/README.md
```

Content:

```md
# Architecture Decision Records

This folder contains short decision records for `stark-ai-de/agent-skills`.

ADRs must be short. The target is 120 to 180 words. The hard limit is 250 words.

## Rules

- Use `docs/adr/TEMPLATE.md`.
- Use filenames like `0001-use-open-agent-skills-spec.md`.
- Keep the decision to one sentence.
- Use bullets, not long paragraphs.
- Do not write ADRs for tiny edits.
- Do not rewrite accepted ADRs. Supersede them with a new ADR.

## Status values

- Proposed
- Accepted
- Superseded
- Deprecated
- Rejected

## Index

| ADR  | Status   | Decision                                                            |
| ---- | -------- | ------------------------------------------------------------------- |
| 0001 | Accepted | Use the open Agent Skills specification.                            |
| 0002 | Accepted | Publish through GitHub and validate/install with Vercel skills CLI. |
| 0003 | Accepted | Keep ADRs short and anti-bloat.                                     |
```

## 11. Initial ADRs

### 11.1 `docs/adr/0001-use-open-agent-skills-spec.md`

```md
# ADR-0001: Use the open Agent Skills specification

Status: Accepted  
Date: YYYY-MM-DD  
Owner: stark-ai-de  
Gist: The repo needs one portable skill format.

## Decision

We will use `https://agentskills.io/specification` as the normative format for all public skills.

## Why

- It defines `SKILL.md`, required frontmatter, and optional resource folders.
- It keeps the repo portable across Codex and other agents.
- It supports progressive disclosure, which keeps agent context smaller.

## Options

- Chosen: Agent Skills specification.
- Rejected: Codex-only format, because the repo should stay portable.
- Rejected: Custom format, because installers and agents may not discover it.

## Consequences

- Good: Skills are easier to install and validate.
- Tradeoff: Skill names and metadata must follow stricter rules.
- Risk: Some optional fields may not work in every agent.

## Follow-up

- Add validation for frontmatter and naming rules.
```

### 11.2 `docs/adr/0002-publish-through-github-and-vercel-skills-cli.md`

```md
# ADR-0002: Publish through GitHub and Vercel skills CLI

Status: Accepted  
Date: YYYY-MM-DD  
Owner: stark-ai-de  
Gist: Publishing should be simple and testable.

## Decision

We will publish skills from the public GitHub repo and validate discovery with the Vercel `skills` CLI.

## Why

- The CLI can list and install skills from GitHub repositories.
- Public GitHub publishing avoids a separate package registry for v1.
- Local folder testing catches install issues before release.

## Options

- Chosen: GitHub repo plus Vercel `skills` CLI.
- Rejected: npm package, because the skills are files, not a runtime package.
- Rejected: Private-only install, because the goal is a public skill repo.

## Consequences

- Good: Users can install with one command.
- Tradeoff: Repo structure must stay installer-friendly.
- Risk: CLI behavior may change, so release checks must test it.

## Follow-up

- Add publishing docs and release checklist.
```

### 11.3 `docs/adr/0003-keep-adrs-short.md`

```md
# ADR-0003: Keep ADRs short

Status: Accepted  
Date: YYYY-MM-DD  
Owner: stark-ai-de  
Gist: Decision records should not become documentation bloat.

## Decision

We will keep ADRs under 250 words and use a compact template.

## Why

- Short ADRs are more likely to be read.
- Repo decisions should be scannable by humans and agents.
- Long explanations belong in docs, not decision records.

## Options

- Chosen: Compact ADR template with strict limits.
- Rejected: Long-form ADRs, because they create maintenance drag.
- Rejected: No ADRs, because decisions would become implicit.

## Consequences

- Good: Decision history stays easy to scan.
- Tradeoff: Complex decisions need links to separate docs.
- Risk: Over-compression can omit nuance.

## Follow-up

- Add ADR validation script.
```

## 12. Add an `adr-writer` Skill

Add this skill:

```text
skills/repo-maintenance/adr-writer/SKILL.md
```

Frontmatter:

```yaml
---
name: adr-writer
description: Create short Architecture Decision Records under docs/adr. Use when the user makes a repo-level decision, changes skill format, publishing, validation, license, layout, or maintainer policy, and wants a concise ADR without documentation bloat.
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---
```

Core body:

```md
# ADR Writer

## Goal

Create a short ADR that records one repo-level decision.

## When to use

- A decision changes repo structure, publishing, validation, license, or skill standards.
- A previous ADR is superseded.
- The user asks to document a decision.

## When not to use

- Tiny copy edits.
- Routine skill additions that follow existing standards.
- Temporary implementation details.

## Workflow

1. Identify the single decision.
2. Check `docs/adr/README.md` and the latest ADR number.
3. Create the next `docs/adr/NNNN-short-title.md`.
4. Use `docs/adr/TEMPLATE.md`.
5. Keep the ADR under 250 words.
6. Update the ADR index.
7. Run ADR validation.

## Safety rules

- Do not write long ADRs.
- Do not rewrite accepted ADRs; create a superseding ADR instead.
- Do not document secrets or private internal details.

## Output format

Return:

1. ADR path
2. Decision sentence
3. Word count
4. Validation result
5. Recommended next action
```

## 13. Publishing Process

Publishing means:

```text
The repo is public on GitHub, installable by Vercel skills CLI, and validated by CI.
```

There is no npm package publishing step for v1.

### 13.1 Pre-publish checklist

Before public release:

```text
[ ] README.md includes install commands.
[ ] LICENSE exists.
[ ] SECURITY.md exists.
[ ] CONTRIBUTING.md exists.
[ ] CHANGELOG.md exists.
[ ] AGENTS.md exists.
[ ] docs/adr exists.
[ ] Initial ADRs exist.
[ ] Every skill has SKILL.md.
[ ] Every skill name matches folder name.
[ ] Every skill follows agentskills.io naming constraints.
[ ] Every description explains what and when.
[ ] No private paths, internal hostnames, customer data, or secrets.
[ ] No destructive scripts.
[ ] npm run validate passes.
[ ] npx skills add . --list works.
[ ] GitHub Actions validation passes.
```

### 13.2 Local validation

Run:

```bash
npm run validate
npm run list
npx skills add . --list
```

Test one install locally before publishing:

```bash
npx skills add . --skill repo-health-audit -a codex --copy -y
```

For global installation testing, only run after approval:

```bash
npx skills add . --skill repo-health-audit -g -a codex --copy -y
```

### 13.3 GitHub publishing

Create the public GitHub repository:

```text
stark-ai-de/agent-skills
```

Then:

```bash
git init
git add .
git commit -m "Initial agent skills repository"
git branch -M main
git remote add origin git@github.com:stark-ai-de/agent-skills.git
git push -u origin main
```

### 13.4 First release

Use semantic version tags for the repo:

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

### 13.5 Public install verification

After the repo is public:

```bash
npx skills add stark-ai-de/agent-skills --list
```

Install all skills globally for Codex:

```bash
npx skills add stark-ai-de/agent-skills -g -a codex
```

Install one skill globally for Codex:

```bash
npx skills add stark-ai-de/agent-skills --skill repo-health-audit -g -a codex
```

List installed skills:

```bash
npx skills list -g -a codex
```

Update installed skills:

```bash
npx skills update -g
```

Remove a skill:

```bash
npx skills remove repo-health-audit -g -a codex
```

### 13.6 Release update process

For every release:

1. Update skills.
2. Run `npm run validate`.
3. Run `npx skills add . --list`.
4. Update `CHANGELOG.md`.
5. Add ADR only if a decision changed.
6. Commit changes.
7. Tag version.
8. Push tag.
9. Create GitHub Release.
10. Verify public install.

## 14. README Publishing Section

Add this to `README.md`:

````md
## Install

List available skills:

```bash
npx skills add stark-ai-de/agent-skills --list
```
````

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

## Compatibility

This repo follows the open Agent Skills specification:

https://agentskills.io/specification

Each skill is a directory with a required `SKILL.md` file containing `name` and `description` frontmatter, plus optional `references/`, `scripts/`, and `assets/`.

## Decision Records

Repo-level decisions are documented in `docs/adr/`.

ADRs are intentionally short. The hard limit is 250 words.

````

## 15. package.json

Use:

```json
{
  "name": "agent-skills",
  "private": true,
  "type": "module",
  "scripts": {
    "list": "node scripts/list-skills.mjs",
    "validate": "npm run validate:skills && npm run validate:adrs",
    "validate:skills": "node scripts/validate-skills.mjs",
    "validate:adrs": "node scripts/validate-adrs.mjs",
    "adr:new": "node scripts/new-adr.mjs",
    "scaffold": "node scripts/scaffold-skill.mjs"
  },
  "devDependencies": {}
}
````

## 16. Skill Validation Script Requirements

Create:

```text
scripts/validate-skills.mjs
```

It must check:

```text
[ ] At least one SKILL.md exists.
[ ] Every SKILL.md starts with YAML frontmatter.
[ ] name exists.
[ ] description exists.
[ ] name matches parent folder.
[ ] name length is 1-64.
[ ] name uses lowercase letters, numbers, and hyphens only.
[ ] name does not start or end with hyphen.
[ ] name does not contain consecutive hyphens.
[ ] description length is 1-1024.
[ ] description includes "Use when" or equivalent trigger wording.
[ ] compatibility is <=500 chars if present.
[ ] SKILL.md is <=500 lines.
[ ] Long references are not required by default.
[ ] High-risk shell patterns are warned.
```

Minimum implementation:

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
  if (!match) return { text, data: null };

  const data = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i === -1) continue;
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
  const rel = path.relative(root, file);
  const parent = path.basename(path.dirname(file));
  const { text, data } = parseFrontmatter(file);

  if (!data) {
    errors.push(`${rel}: missing YAML frontmatter`);
    continue;
  }

  const name = data.name;
  const description = data.description;
  const compatibility = data.compatibility;

  if (!name) errors.push(`${rel}: missing name`);
  if (!description) errors.push(`${rel}: missing description`);

  if (name) {
    if (name !== parent) errors.push(`${rel}: name "${name}" must match folder "${parent}"`);
    if (name.length > 64) errors.push(`${rel}: name exceeds 64 characters`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      errors.push(`${rel}: invalid skill name; use lowercase letters, numbers, and single hyphens`);
    }
  }

  if (description) {
    if (description.length > 1024) errors.push(`${rel}: description exceeds 1024 characters`);
    if (description.length < 60)
      warnings.push(`${rel}: description is short; include trigger words`);
    if (!/\b(use when|when the user|asks?|mentions?|trigger)\b/i.test(description)) {
      warnings.push(`${rel}: description should say when to use the skill`);
    }
  }

  if (compatibility && compatibility.length > 500) {
    errors.push(`${rel}: compatibility exceeds 500 characters`);
  }

  const lines = text.split("\n").length;
  if (lines > 500) warnings.push(`${rel}: SKILL.md is over 500 lines; move detail to references/`);

  if (/read all references/i.test(text)) {
    warnings.push(`${rel}: avoid requiring all references by default`);
  }
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

for (const file of walkAll(skillsDir)) {
  const normalized = file.replaceAll("\\", "/");
  if (!normalized.includes("/scripts/")) continue;

  const text = fs.readFileSync(file, "utf8");
  if (/\brm\s+-rf\b|\bsudo\b|\bcurl\b.*\|\s*(sh|bash)|\bwget\b.*\|\s*(sh|bash)/.test(text)) {
    warnings.push(`${path.relative(root, file)}: high-risk shell pattern; review carefully`);
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

## 17. ADR Validation Script Requirements

Create:

```text
scripts/validate-adrs.mjs
```

It must check:

```text
[ ] docs/adr exists.
[ ] docs/adr/README.md exists.
[ ] docs/adr/TEMPLATE.md exists.
[ ] ADR filenames match NNNN-kebab-title.md.
[ ] ADRs contain Status, Date, Owner, and Gist.
[ ] Status is allowed.
[ ] ADR body is <=250 words, excluding title and metadata.
[ ] Decision section exists.
[ ] Decision section is not a long paragraph.
[ ] No ADR has paragraphs over 55 words.
```

Minimum implementation:

```js
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adrDir = path.join(root, "docs", "adr");
const errors = [];
const warnings = [];
const allowedStatuses = new Set(["Proposed", "Accepted", "Superseded", "Deprecated", "Rejected"]);

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

if (!fs.existsSync(adrDir)) {
  errors.push("docs/adr directory is missing");
} else {
  for (const required of ["README.md", "TEMPLATE.md"]) {
    if (!fs.existsSync(path.join(adrDir, required))) {
      errors.push(`docs/adr/${required} is missing`);
    }
  }

  const files = fs
    .readdirSync(adrDir)
    .filter((file) => /^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(file));

  if (files.length === 0) {
    warnings.push("No ADR files found");
  }

  for (const file of files) {
    const full = path.join(adrDir, file);
    const rel = path.relative(root, full);
    const text = fs.readFileSync(full, "utf8");

    if (!/^# ADR-\d{4}: .+/m.test(text)) {
      errors.push(`${rel}: missing title like "# ADR-0001: Title"`);
    }

    const status = text.match(/^Status:\s*(.+)$/m)?.[1]?.trim();
    const normalizedStatus = status?.replace(/\s+by\s+ADR-\d+$/i, "");

    if (!status) {
      errors.push(`${rel}: missing Status`);
    } else if (!allowedStatuses.has(normalizedStatus)) {
      errors.push(`${rel}: invalid Status "${status}"`);
    }

    for (const field of ["Date", "Owner", "Gist"]) {
      if (!new RegExp(`^${field}:\\s+.+$`, "m").test(text)) {
        errors.push(`${rel}: missing ${field}`);
      }
    }

    if (!/^## Decision/m.test(text)) {
      errors.push(`${rel}: missing Decision section`);
    }

    const body = text
      .replace(/^# .+$/m, "")
      .replace(/^Status:.+$/m, "")
      .replace(/^Date:.+$/m, "")
      .replace(/^Owner:.+$/m, "")
      .replace(/^Gist:.+$/m, "");

    const count = words(body).length;
    if (count > 250) errors.push(`${rel}: ADR body has ${count} words; limit is 250`);
    if (count > 180) warnings.push(`${rel}: ADR body has ${count} words; target is 120-180`);

    const paragraphs = body
      .split(/\n{2,}/)
      .map((p) => p.replace(/^[-*]\s+/gm, "").trim())
      .filter((p) => p && !p.startsWith("##"));

    for (const paragraph of paragraphs) {
      const count = words(paragraph).length;
      if (count > 55) {
        errors.push(`${rel}: paragraph has ${count} words; limit is 55`);
      }
    }
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

console.log("ADRs validated.");
```

## 18. ADR Creation Script

Create:

```text
scripts/new-adr.mjs
```

Required behavior:

```bash
npm run adr:new "Use category-based skill folders"
```

It should:

- Find the highest ADR number.
- Create the next file.
- Convert title to kebab-case.
- Copy the template.
- Replace `ADR-0000` with the next number.
- Replace title.
- Fill date with today.
- Refuse to overwrite existing files.

Suggested implementation can be added by Codex during setup.

## 19. GitHub Actions

Create:

```text
.github/workflows/validate.yml
```

Content:

```yaml
name: Validate

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

      - run: npx skills add . --list
```

## 20. Skill Catalog Changes for v2

Add or keep these initial skills:

```text
codex-context-guard
codex-memory-curator
agent-context-bootstrap
adr-writer
repo-health-audit
issue-triage
pr-review
release-manager
dependency-update-review
ci-debugger
docs-audit
security-baseline-review
skill-authoring-review
skill-repo-curator
skill-installation-support
handoff
grill-plan
```

### 20.1 Recommended v2 implementation order

```text
1. skill-authoring-review
2. skill-repo-curator
3. adr-writer
4. codex-context-guard
5. handoff
6. repo-health-audit
7. agent-context-bootstrap
8. issue-triage
9. pr-review
10. release-manager
11. docs-audit
12. codex-memory-curator
13. ci-debugger
14. dependency-update-review
15. security-baseline-review
16. skill-installation-support
17. grill-plan
```

Reason:

```text
First make the skill repo easy to validate.
Then make repo decisions explicit with ADRs.
Then add Codex/context survival workflows.
Then add maintainer workflows.
```

## 21. Top-Level AGENTS.md

Create:

```text
AGENTS.md
```

Content:

```md
# Agent Instructions

This repository contains public Agent Skills.

## Rules

- Follow the Agent Skills specification: https://agentskills.io/specification.
- Every skill must have `SKILL.md` with valid `name` and `description`.
- Skill folder names must match frontmatter names.
- Keep `SKILL.md` concise and operational.
- Move long examples, rubrics, and templates into `references/` or `assets/`.
- Do not include secrets, tokens, customer data, private repo paths, or internal hostnames.
- Prefer read-only scripts. Any modifying script must be clearly documented.
- Document repo-level decisions in `docs/adr/`.
- ADRs must be short. The hard limit is 250 words.
- Do not copy skill text from other repos. Use public repos only as inspiration.
- Run `npm run validate` before finalizing changes.
```

## 22. SECURITY.md

Create:

````md
# Security Policy

Skills are executable context. Some skills may include scripts.

## Reporting security issues

Report security issues through GitHub private vulnerability reporting or contact:

```text
security@stark.ai
```
````

Replace this address if needed.

## Contributor rules

- Do not submit secrets or credentials.
- Do not include destructive scripts.
- Do not include scripts that exfiltrate data.
- Do not include private infrastructure details.
- Do not add dependencies unless necessary.
- Do not print secrets in reports or logs.

````

## 23. CONTRIBUTING.md

Must include:

```text
Skill naming rules
Frontmatter rules
Description quality rules
Progressive disclosure rules
ADR rules
Safety rules
Validation commands
Publishing checklist
PR checklist
Deprecation policy
````

PR checklist:

```md
## PR checklist

- [ ] Skill names match folder names.
- [ ] Descriptions include trigger words.
- [ ] `SKILL.md` files are concise.
- [ ] Long examples are in `references/` or `assets/`.
- [ ] Scripts are safe and documented.
- [ ] ADR added if a repo-level decision changed.
- [ ] `npm run validate` passes.
- [ ] `npx skills add . --list` works.
```

## 24. CHANGELOG.md

Use:

```md
# Changelog

## Unreleased

### Added

### Changed

### Fixed

### Deprecated

### Removed
```

## 25. Validation Plan

### 25.1 Static validation

```bash
npm run validate
```

Expected:

```text
Validated N skill(s).
ADRs validated.
```

### 25.2 Skills CLI discovery

```bash
npx skills add . --list
```

Expected:

```text
The CLI lists available skills from the local repo.
```

### 25.3 Public discovery

After pushing public repo:

```bash
npx skills add stark-ai-de/agent-skills --list
```

Expected:

```text
The CLI lists available public skills.
```

### 25.4 Codex install smoke test

```bash
npx skills add stark-ai-de/agent-skills --skill repo-health-audit -g -a codex
npx skills list -g -a codex
```

Expected:

```text
repo-health-audit is installed for Codex.
```

## 26. Acceptance Criteria

The v2 repo setup is complete when:

```text
[ ] agentskills.io is named as the normative spec in README and ADR-0001.
[ ] The repo follows Agent Skills frontmatter and naming rules.
[ ] Vercel skills CLI publishing/install commands are documented.
[ ] docs/adr exists.
[ ] ADR template exists.
[ ] Initial three ADRs exist.
[ ] ADR validation exists.
[ ] Skill validation exists.
[ ] GitHub Actions validation exists.
[ ] README has install, update, and compatibility sections.
[ ] At least first five skills exist.
[ ] npm run validate passes.
[ ] npx skills add . --list works.
[ ] No private data or destructive scripts are present.
```

## 27. Codex CLI Implementation Prompt

Use this prompt in Codex CLI:

```text
Set up `stark-ai-de/agent-skills` from this v2 spec.

Requirements:
- Follow https://agentskills.io/specification as the normative skill format.
- Use `skills/<category>/<skill-name>/SKILL.md`.
- Add README, LICENSE, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md, AGENTS.md.
- Add docs/adr with README, TEMPLATE, and ADRs 0001-0003.
- ADRs must be short. Hard limit: 250 words. Do not bloat them.
- Add validation scripts:
  - scripts/validate-skills.mjs
  - scripts/validate-adrs.mjs
  - scripts/list-skills.mjs
  - scripts/new-adr.mjs
  - scripts/scaffold-skill.mjs
- Add package.json scripts.
- Add GitHub Actions validation.
- Add initial skills in the recommended v2 order.
- Keep SKILL.md files concise and operational.
- Put long rubrics in references/.
- Prefer read-only scripts.
- Do not include secrets, private paths, internal hostnames, or customer details.

After setup:
1. Show the final file tree.
2. Run `npm run validate`.
3. Run `npm run list`.
4. Run `npx skills add . --list`.
5. Do not push, tag, publish, or install globally without approval.
```

## 28. Source Notes

This spec is based on:

- Open Agent Skills specification: `https://agentskills.io/specification`
- Vercel skills CLI: `https://github.com/vercel-labs/skills`
- Planguage-style decision record template: `https://github.com/architecture-decision-record/architecture-decision-record/tree/main/locales/en/templates/decision-record-template-using-planguage`
- pmerson ADR template: `https://github.com/pmerson/ADR-template/blob/master/ADR-template.md`

The ADR template here is intentionally shorter than the referenced templates. The repo rule is: decision records must help future maintainers, not become documentation bloat.

## 29. Recommended Next Action

Hand this spec to Codex CLI and ask it to scaffold the repo. Implement the first five skills, then validate local discovery with:

```bash
npm run validate
npx skills add . --list
```
