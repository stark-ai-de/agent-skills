---
name: architecture-compass
description: Set up ADR governance or refactor/review repositories from explicit ADRs, stack rules, and code examples. Use when a repo needs agent-facing ADR guardrails or when existing/new code must follow documented source structure, runtime boundaries, request patterns, backend composition, env handling, and validation rules. Do not use for tiny edits, style-only cleanup, or tasks without repo evidence.
license: Apache-2.0
compatibility: Designed for Codex CLI, IDE extension, and Codex app. Works best with repo-local ADRs, AGENTS.md, stack rules, and representative code examples.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# Architecture Compass

## Goal

Set up ADR governance for a repository, or refactor/review repository code so it follows explicit ADRs, stack rules, source-structure rules, runtime-boundary rules, and representative code examples. Prefer target-repository evidence over bundled defaults. Produce durable agent instructions, minimal reversible implementation changes, and validation evidence.

## When to use

- The user asks to set up ADR usage, ADR guardrails, or agent instructions in a repository.
- The user asks to make future agents rely on provided ADRs.
- The user asks to refactor existing code to match ADRs, architecture docs, stack rules, or approved examples.
- The user asks to add new implementation that must follow existing repository rules and patterns.
- The user asks to bootstrap a new repository or app with ADR-backed source structure and agent guardrails.
- The user asks to review a PR, branch, or diff for architecture drift.
- The user asks where files should live across routes, components, hooks, library modules, server-only modules, shared packages, backend services, env/config, or infrastructure.
- The task touches Next.js App Router structure, Server Components, Hydrated components, TanStack Query read paths, Server Action write paths, or backend runtime composition.
- The task may require a stack-rule deviation or a new durable ADR.

## When not to use

- The task is a tiny one-file edit with no architecture or source-shape impact.
- The task is style-only cleanup, formatting, dependency bumping, or copyediting.
- The user wants general framework education rather than target-repo refactoring or guardrails.
- The target repo has no ADRs, docs, examples, or user-provided rules and the user does not want a rule-adoption plan.
- Another focused skill owns the task better, such as debugging, test-first implementation, PRD writing, or issue slicing.

## User-facing actions

Expose two simple actions to users. Choose one first, then select an internal mode only if needed.

### `setup`

Use when the repository needs durable ADR guardrails. This action may create or update repo-facing instruction files because the user explicitly requested setup.

Canonical prompt:

```text
Use Architecture Compass in setup mode for this repo.
```

Setup outputs should include:

- agent instructions that say accepted ADRs are binding,
- ADR discovery paths and index links,
- ADR precedence and conflict rules,
- stack-rule and dependency-deviation rules,
- optional PR checklist when a PR-template convention exists or the user asks for one,
- future usage prompts for refactor and implementation tasks.

### `refactor`

Use when code, diffs, or new implementation must be aligned with existing ADRs and examples.

Canonical prompt:

```text
Use Architecture Compass in refactor mode for this repo.
```

Refactor outputs should include:

- inspected ADRs, docs, stack rules, and examples,
- extracted rule set with provenance,
- file placement map or drift report,
- minimal changes when implementation was requested,
- validation results and remaining ADR gaps.

## Inputs to inspect

Inspect only the minimum context needed, but include these when relevant:

- User-provided ADRs, architecture docs, stack rules, source-shape rules, or implementation examples.
- `AGENTS.md`, `STACK_RULES.md`, `README.md`, contribution docs, validation docs, and docs indexes.
- Existing specs or ADRs that govern source layout, runtime boundaries, request boundaries, packages, env/config, infrastructure, exports, or validation.
- Representative source files for the area being changed.
- Current file layout, import aliases, package manager, workspace tooling, test/lint/type-check commands, and CI expectations.
- Existing generated-file conventions and allowlisted exceptions.
- Bundled references only after target repo evidence is inspected or unavailable.

## Workflow

1. Classify the top-level action: `setup` or `refactor`.
   - `setup`: install or refresh durable ADR guardrails.
   - `refactor`: align code, diffs, or new implementation with existing ADRs and examples.
     Internal sub-modes may be `audit`, `implementation`, `new-repo-bootstrap`, `pr-review`, `docs-sync`, or `stack-deviation`.
2. Build a target rule set from repo evidence before using bundled references. Label each rule as `target ADR`, `target docs`, `target example`, `target stack rule`, `bundled pattern`, or `assumption`.
3. Resolve conflicts explicitly:
   - target ADRs outrank bundled patterns,
   - target docs outrank current drift,
   - current code examples count as evidence only when they are identified as approved examples or consistently match the ADR,
   - stale or contradictory ADRs require a maintainer decision or superseding ADR before broad implementation.
4. Map files by source role: route entrypoint, React component, hook, domain module, query contract, client query options, server query options, server-only module, Server Action, backend bootstrap, runtime composition, HTTP app, route plugin, service, config/env, infrastructure, test, fixture, generated file, or docs.
5. Compare the current or proposed implementation against the rule set.
6. Produce a concise gap report before broad edits. Include file paths, violated rule, severity, recommended change, and validation.
7. If implementation is requested, refactor in small reversible slices. Keep framework entrypoints thin and move business behavior behind named modules.
8. Update existing relevant docs when source-shape rules, ADRs, validation commands, public package boundaries, stack deviations, or agent instructions change. In `setup` mode, creating missing `AGENTS.md`, ADR index, stack rules, and starter ADR files is allowed because setup is the user-approved creation action. Outside setup mode, ask before creating new docs or ADR directories.
9. Run focused validation for the touched boundary. Prefer target repo commands over generic command guesses.
10. Return changed files, validation results, remaining risks, skipped checks, and follow-up ADR or validation work.

