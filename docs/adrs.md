# Architecture Decision Records

This file documents ADR policy and the ADR index for `stark-ai-de/agent-skills`. ADR files live in [`docs/adrs/`](adrs/README.md).

ADRs must be short. The target is 120 to 180 words. The hard limit is 250 words.

## Rules

- Use `docs/adrs/TEMPLATE.md`.
- Use filenames like `0001-use-open-agent-skills-spec.md`.
- Keep the decision to one sentence.
- Use bullets, not long paragraphs.
- Do not write ADRs for tiny edits.
- After initial setup, do not rewrite accepted ADRs. Supersede them with a new ADR.

## Spec Linkage

For implementation spec persistence and ADR linkage, see [`docs/specs.md`](specs.md).

## Status Values

- Proposed
- Accepted
- Superseded
- Deprecated
- Rejected

## Index

| ADR  | Status     | Decision                                                            |
| ---- | ---------- | ------------------------------------------------------------------- |
| 0001 | Accepted   | Use the open Agent Skills specification.                            |
| 0002 | Accepted   | Publish through GitHub and validate/install with Vercel skills CLI. |
| 0003 | Accepted   | Keep ADRs short and anti-bloat.                                     |
| 0004 | Accepted   | Start with an empty promoted-only public catalog.                   |
| 0005 | Accepted   | License the public catalog under Apache-2.0.                        |
| 0006 | Accepted   | Use the incubator as the default home for skill candidates.         |
| 0007 | Accepted   | Treat skill evals as maintainer proof, not default runtime content. |
| 0008 | Accepted   | Promotion requires value and maintainability, not just evals.       |
| 0009 | Accepted   | Hide incubator skills from normal CLI discovery.                    |
| 0010 | Accepted   | Ignore local helper installs and helper lockfiles.                  |
| 0011 | Superseded | Use manual release workflows.                                       |
| 0012 | Accepted   | Use the `agent-skills` repository slug.                             |
| 0013 | Accepted   | Persist specs and ADRs as repo artifacts.                           |
| 0014 | Accepted   | Prefer Node skill helper scripts for public skill portability.      |
| 0015 | Accepted   | Prepare releases in change PRs.                                     |
| 0016 | Accepted   | Use OpenAI metadata for Codex-facing skills.                        |
| 0017 | Accepted   | Use Astro for the GitHub Pages skill catalog.                       |
| 0018 | Accepted   | Use Bun runtime and pnpm package manager guidance.                  |
| 0019 | Accepted   | Use native TypeScript tooling in Architecture Compass guidance.     |
| 0020 | Accepted   | Use Oxc for formatting and linting.                                 |
| 0021 | Accepted   | Place portable public skills in workflow categories.                |
| 0022 | Accepted   | Allow dependency-free Python helpers by exception.                  |
| 0023 | Proposed   | Use a local SkillOpt workspace for Agent Skill optimization.        |
| 0024 | Accepted   | Keep Architecture Compass portable with host mode adapters.         |
