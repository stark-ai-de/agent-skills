# Agent Skills Catalog Context

This repository publishes public Agent Skills for repo maintenance, Codex operations, Cursor operations, skill maintenance, productivity, and repeatable engineering workflows. Selected skills also ship as a repository-managed Agent Plugin.

## Canonical Terms

- **Agent Skill**: A directory containing `SKILL.md` plus optional `references/`, `scripts/`, `assets/`, and skill-local `agents/` metadata.
- **public catalog**: The installable skill tree under `skills/`.
- **Agent Plugin**: A packaged projection of selected public skills with a root `plugin.json`. Not a synonym for one skill.
- **plugin source**: Membership and plugin identity in `plugins/<id>.source.json`. Canonical skills stay under `skills/`.
- **portable projection**: The generated Agent Plugins package under `plugins/stark-ai-developer/`. Do not hand-edit it.
- **repository marketplace**: The committed `.agents/plugins/marketplace.json` pointer at the portable projection. Local or repository discovery only; not public-directory proof.
- **adapter**: A client-native package generated into disposable staging when a target cannot consume the portable projection. `adapters/` is not committed; OpenAI-native archives land under `dist/openai/`.
- **project-local helper skill**: A third-party, private, or personal helper installed under `.agents/skills/`; it is ignored and not republished.
- **category**: The first directory under `skills/`, such as `repo-maintenance`.
- **stable skill**: A skill intended for public install from this repository.
- **draft skill**: A proposed or experimental workflow kept outside `skills/` until it is stable.
- **ADR**: A short repo-level decision record under `docs/adrs/`.
- **out-of-scope note**: A lightweight boundary note under `docs/out-of-scope/`.

## Avoided Synonyms

- Use **Agent Skill** for a skill directory, not plugin, prompt pack, or command pack.
- Use **Agent Plugin** for a `plugin.json` package; do not call a single skill a plugin.
- Use **public catalog** for `skills/`, not marketplace or registry.
- Use **repository marketplace** for `.agents/plugins/marketplace.json`, not the Universal Plugins Directory or a skills.sh registry.
- Use **project-local helper skill** for `.agents/skills/`, not vendored skill.
- Use **stable skill** for publishable skills, not production skill.

## Relationships

- `skills/` contains only stable public skills and remains the author-maintained source.
- `plugins/stark-ai-developer.source.json` is the allowlist and identity for the stark AI Developer package; `plugins/stark-ai-developer/` is the generated portable copy, as required by [ADR-0043](docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](docs/adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)).
- `.agents/plugins/marketplace.json` is the one committed `.agents/` file. The rest of `.agents/`, `skills-lock.json`, `.cursor/`, and `.claude/` stay local-only and ignored.
- `docs/adrs/` records long-lived decisions about repository policy or architecture.
- `docs/out-of-scope/` records useful boundaries that are not architectural decisions.
- Category README files must mirror `SKILL.md` frontmatter descriptions.

## Known Ambiguities

- A new workflow can start as a spec or issue before it becomes a stable skill.
- A repository setup convention belongs in `agent-context-bootstrap` unless it is only a one-time handoff.
- Claude-specific metadata is not a supported publishing surface until an ADR says otherwise.
- A repository or personal marketplace entry does not mean the package is listed in OpenAI's public directory.
