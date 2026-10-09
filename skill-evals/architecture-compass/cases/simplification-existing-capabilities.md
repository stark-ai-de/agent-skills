# Simplification with existing capabilities

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to simplify the TypeScript sources of this governed
repository. Source writes and the existing checks are authorized. A schema
library is already a direct dependency; three callers repeat the same config
projection within one server owner. A bounded stream reader is in the lockfile
but only as a transitive dependency. An apparently unused export is registered
by a plugin loader. Review the complete requested file inventory and implement
only equivalent reductions. Do not introduce a new workspace package.

## Deterministic Assertions

- contains: refactor
- contains: transitive
- contains: plugin loader
- contains: equivalence
- contains: implementation
- contains: tests
- not_contains: all lockfile packages are direct dependencies
- not_contains: no callers found proves dead code

## Expected Behavior

- Select the existing bounded refactor route, confirm local governance and
  protected state, and load the optional AC-ADR-006 guidance.
- Reconcile the requested tracked TS/TSX inventory, classify exclusions, and
  distinguish scanning from semantic review of candidate callers.
- Consider schema-inferred types only after checking input/output transforms,
  public serialization and optionality; share the config projection in its
  existing server owner without moving caller-specific checks.
- Verify the stream package's public API and exact version. An import requires
  an owning direct dependency; scope and policy determine whether that bounded
  declaration is authorized. Do not silently rely on hoisting or install a tool.
- Keep the dynamically registered export unless registration and compatibility
  evidence establish that deletion is safe.
- Verify each uncertain contract at its owner, re-evaluate within scope, and
  report implementation, test and whole-diff deltas with retained candidates.
