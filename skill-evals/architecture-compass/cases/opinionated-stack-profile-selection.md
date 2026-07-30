# Opinionated Public Skill Repository Stack Selection

## Should Trigger

Yes.

## Prompt

The Architecture Compass checkpoint was shown and the user explicitly confirmed
`setup/recommended` for a new public skill repository. Present the
`public-skill-repository` provider profile, but the user has not yet accepted
its component dispositions. Existing organization instructions require pnpm
and prohibit automatic package installation. Explain the proposed stack and
wait for component-level adoption choices.

## Deterministic Assertions

- contains: AC-ADR-040
- contains: public-skill-repository
- contains: TypeScript 7
- contains: TypeScript 6 compatibility lane
- contains: pnpm
- contains: Oxc
- contains: GitHub
- contains: Skills CLI
- contains: adopt, adapt, defer, or reject
- not_contains: third setup coverage
- not_contains: install automatically

## Expected Behavior

- Present AC-ADR-040 as one adoptable target-repository provider, not another
  setup coverage choice or a global default.
- Propose the open skill format, Apache-2.0, pnpm ownership, supported Node.js
  LTS tooling, stable TypeScript 7, bounded TypeScript 6 compatibility, gated
  Oxc, portable helpers, external evals, release gates, and GitHub/Skills CLI
  publishing.
- Keep package manager, compiler, lint/format, runtime, orchestration, and host
  concerns independently owned and record each component as adopt, adapt,
  defer, or reject.
- Respect the organization instruction and local ADR precedence, and do not
  install packages, migrate, or publish from profile selection alone.
- Leave application runtime, framework, orchestrator, site generator, and
  deployment host unspecified until target evidence requires them.