## Core enforcement rules

Use the detailed references for exact checks. In summary:

- Keep workspace ownership explicit across app folders, docs apps, backend services, shared UI packages, domain-core packages, backend runtime packages, and tooling packages.
- Keep framework entrypoints thin. App Router files, route handlers, server actions, and backend `main.ts` files delegate behavior instead of owning business logic.
- Keep React components in `components`, hooks in `hooks`, and non-component TypeScript modules in `lib` or packages.
- Keep trusted server code under explicit server-only paths and require a server-only sentinel in hand-written server-only files.
- Use Server Components by default. Introduce Client Components only at interaction, browser API, hook, context, or client-library boundaries.
- For substantial data-backed screens, split route, screen wrapper, hydrated server component, client controller, and pure UI leaves.
- Use API-route reads plus TanStack Query contracts by default when that is the target repo pattern.
- Use validated Server Actions for browser-initiated trusted writes when that is the target repo pattern.
- Keep shared UI, domain contracts, backend runtime helpers, and app-specific behavior in the correct packages.
- Keep backend service bootstrap, runtime composition, HTTP app creation, route plugins, service construction, lifecycle, config validation, and env-file loading separated.
- Keep env loading at deployable app boundaries. Do not scatter `process.env` reads through services and domain modules.
- Keep infrastructure artifacts outside runtime `src` trees.
- Prefer named exports and avoid app-internal pass-through barrels unless they preserve a public package interface, runtime boundary, or useful locality boundary.
- Document new source-shape rules first, report them next, and promote them to hard validation only after exceptions are small and intentional.

## References

Read only what the mode requires:

- `references/rule-extraction-and-conflict-resolution.md` before deriving rules from ADRs, docs, and examples.
- `references/repository-source-structure.md` for workspace, source-role, server-only, package, env, infra, export, and validation rules.
- `references/nextjs-request-patterns.md` for route, component, hydration, retry boundary, query, read, write, and optional realtime patterns.
- `references/backend-runtime-patterns.md` for backend runtime, HTTP app, service lifecycle, config, and env-loading patterns.
- `references/adoption-workflows.md` for setup, existing refactors, new repository bootstrap, new feature guardrails, PR review, docs sync, and stack deviation workflows.
- `references/preferred-stack-profile.md` when the target repo has adopted this stack profile, asks for it, or needs a starter stack profile.
- `references/checklists.md` before finalizing output.
- `assets/refactor-report-template.md` when returning an audit or refactor report.
- `assets/new-repo-adoption-plan-template.md` when bootstrapping a new repo or installing guardrails.
- `assets/setup-report-template.md` when returning setup results.
- `assets/agent-instructions-template.md` when creating or updating ADR-focused agent instructions.
- `assets/adr-draft-template.md` when a target repo needs a source-structure ADR draft.

## Scripts

No bundled scripts in v0. Prefer target repo validation commands. Add a read-only source-shape report script only after enough evaluation proof shows recurring drift that cannot be handled by docs and review.

## Safety rules

- Do not invent repo facts, file paths, commands, accepted ADRs, or validation results.
- Do not override target repo ADRs with bundled defaults.
- Do not include secrets, credentials, private links, private repo names, customer data, internal hostnames, or copied full source files in output.
- Do not perform destructive migrations, broad rewrites, file deletion, or irreversible moves without explicit user approval.
- Do not create missing docs, ADR folders, or validation scripts without approval, except for standard guardrail files in explicit `setup` mode.
- Do not turn an audit into an implementation unless the user asked for implementation.
- Mark missing context as `unspecified` instead of guessing.

## Output format

Return in this order:

1. Top-level action, internal mode, and rule-set summary.
2. Inspected evidence and any unavailable evidence.
3. Setup plan, gap report, or implementation placement map.
4. Proposed or completed changes.
5. Docs, ADR, or agent-instruction updates needed.
6. Validation commands and results.
7. Stack-deviation result when relevant.
8. Remaining risks, assumptions, and follow-up actions.

For audit-only tasks, do not paste patches unless asked. For implementation tasks, summarize patches and include validation results.

## Completion criteria

- Target repo evidence was inspected before bundled defaults were applied, or the missing evidence is reported.
- Rules are linked to their provenance labels.
- File roles and runtime boundaries are explicit.
- Changes are minimal and reversible.
- Existing docs are updated when repo-facing rules changed.
- Validation is run or the blocker is stated.
- No private or source-project-specific material is introduced.

## Failure modes

- If ADRs and examples conflict, stop before broad edits and report the conflict.
- If the target repo has no rules and the action is `setup`, create a starter ADR governance plan. If the action is `refactor`, produce an adoption plan instead of pretending rules exist.
- If validation commands are unknown, mark them as `unspecified` and infer only from repo scripts when available.
- If a refactor is too large for one safe pass, split it into phases.
- If current code violates the ADR in many places, produce a drift report and migrate the touched boundary first.
- If a durable decision changes, propose an ADR update before implementation depends on it.
