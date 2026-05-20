# Repo Health Audit Example

Prompt:

```text
Use $repo-health-audit to review this public TypeScript library before release.
```

Expected report shape:

```md
## Findings

- High: `package.json` has no `files` allowlist, so test fixtures would be published.
- Medium: `README.md` install command uses an old package name.
- Low: `SECURITY.md` is missing a supported versions note.

## Validation

- `npm run validate`: passed
- `npm run test`: failed, one snapshot expects the old package name

## Next Actions

1. Add a publish allowlist.
2. Update README package naming.
3. Refresh the stale snapshot after the README fix.
```
