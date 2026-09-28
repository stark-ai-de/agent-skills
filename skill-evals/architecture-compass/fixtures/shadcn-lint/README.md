# Shadcn lint recipe qualification

This private, isolated package executes the examples extracted from the canonical
AC-ADR-063 Guide. It is excluded from the installed skill/plugin payload and does
not add lint tooling to this repository's own lint command.

```sh
pnpm --dir skill-evals/architecture-compass/fixtures/shadcn-lint install --frozen-lockfile
pnpm run qualify:shadcn-lint --output /tmp/shadcn-lint-receipt.json
```

Installation changes only this fixture's dependencies and the package-manager
cache. The qualification command writes and removes only its own temporary
project, and optionally writes the explicitly requested, previously nonexistent
receipt. It does not modify source, run autofixes, install packages, or publish.

The fixture pins @shadcn/lint 0.1.0, ESLint 10.10.0, Oxlint 1.83.0,
@typescript-eslint/parser 8.70.0, TypeScript 5.9.3, and Tailwind 4.3.3. TypeScript
5.9.3 is a fixture dependency within the parser's supported range, not a compiler
migration prescription. Frozen installation supplies the transitive identity.
Both linter launchers use the same Bun executable as the driver; the command does
not introduce a Node fallback. CI selects Bun through the repository version file.

The checks cover positive consumers; every rule's negative diagnostic and exit;
narrow component-definition overrides with the other three rules still active;
CardTitle and Avatar contracts; the dynamic-DOM scope limit; nonblocking warnings
and a zero-warning cap; shared UI exports; component discovery loss/recovery;
theme dependency loss/recovery; and fresh theme analysis after an unchanged
consumer was cached. Expected degraded-analysis cases must emit a plugin warning;
that green process is explicitly limited evidence, never a qualified clean pass.

The JSON receipt records hashes of the Guide, driver, package manifest, lockfile,
and package-manager policy, the Git revision, installed versions, execution
runtime, and each observed outcome. Input hashes qualify uncommitted content;
the Git revision alone does not. A failed assertion exits nonzero and records a
failed receipt when execution reached the fixture. Existing receipts are never
overwritten. Hosted Validate runs this package in its own `shadcn-lint-profile`
job and uploads the receipt for that exact workflow run.

This proves the pinned synthetic TSX examples only. It does not prove consumer
adoption, general JSX/TS coverage, compiler/build behavior, persistent editor
cache invalidation, visual quality, accessibility, or agent behavior. Scenario
response evaluations remain a separate evidence stage. Changing dependencies or
the Guide requires a fresh qualification; do not carry forward a prior pass.
