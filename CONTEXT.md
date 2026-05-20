# Agent Skills Catalog Context

This repository publishes public Agent Skills for repo maintenance, Codex operations, skill maintenance, productivity, and repeatable engineering workflows.

## Canonical Terms

- **Agent Skill**: A directory containing `SKILL.md` plus optional `references/`, `scripts/`, and `assets/`.
- **public catalog**: The installable skill tree under `skills/`.
- **project-local helper skill**: A third-party or personal helper installed under `.agents/skills/`; it is ignored and not republished.
- **category**: The first directory under `skills/`, such as `repo-maintenance`.
- **stable skill**: A skill intended for public install from this repository.
- **draft skill**: A proposed or experimental workflow kept outside `skills/` until it is stable.
- **ADR**: A short repo-level decision record under `docs/adr/`.
- **out-of-scope note**: A lightweight boundary note under `docs/out-of-scope/`.

## Avoided Synonyms

- Use **Agent Skill**, not plugin, prompt pack, or command pack.
- Use **public catalog** for `skills/`, not marketplace or registry.
- Use **project-local helper skill** for `.agents/skills/`, not vendored skill.
- Use **stable skill** for publishable skills, not production skill.

## Relationships

- `skills/` contains only stable public skills.
- `.agents/skills/` contains helper skills restored from `skills-lock.json`.
- `docs/adr/` records long-lived decisions about repository policy or architecture.
- `docs/out-of-scope/` records useful boundaries that are not architectural decisions.
- Category README files must mirror `SKILL.md` frontmatter descriptions.

## Known Ambiguities

- A new workflow can start as a spec or issue before it becomes a stable skill.
- A repository setup convention belongs in `agent-context-bootstrap` unless it is only a one-time handoff.
- Claude-specific metadata is not a supported publishing surface until an ADR says otherwise.
