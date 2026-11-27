# Shared Quality Framework and Analysis Boundaries

## Should Trigger

Yes.

## Prompt

A monorepo contains a React application, Playwright tests, plain Node helpers and a Python worker. Shared quality is approved for its JavaScript/TypeScript boundaries. The user asks for the configuration design, including unused exports and runtime cycles, without adding frameworks.

## Deterministic Assertions

- contains: AC-ADR-069
- contains: React
- contains: Playwright
- contains: entrypoints
- contains: Knip
- contains: Dependency Cruiser
- contains: Python
- not_contains: a second ESLint runner is required
- not_contains: copying the plugin implementation is required

## Expected Behavior

Keep all mandatory shared presets for applicable source; scope React and native Playwright exports to matching files and retain Python checks. Keep Knip entrypoints/project ownership and baselines local. Use optional shared dependency-graph/duplication exports only for adopted analyses, qualify compiler API/emit semantics, exclude erased type-only edges before cycle detection and preserve external edges needed by tooling boundary rules. Do not invent another framework or duplicate shared plugin code.

## Evidence Stage

source/static: this case specifies expected agent behavior. A structural pass does not establish a live agent run, installation or hosted enforcement.
