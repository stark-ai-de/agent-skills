# Skill Authoring Style

## Frontmatter

Every `SKILL.md` must start with YAML frontmatter and follow https://agentskills.io/specification.

Required:

- `name`
- `description`

Recommended for this public repo:

- `license: MIT`
- `metadata.author: stark-ai-de`
- `metadata.category: <category>`
- `metadata.version: "0.1.0"`

Descriptions are routing rules. Include the concrete workflow, trigger terms, and exclusions when important. Keep descriptions under 500 characters when possible and never over 1024 characters.

## Body Shape

Every skill should include:

- Goal
- When to use
- When not to use
- Inputs to inspect
- Workflow or process
- Safety rules
- Output format
- Completion criteria
- Failure modes when relevant

## References

Use references for long rubrics, examples, templates, decision trees, and troubleshooting guides. Reference files should be one level below the skill folder and linked directly from `SKILL.md`.

## Scripts

Scripts should be deterministic helpers. Prefer read-only scripts. If a script writes files, the owning skill must clearly say what it writes and that user approval is required before running it.

Shell scripts must use:

```bash
set -euo pipefail
```

## Tone

Write instructions for another agent. Be direct, operational, and concise. Do not explain basic software engineering concepts unless they are specific to the workflow.
