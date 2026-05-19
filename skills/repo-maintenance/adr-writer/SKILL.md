---
name: adr-writer
description: Create short Architecture Decision Records under docs/adr. Use when the user makes a repo-level decision, changes skill format, publishing, validation, license, layout, or maintainer policy, and wants a concise ADR without documentation bloat.
license: MIT
metadata:
  author: stark-ai-de
  category: repo-maintenance
  version: "0.1.0"
---

# ADR Writer

## Goal

Create a short Architecture Decision Record that captures one repo-level decision without turning it into long-form documentation.

## When to use

- A decision changes repo structure, publishing, validation, license, layout, or skill standards.
- A previous ADR is superseded, deprecated, or rejected.
- The user asks to document a repo-level decision.

## When not to use

- Tiny copy edits, typo fixes, or minor template polish.
- Routine skill additions that follow existing standards.
- Temporary implementation details that do not affect future maintainers.

## Inputs to inspect

- `docs/adr/README.md`
- `docs/adr/TEMPLATE.md`
- Existing `docs/adr/NNNN-*.md` files
- The decision context, current repo docs, and validation requirements

## Workflow

1. Identify the single decision sentence.
2. Check `docs/adr/README.md` and the latest ADR number.
3. Create the next `docs/adr/NNNN-short-title.md`.
4. Use `docs/adr/TEMPLATE.md` or `skills/repo-maintenance/adr-writer/assets/adr-template.md`.
5. Keep the ADR under 250 words, with a target of 120 to 180 words.
6. Update the ADR index in `docs/adr/README.md`.
7. Run ADR validation.

## Safety rules

- Do not write long ADRs.
- Do not rewrite accepted ADRs; create a superseding ADR instead.
- Do not document secrets, private internal details, customer data, or credentials.
- Do not invent decision history. Mark uncertain decisions as `Proposed`.

## References

Read only when needed:

- `assets/adr-template.md` for the compact ADR template.

## Scripts

Use only when the user wants a new ADR file created:

```bash
npm run adr:new -- "Use category-based skill folders"
```

## Output format

Return:

1. ADR path
2. Decision sentence
3. Word count
4. Validation result
5. Recommended next action

## Completion criteria

- The ADR records exactly one repo-level decision.
- The ADR is under 250 words.
- The ADR index is updated.
- ADR validation passes.

## Failure modes

- If the decision is unclear, ask for the decision sentence before writing.
- If the next ADR number cannot be determined, stop and report the conflicting files.
- If validation fails, report the failing ADR rule and the file path.
