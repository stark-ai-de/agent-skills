# Service Boundary Notes Fixture

- Existing API routes live under `src/api/`.
- Background jobs live under `src/jobs/`.
- Shared domain helpers live under `src/lib/`.
- Durable boundary changes require an ADR before implementation.

Use this fixture for cases where the spec must separate feature behavior from durable architecture decisions.
