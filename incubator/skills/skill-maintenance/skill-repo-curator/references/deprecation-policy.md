# Deprecation Policy

The public `skills/` tree is promoted-only. Draft or experimental public candidates should stay in `incubator/skills/` until they are ready for public install.

Do not delete skills abruptly.

When deprecating:

1. Add a `## Deprecation notice` section to `SKILL.md`.
2. Name the replacement skill.
3. Explain why the skill is deprecated.
4. Keep the deprecated skill for at least one minor release.
5. Update README and changelog.
6. Remove only after users have a migration path.

Do not replace a deprecated skill with an experimental skill under `skills/`. The replacement must be promoted enough for public installation.

Suggested notice:

```md
## Deprecation notice

This skill is deprecated. Use `$replacement-skill` instead.

Reason:

<short reason>

Migration:

<what to do>
```
