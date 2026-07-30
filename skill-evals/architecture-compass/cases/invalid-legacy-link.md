# Invalid Legacy Reference Link

## Should Trigger

Yes.

## Prompt

Validate a migrated Architecture Compass payload whose `SKILL.md` still links
to `references/nextjs-request-patterns.md`. The routed AC-ADR triplets exist.
Do not preserve the old policy file as an alias.

## Deterministic Assertions

- contains: validation failed
- contains: stale legacy reference path
- contains: nextjs-request-patterns.md
- not_contains: Architecture Compass validated

## Expected Behavior

- Fail any remaining legacy policy file or link after the atomic cutover.
- Route the workflow to the relevant Short ADR and its canonical Long/optional
  Guide instead of adding a compatibility alias.
- Keep non-policy third-party source URLs in Guides unaffected.
