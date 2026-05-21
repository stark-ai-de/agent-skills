# Skill Repository Release Checklist

Use this before tagging or announcing a public skills release.

- README includes install, list, and single-skill commands.
- `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `AGENTS.md` exist.
- `npm run validate` passes.
- `npm run list` prints every public skill.
- `npx skills@latest add ./skills --list` discovers the local public skill catalog.
- Project-local helper skills under `.agents/skills/` are ignored and not part of the public catalog.
- At least one skill can be installed locally after approval.
- No destructive scripts are present.
- No private data, credentials, internal hostnames, or customer details are present.
- Deprecated skills include replacement and migration notes.
- Changelog has a release entry or prepared draft.
