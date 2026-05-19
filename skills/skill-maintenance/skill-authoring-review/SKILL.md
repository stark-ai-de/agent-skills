---
name: skill-authoring-review
description: Create or review Agent Skills with correct SKILL.md frontmatter, trigger descriptions, concise workflow design, progressive disclosure, references, scripts, assets, safety rules, and installability. Use when writing a new skill, improving an existing skill, or validating a public skills repo.
license: MIT
metadata:
  author: stark-ai-de
  category: skill-maintenance
  version: "0.1.0"
---

# Skill Authoring Review

## Goal

Create or review an Agent Skill so another agent can use it reliably with minimal context, clear routing, safe bundled resources, and a concrete output contract.

## When to use

- The user asks to create, rewrite, or review a skill.
- A public skill repository needs an installability or quality check.
- A skill has vague triggers, oversized instructions, unsafe scripts, or missing artifacts.

## When not to use

- The user is asking to execute a domain workflow that an existing skill already covers.
- The task is ordinary repository review with no skill authoring surface.
- The user only needs installation help; use `skill-installation-support`.

## Inputs to inspect

- `SKILL.md` frontmatter and body.
- `references/`, `scripts/`, `assets/`, and `agents/` folders.
- README catalog entries and install commands when reviewing a repo.
- Validation output from `npm run validate` or an equivalent checker.

## Review rubric

Check that `name` matches the folder, uses lowercase hyphen-case, and appears with a clear `description`. The description must front-load trigger words because it is the routing surface. The body should state goal, scope, workflow, safety rules, output format, completion criteria, and failure modes.

Read `references/skill-quality-rubric.md` when doing a scored review. Read `references/frontmatter-examples.md` when rewriting descriptions.

## Workflow

1. Inspect the skill path and identify the intended workflow.
2. Validate frontmatter syntax, name matching, and description routing quality.
3. Check progressive disclosure: keep core steps in `SKILL.md` and move long examples or rubrics into references.
4. Review scripts for deterministic behavior, clear documentation, and safe defaults.
5. Verify output artifacts are concrete enough for a future agent to act on.
6. Run available validation commands when working in a repository.
7. Return blocking issues first, followed by improvements and a concise rewrite plan.

## Safety rules

- Do not copy proprietary or unclear-license skill text into a public skill.
- Do not add scripts that mutate files, call services, or install globally without an approval gate.
- Keep secrets, private repo paths, customer data, and internal hostnames out of examples.

## References

Read only when needed:

- `references/frontmatter-examples.md`
- `references/skill-quality-rubric.md`

## Scripts

No bundled scripts.

## Output format

Return:

1. Verdict
2. Blocking issues
3. Non-blocking improvements
4. Suggested frontmatter or section rewrites
5. Validation result
6. Remaining risks

## Failure modes

- If the skill purpose is unclear, ask for concrete trigger examples before rewriting.
- If scripts appear destructive or credential-sensitive, stop and call out the risk before suggesting execution.
- If installability cannot be tested locally, say which command could not run and why.

## Completion criteria

- Frontmatter is valid and routeable.
- The skill performs one workflow with clear exclusions.
- References and scripts are discoverable but not loaded by default.
- Safety constraints and output artifacts are explicit.
