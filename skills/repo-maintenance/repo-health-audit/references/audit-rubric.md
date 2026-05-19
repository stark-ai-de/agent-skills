# Repo Health Audit Rubric

Score each area from 0 to 5.

| Area           | Check                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Docs           | README, install path, examples, contribution docs, architecture notes |
| Build and test | Deterministic install, test, lint, typecheck, format commands         |
| CI             | Pull request validation, branch coverage, permissions, required jobs  |
| Release        | Changelog, versioning, tag or publish process, rollback notes         |
| Dependencies   | Lockfile consistency, update policy, major upgrade visibility         |
| Security       | SECURITY.md, secret hygiene, safe CI defaults, dependency review      |
| Operations     | Issue templates, PR template, labels, maintainer ownership            |
| Agent context  | AGENTS.md, validation commands, repo-specific workflow notes          |

Prioritize blockers that could mislead users, ship broken code, expose secrets, or make releases unreproducible.
