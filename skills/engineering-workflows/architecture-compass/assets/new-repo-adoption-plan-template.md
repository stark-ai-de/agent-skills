# New Repository ADR-Guided Adoption Plan

Use this template for the first-implementation layout plan after guardrail adoption has been recorded in `setup-report-template.md`.

## Selected stack

- Workspace:
- Web framework:
- Backend runtime:
- Validation/parsing:
- Styling/UI:
- Data/request layer:
- Package manager:
- Lint/format: Oxc for JavaScript/TypeScript starters unless target ADRs, stack rules, or explicit rejection choose another toolchain.
- pnpm workspace hardening:

## Initial layout

```text
apps/<web-app>/
apps/<docs-app>/
apps/<backend-service>/
packages/ui/
packages/<domain-core>/
packages/backend-runtime/
packages/<tooling>/
docs/adr/
```

Delete unused folders from the starter plan. Do not create backend or package folders before there is a real owner.

## ADRs and docs

- Source-structure ADR: `docs/adr/NNNN-repository-source-structure.md`
- ADR index: `docs/adr/index.md` or target convention
- Agent instructions: `AGENTS.md`
- Stack rules: `STACK_RULES.md` or target convention
- Validation docs:

## Starter examples

Include only examples selected for the stack:

- Thin route file.
- Screen wrapper.
- Hydrated server component.
- Client controller.
- Pure UI leaf.
- Query client helper.
- Query contract.
- Client query options.
- Server query options.
- Server Action wrapper.
- Backend `main.ts`.
- Backend `runtime.ts`.
- Backend `http-app.ts`.
- Backend env/config loader.

## Guardrails for first implementation

- [ ] New files have one source role.
- [ ] Runtime boundaries are explicit.
- [ ] Stack choices match stack rules.
- [ ] Oxc owns JavaScript/TypeScript linting and formatting, or the accepted alternative is recorded.
- [ ] pnpm owns dependency installation, workspace resolution, and lockfile state.
- [ ] `pnpm-workspace.yaml` includes supply-chain hardening and reviewed `allowBuilds` entries.
- [ ] Docs point to canonical ADRs.
- [ ] Validation commands exist.

## pnpm workspace baseline

```yaml
packages:
  - "."
  - "apps/*"
  - "packages/*"
strictDepBuilds: true
blockExoticSubdeps: true
minimumReleaseAge: 1440
minimumReleaseAgeStrict: true
trustPolicy: no-downgrade
allowBuilds: {}
```

Populate `allowBuilds` only after reviewing dependencies that genuinely need lifecycle scripts. Add narrow `minimumReleaseAgeExclude` or `trustPolicyExclude` entries only for approved urgent or compatibility cases.

## Oxc lint/format baseline

```json
{
  "scripts": {
    "format": "oxfmt --write .",
    "format:check": "oxfmt --check .",
    "lint": "oxlint"
  }
}
```

Keep formatter and linter config in repo-root Oxc config files unless target repo structure requires package-local overrides.

## Validation commands

```bash
# install
# type-check
# lint
# test
# docs
```

## Open decisions

| Decision | Required before | Owner | Notes |
| -------- | --------------- | ----- | ----- |
|          |                 |       |       |
