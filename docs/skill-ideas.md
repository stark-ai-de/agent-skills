# Skill Ideas

This page collects possible future public skills before they become specs, issues, or implementation work.

Keep entries short and original. Before promoting an idea into `skills/`, check it against the design principles, out-of-scope notes, and the existing catalog.

IDs are stable references. Add new ideas with the next ID instead of renumbering existing entries.

## Index

| ID       | Idea                                                                                       | Category                | Related                      | Focus                                                                      |
| -------- | ------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| IDEA-001 | [Skill Inventory Organizer](#idea-001-skill-inventory-organizer)                           | `skill-maintenance`     | `skill-installation-support` | Find duplicate, stale, or misplaced skill installs.                        |
| IDEA-002 | [Agent Skills Spec Checker](#idea-002-agent-skills-spec-checker)                           | `skill-maintenance`     | `skill-authoring-review`     | Check skills against the open Agent Skills specification.                  |
| IDEA-003 | [Transparent Background Layer Extractor](#idea-003-transparent-background-layer-extractor) | `productivity`          | None                         | Remove image backgrounds through layer extraction and transparent exports. |
| IDEA-004 | [Automation Opportunity Scout](#idea-004-automation-opportunity-scout)                     | `productivity`          | None                         | Detect repeated developer work and propose automation.                     |
| IDEA-005 | [GitHub README Showcase Builder](#idea-005-github-readme-showcase-builder)                 | `repo-maintenance`      | `docs-audit`                 | Build richer GitHub READMEs with supported visual features.                |
| IDEA-006 | [1Password Env Connector](#idea-006-1password-env-connector)                               | `repo-maintenance`      | None                         | Connect project env contracts to 1Password references safely.              |
| IDEA-007 | [Skill-to-Script Compiler](#idea-007-skill-to-script-compiler)                             | `skill-maintenance`     | `skill-authoring-review`     | Move deterministic skill steps into reusable scripts.                      |
| IDEA-008 | [Skill Update Notifier](#idea-008-skill-update-notifier)                                   | `skill-maintenance`     | `skill-installation-support` | Notify users about available skill updates before use.                     |
| IDEA-009 | [Commit Syntax Preference Manager](#idea-009-commit-syntax-preference-manager)             | `repo-maintenance`      | IDEA-007                     | Capture and enforce preferred commit message conventions.                  |
| IDEA-010 | [WASM Upgrade Advisor](#idea-010-wasm-upgrade-advisor)                                     | `engineering-workflows` | `prototype-spike`            | Recommend WASM ports only when workload shape justifies them.              |
| IDEA-011 | [Agent Output Budget Review](#idea-011-agent-output-budget-review)                         | `skill-maintenance`     | `skill-authoring-review`     | Check whether a skill's output contract is concise without losing safety.  |
| IDEA-012 | [Safe Context File Compressor](#idea-012-safe-context-file-compressor)                     | `codex-operations`      | `codex-memory-curator`       | Reduce recurring context files only after safety and preservation checks.  |
| IDEA-013 | [Commit Message Writer](#idea-013-commit-message-writer)                                   | `repo-maintenance`      | IDEA-009                     | Draft concise commit messages that match discovered repository convention. |
| IDEA-014 | [Release Changelog Operator](#idea-014-release-changelog-operator)                         | `repo-maintenance`      | None                         | Prepare changelog entries and release readiness checks from repo evidence. |
| IDEA-015 | [Stark AI Skills Setup Assistant](#idea-015-stark-ai-skills-setup-assistant)               | `skill-maintenance`     | IDEA-001                     | Help install and verify the `stark-ai-de/agent-skills` stack safely.       |

## IDEA-001: Skill Inventory Organizer

- **Status:** Idea
- **Possible category:** `skill-maintenance`
- **Related current skill:** `skill-installation-support`

### Problem

Users can install skills globally and project-locally across multiple agent runtimes, then lose track of duplicates, stale copies, and source provenance.

### Candidate Behavior

- Check whether a requested skill is already installed globally for the target runtime.
- Compare global and project-local installs where the runtime exposes a stable skills directory.
- Report duplicate skill names, ambiguous versions, missing source metadata, and stale lockfile entries.
- Recommend organization steps, such as keeping broadly useful skills global and repo-specific helper skills local.
- Require explicit approval before running commands that install, update, remove, or overwrite skills.

### Open Questions

- Which global install paths are stable across Codex, Claude Code, Cursor, and Vercel skills CLI targets?
- Does `npx skills` expose enough machine-readable listing output, or should this rely on read-only filesystem checks?
- Should this become a new skill, or should part of it live as a reference or script under `skill-installation-support`?

## IDEA-002: Agent Skills Spec Checker

- **Status:** Idea
- **Possible category:** `skill-maintenance`
- **Source references:** [Agent Skills specification](https://agentskills.io/specification), [agentskills/agentskills](https://github.com/agentskills/agentskills)
- **Related current skill:** `skill-authoring-review`

### Problem

Skill authors need a repeatable way to check whether a skill follows the open Agent Skills format before publishing, sharing, or installing it.

### Candidate Behavior

- Validate that each skill directory has a `SKILL.md` file with required `name` and `description` frontmatter.
- Check name constraints, folder-name matching, description length, optional frontmatter fields, and known optional directories.
- Inspect `SKILL.md` size and structure for progressive disclosure risks, including long instructions that should move into `references/` or `assets/`.
- Run or recommend the official reference validator when available.
- Offer an enforcement mode that can propose fixes, but require explicit approval before editing files.

### Open Questions

- Should this be a standalone skill, or a stricter mode/reference under `skill-authoring-review`?
- Should enforcement be limited to spec compliance, or also include this repository's stricter style rules?
- What should the skill do when the public specification changes after the bundled instructions were written?

## IDEA-003: Transparent Background Layer Extractor

- **Status:** Idea
- **Possible category:** `productivity`
- **Related current skill:** None

### Problem

Users often need image backgrounds removed while preserving useful foreground shapes, but background removal quality varies by image type and toolchain.

### Candidate Behavior

- Inspect a source image and decide whether it is suitable for layer extraction, vector tracing, or a raster mask workflow.
- Convert separable regions into SVG layers when the image has clear shapes, flat colors, or strong edges.
- Remove or isolate likely background layers while preserving a copy of the original image.
- Export a transparent PNG or SVG result with a reviewable intermediate artifact.
- Require explicit approval before overwriting, deleting, or batch-processing image files.

### Open Questions

- Should this skill target flat graphics and logos first, rather than natural photos?
- Which local tools should be preferred for tracing and masking, such as ImageMagick, Potrace, or browser-based SVG processing?
- Should the skill generate editable SVG layers as the primary output, or treat them as an intermediate step toward transparent raster output?

## IDEA-004: Automation Opportunity Scout

- **Status:** Idea
- **Possible category:** `productivity`
- **Related current skill:** None

### Problem

Developers often repeat the same review, setup, debugging, reporting, or release tasks before noticing that the workflow deserves automation.

### Candidate Behavior

- Ask for or inspect recent task evidence, such as repeated commands, issue comments, review notes, scripts, or handoff files.
- Identify repeated manual steps, recurring decision points, and tasks that depend on memory instead of a documented workflow.
- Recommend the smallest useful automation: a new skill, local script, template, checklist, CI job, or documentation update.
- Draft a short candidate skill brief when a repeated workflow needs agent guidance rather than only a script.
- Avoid proposing automation when the task is rare, unstable, sensitive, or cheaper to keep manual.

### Open Questions

- What evidence threshold should justify a new skill instead of a one-off note or script?
- Should this skill inspect shell history or agent memory, or only user-provided examples and repository files?
- How should it handle private workflow details when the target output might become part of a public skill catalog?

## IDEA-005: GitHub README Showcase Builder

- **Status:** Idea
- **Possible category:** `repo-maintenance`
- **Related current skill:** `docs-audit`

### Problem

Repository READMEs often explain the project but miss the chance to present it clearly, visually, and memorably within GitHub's Markdown renderer.

### Candidate Behavior

- Review an existing README and identify where richer presentation would improve scanning, onboarding, or trust.
- Produce GitHub-compatible README sections using animated SVGs, Mermaid diagrams, LaTeX math, and collapsible `<details>` blocks where they add clarity.
- Recommend direct video uploads or linked demos when motion communicates the project better than screenshots.
- Keep generated visuals accessible, lightweight, source-controlled, and understandable without relying on animation alone.
- Preserve technical accuracy and install instructions instead of replacing them with purely decorative content.

### Open Questions

- Should this skill generate assets directly, or draft a README plan plus asset prompts for a separate image or video workflow?
- Which GitHub-rendered features should be treated as stable enough for default use?
- How should it balance polished presentation with concise maintainer docs for libraries, CLIs, apps, and research projects?

## IDEA-006: 1Password Env Connector

- **Status:** Idea
- **Possible category:** `repo-maintenance`
- **Related current skill:** None

### Problem

Projects often need environment variables stored in 1Password, but setup instructions drift between `.env.example`, local developer machines, CI settings, and runtime deployment targets.

### Candidate Behavior

- Inspect a project's environment contract, such as `.env.example`, typed env schemas, README setup notes, and deployment docs.
- Map required variables to 1Password item references without exposing, printing, or committing secret values.
- Recommend safe local workflows, such as shell injection, generated ignored env files, or runtime wrappers.
- Identify missing docs, stale variable names, CI/deployment gaps, and unsafe secret handling.
- Require explicit approval before creating, updating, or deleting 1Password items, env files, or CI secrets.

### Open Questions

- Should this skill assume the 1Password CLI is available, or only produce setup instructions unless the user confirms authentication?
- Which targets should be supported first: local development, GitHub Actions, Vercel, Docker Compose, or generic deployment docs?
- Should the skill manage only references and templates, or also verify live access to required 1Password vault items?

## IDEA-007: Skill-to-Script Compiler

- **Status:** Idea
- **Possible category:** `skill-maintenance`
- **Related current skill:** `skill-authoring-review`

### Problem

Some skills describe workflows that become predictable over time, but agents keep re-executing them manually instead of turning the deterministic parts into scripts.

### Candidate Behavior

- Inspect a skill and separate judgment-heavy steps from deterministic checks, transforms, or report generation.
- Generate a small script for deterministic work with explicit inputs, stable output, dry-run behavior where useful, and clear failure messages.
- Update the skill workflow to call or recommend the script instead of re-describing manual execution.
- Run the generated script for the current task when the user has approved script creation and execution.
- Require explicit approval before writing scripts, changing skill instructions, or running scripts that mutate files or external systems.

### Open Questions

- Which script languages should be preferred for portability across public skills repositories?
- How should the skill prove that a workflow step is deterministic enough to move into a script?
- Should generated scripts live beside the source skill, in repo-level `scripts/`, or in a project-local helper location?

## IDEA-008: Skill Update Notifier

- **Status:** Idea
- **Possible category:** `skill-maintenance`
- **Related current skill:** `skill-installation-support`

### Problem

Users may rely on globally or project-locally installed skills without knowing when the source repository has a newer version or important fix available.

### Candidate Behavior

- Inspect the requested skill's installed source, scope, target runtime, and available version or commit metadata.
- Check the upstream source for newer versions, commits, tags, or lockfile changes before the skill is used.
- Notify the user when an update is available, including a concise summary of what would change when that information is available.
- Offer a copy-pasteable install or update command for the same scope and target runtime.
- Require explicit approval before running any install, update, overwrite, or global mutation command.

### Open Questions

- Which metadata should be trusted for version comparison: package version, skill frontmatter, repository tag, commit hash, or `skills-lock.json` entry?
- Should update checks run every time a skill is invoked, only on demand, or on a configurable cadence?
- How should the skill handle private repositories, offline work, and sources without tags or release notes?

## IDEA-009: Commit Syntax Preference Manager

- **Status:** Idea
- **Possible category:** `repo-maintenance`
- **Related idea:** `IDEA-007: Skill-to-Script Compiler`

### Problem

Developers and agents often produce inconsistent commit messages when a repository expects Linear ticket IDs, Conventional Commits, commitlint rules, emoji prefixes, or another preferred style.

### Candidate Behavior

- Ask the user or inspect the repo for the preferred commit syntax, including issue tracker IDs, emoji usage, scopes, commitlint config, and examples from recent history.
- Save or document the chosen convention in a repo-local place so future agents can follow it consistently.
- Draft commit messages that match the convention and explain any uncertainty before commit creation.
- Generate a deterministic checker or helper script, when approved, to validate or assemble commit messages from structured inputs.
- Require explicit approval before writing hooks, scripts, config, or creating commits.

### Open Questions

- Should the preference be stored in `AGENTS.md`, a repo docs file, package config, git hooks, or a dedicated helper script?
- Should the generated script validate existing commit messages, generate new ones, or both?
- How should the skill handle mixed conventions, such as Conventional Commits plus Linear ticket IDs plus optional emoji prefixes?

## IDEA-010: WASM Upgrade Advisor

- **Status:** Idea
- **Possible category:** `engineering-workflows`
- **Related current skill:** `prototype-spike`

### Problem

Teams can overuse WebAssembly for small JavaScript-native logic or miss high-value WASM upgrades for heavy client-side workloads.

### Candidate Behavior

- Inspect a proposed web workload and classify whether it fits a WASM upgrade pattern.
- Recommend WASM when the input is a large buffer, dataset, or file; the process is a heavy algorithm; the output is compact; execution is batch-oriented; and the work can run in a Web Worker.
- Avoid WASM when the input and output are tiny JavaScript objects, the process is small business logic, calls happen thousands of times, or the work stays on the main UI thread.
- Prefer high-confidence upgrade paths such as SQLite WASM or wa-sqlite with OPFS in a Web Worker, DuckDB WASM for analytics, ONNX Runtime Web for local AI, ffmpeg.wasm or image codecs for media, Pyodide for scientific tooling, and Rust/C/C++ WASM for custom parsers, compression, crypto, search, or simulation.
- Recommend batched communication between the UI and worker, especially for local data, offline search, large caches, or complex client-side queries.

### Open Questions

- Should this skill be advisory only, or should it scaffold worker boundaries and benchmark harnesses?
- Which WASM libraries should be treated as default recommendations versus project-specific research targets?
- How should it measure whether a WASM port improves user-perceived performance after serialization and worker overhead?

## IDEA-011: Agent Output Budget Review

- **Status:** Idea
- **Possible category:** `skill-maintenance`
- **Related current skill:** `skill-authoring-review`

### Problem

Skills can produce long, vague, or overly conversational outputs that consume context and bury the actionable artifact, but optimizing only for brevity can remove safety detail or rationale.

### Candidate Behavior

- Inspect a skill's output format, examples, eval cases, and reference docs.
- Identify where output can become shorter through tables, stable receipts, severity lines, path-first findings, or bounded summaries.
- Flag places where brevity would be unsafe, such as security warnings, destructive operations, migrations, and onboarding explanations.
- Recommend output contracts that preserve exact identifiers, file paths, validation results, and remaining risk.
- Require quality assertions before making token-savings claims.

### Open Questions

- Should this be a standalone skill or a rubric section inside `skill-authoring-review`?
- Which output-length metrics are useful without making skills optimize for word count alone?
- Should token-budget checks belong in `skill-evals/`, validation scripts, or human review only?

## IDEA-012: Safe Context File Compressor

- **Status:** Idea
- **Possible category:** `codex-operations`
- **Related current skill:** `codex-memory-curator`

### Problem

Agents repeatedly load large context files such as `AGENTS.md`, memory notes, handoffs, and repository guidance. Shrinking these files can save context, but unsafe compression can drop instructions, corrupt code blocks, or expose secrets to external services.

### Candidate Behavior

- Inspect candidate files and classify whether they are safe to compress.
- Produce a preservation report for headings, code blocks, inline code, URLs, paths, commands, env vars, dates, and security-sensitive terms before any rewrite.
- Recommend a compressed draft that keeps technical meaning and flags ambiguous reductions for human review.
- Keep backups and require explicit approval before overwriting any file.
- Refuse suspected secret files, credential paths, private keys, and sensitive customer data.

### Open Questions

- Should this skill be read-only by default with no bundled rewrite script?
- Should compression use only the current agent context, or is an external model/API ever acceptable?
- Where should backups live so compressed context files do not create stale duplicate instructions?

## IDEA-013: Commit Message Writer

- **Status:** Idea
- **Possible category:** `repo-maintenance`
- **Related idea:** `IDEA-009: Commit Syntax Preference Manager`

### Problem

Agents often write commit messages that are too long, too generic, or mismatched with a repository's actual convention.

### Candidate Behavior

- Inspect staged diff summary, recent commit history, commitlint config, issue tracker conventions, and repository instructions.
- Draft one or more commit messages that match the discovered convention.
- Prefer the reason for the change over a file-by-file description when the diff already explains the mechanics.
- Include a body only when the reason, migration impact, security context, breaking change, or linked issue is not obvious.
- Do not stage, commit, amend, or push unless the user separately authorizes the git operation.

### Open Questions

- Should this be a standalone skill or an execution mode of `Commit Syntax Preference Manager`?
- How should it handle repositories with multiple valid conventions?
- Should validation include a deterministic commitlint check when the repo provides one?

## IDEA-014: Release Changelog Operator

- **Status:** Idea
- **Possible category:** `repo-maintenance`
- **Related current skill:** None

### Problem

Maintainers often delay releases because changelog entries, release notes, version checks, validation commands, and approval boundaries are scattered across commits, PRs, issues, package metadata, and workflow docs.

### Candidate Behavior

- Inspect recent commits, merged PRs, issue links, package metadata, existing changelog style, and release workflow docs.
- Draft changelog entries grouped by user impact, fixes, docs, internal maintenance, and breaking changes when the repo uses those categories.
- Check release readiness gates, such as version bump, changelog section, validation status, tag naming, publish workflow inputs, and unresolved TODOs.
- Produce a release checklist and copy-pasteable release notes without creating tags, releases, commits, or workflow dispatches automatically.
- Require explicit approval before changing changelog files, version files, tags, releases, or CI/CD workflow state.

### Open Questions

- Should this be one release operator skill, or split into a changelog-only skill and a release-readiness skill?
- Which sources should be authoritative when commit history, PR titles, issue labels, and changelog conventions disagree?
- Should the first version target GitHub Releases and npm-style packages, or stay generic across repositories?

## IDEA-015: Stark AI Skills Setup Assistant

- **Status:** Idea
- **Possible category:** `skill-maintenance`
- **Related idea:** `IDEA-001: Skill Inventory Organizer`

### Problem

Users may want the `stark-ai-de/agent-skills` workflow available in a project or globally, but setup can be unclear across Codex, Claude Code, Cursor, OpenCode, and other runtimes with different local skill paths.

### Candidate Behavior

- Detect the current repo, installed agent runtimes, existing project-local skills, and global skill installs where paths are stable.
- Recommend the correct `npx skills add https://github.com/stark-ai-de/agent-skills ...` command for the requested scope, agent, and skill selection.
- Verify that `codex-spec-interviewer` or other selected Stark AI skills are discoverable after install.
- Explain when to use project-local install, global install, `--copy`, or explicit `--agent` flags.
- Require explicit approval before running install, update, remove, overwrite, or global mutation commands.

### Open Questions

- Should this be a public skill, or a repo-local helper for maintainers and Stark AI projects only?
- Should it install only promoted public skills, or also support incubator skills behind an explicit internal flag?
- How should it avoid confusing this repository's public catalog with ignored `.agents/skills/` helper installs?
