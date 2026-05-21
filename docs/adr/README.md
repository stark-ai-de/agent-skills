# Architecture Decision Records

This folder contains short decision records for `stark-ai-de/skills`.

ADRs must be short. The target is 120 to 180 words. The hard limit is 250 words.

## Rules

- Use `docs/adr/TEMPLATE.md`.
- Use filenames like `0001-use-open-agent-skills-spec.md`.
- Keep the decision to one sentence.
- Use bullets, not long paragraphs.
- Do not write ADRs for tiny edits.
- After initial setup, do not rewrite accepted ADRs. Supersede them with a new ADR.

## Status Values

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
| 0004 | Accepted | Start with an empty promoted-only public catalog.                   |
| 0005 | Accepted | License the public catalog under Apache-2.0.                        |
| 0006 | Accepted | Use the incubator as the default home for skill candidates.         |
| 0007 | Accepted | Treat skill evals as maintainer proof, not default runtime content. |
| 0008 | Accepted | Promotion requires value and maintainability, not just evals.       |
| 0009 | Accepted | Hide incubator skills from normal CLI discovery.                    |
| 0010 | Accepted | Ignore local helper installs and helper lockfiles.                  |
| 0011 | Accepted | Use manual release workflows.                                       |
