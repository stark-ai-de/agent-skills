# Roadmap

## V1

- Provide a public, installable Agent Skills repository.
- Include repo maintenance, Codex operations, engineering workflow, skill maintenance, and productivity skills.
- Follow the open Agent Skills specification.
- Keep skill and ADR validation dependency-free.
- Prefer read-only helper scripts.
- Document long-lived repo decisions as short ADRs.
- Keep `skills/` stable-only; track drafts in specs, issues, or ignored project-local folders.

## Future Work

- Add a generated skill catalog if it proves useful.
- Add tests for validation scripts.
- Run clean-copy install smoke tests in CI.
- Add a `skill-evals/` folder with realistic prompts and expected behavior.
- Add GitHub issue and pull request templates.
- Add badges after CI is active on the public repository.
- Evaluate Claude plugin metadata only after an ADR makes it a supported publishing surface.
