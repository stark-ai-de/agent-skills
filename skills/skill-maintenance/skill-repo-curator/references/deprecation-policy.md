# Deprecation Policy

Do not delete skills abruptly.

When deprecating:

1. Add a `## Deprecation notice` section to `SKILL.md`.
2. Name the replacement skill.
3. Explain why the skill is deprecated.
4. Keep the deprecated skill for at least one minor release.
5. Update README and changelog.
6. Remove only after users have a migration path.

Suggested notice:

```md
## Deprecation notice

This skill is deprecated. Use `$replacement-skill` instead.

Reason:

<short reason>

Migration:

<what to do>
```
