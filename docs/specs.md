# Implementation Specs

Implementation specs are saved planning artifacts that guide coding work.

Specs are working contracts, not durable architecture policy. Put long-lived repo, runtime, validation, publishing, security, or ownership decisions in [`docs/adrs/`](adrs/README.md), then link the ADR from the spec. See [`docs/adrs.md`](adrs.md) for ADR policy and the ADR index.

This public catalog keeps private or repo-creation drafts in `docs/specs/do-not-publish/`, which is ignored by git except for its `.gitkeep`. Track publishable specs under `docs/specs/` only after the maintainer confirms they contain no secrets, customer data, private repo paths, or internal hostnames.

## Persistence

- Save publishable specs in `docs/specs/` by default.
- Save private or repo-creation drafts in `docs/specs/do-not-publish/`.
- Save ADRs in `docs/adrs/` using the repo's ADR filename pattern.
- If a target repo lacks a specs or ADR folder, ask before creating one. Suggest `docs/specs/` and `docs/adrs/` unless the repo already has a better convention.
- If the selected specs folder is ignored by git and the user expects a shared repo artifact, ask whether to keep it local-only, unignore that path, or choose a tracked docs path.
- Save the spec before implementation starts.

## Spec Content

- Include scope, non-goals, acceptance criteria, validation commands, source challenge notes, ADR gate result, user verification, risks, and done-when criteria.
- Link to ADRs for durable decisions instead of copying ADR rationale into the spec.
- Keep obsolete specs only when they are useful historical context; otherwise supersede or archive them intentionally.

## Filenames

- Use filenames like `admin-users-csv-export-spec.md`, `typed-api-client-migration-spec.md`, or `queue-backed-worker-rollout-spec.md`.
- Avoid spaces, dates, issue IDs, or duplicate suffixes unless the repo process explicitly requires them.
- Do not add global sequential numbers to spec filenames unless the target repo already has an accepted spec-numbering convention.

## Documentation Updates

- Update only existing, relevant repo-facing files when a spec, ADR, public-contract change, trigger change, install behavior change, or promotion change makes them stale.
- When multiple docs need the same explanation, put the actual policy in one canonical file and add concise links from the other files.
- If a relevant repo-facing file is missing, ask before creating it and suggest the smallest useful location.
- Do not create boilerplate docs opportunistically.
- Candidate files may include `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, category READMEs, docs indexes, eval proof, changelog, release notes, install docs, or publishing docs.

## Filename Examples

- Good: `admin-users-csv-export-spec.md`
- Good: `typed-api-client-migration-spec.md`
- Good: `queue-backed-worker-rollout-spec.md`
- Good when external IDs already exist: `aga-51-i18n-routing-spec.md`
- Avoid: `spec.md`
- Avoid: `Deep Research Report (2).md`
- Avoid: `2026-05-22_fix-stuff.md`
