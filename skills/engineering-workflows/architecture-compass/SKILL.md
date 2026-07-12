---
name: architecture-compass
description: Set up ADR governance or refactor/review repositories from explicit ADRs, stack rules, code examples, or a requested new-repo adoption plan. Use when a repo needs agent-facing ADR guardrails or when existing/new code must follow documented source structure, runtime boundaries, request patterns, backend composition, env handling, and validation rules. Do not use for tiny edits, style-only cleanup, or no-evidence tasks that do not request governance adoption.
license: Apache-2.0
compatibility: Designed for Codex, Cursor, Claude Code, and other Agent Skills hosts; uses native planning or read-only controls when available. Works best with repo-local ADRs, agent instructions, stack rules, and representative code examples.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.2.0"
---

# Architecture Compass

## Goal

Set up ADR governance or align/review code against explicit ADRs, stack rules, runtime boundaries, and approved examples. In setup and new-repo modes, record every bundled guardrail as adopted, adapted, deferred, or rejected; conflicting target evidence requires an explicit rejection decision and rationale. Produce durable agent instructions, minimal reversible changes, and validation evidence.

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
- adoption decisions for bundled ADR guardrails: adopt, adapt, defer, or reject,
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
- Bundled architecture-pattern and guardrail references after target repo evidence is inspected. Read the adoption and host-collaboration routing references first to select the route and controls. In setup and new-repo modes, inspect bundled ADR guardrails as adoption candidates even when target repo evidence exists.
- Target repository formatting and linting policy. For JavaScript or TypeScript starter setup, treat Oxc as the bundled default unless target ADRs, stack rules, or an explicit maintainer rejection choose another toolchain.

## Collaboration and decision routing

Before mutation, use `references/adoption-workflows.md` to choose a decision phase, direct execution, read-only audit, or review. Unresolved durable choices and broad, multi-boundary, behavior-changing, or phased refactors stay read-only through approval; narrow behavior-preserving ADR-prescribed work stays direct; audits do not require Plan; reviews prefer the host review surface. Plan mode and permissions are separate.

Use `references/host-collaboration-modes.md` for capability evidence, public statuses, fallbacks, the exact route-matching continuation, and the mandatory state recheck. The skill never claims prompt text changed host mode or permissions.

## Workflow

1. Classify the top-level action: `setup` or `refactor`.
   - `setup`: install or refresh durable ADR guardrails.
   - `refactor`: align code, diffs, or new implementation with existing ADRs and examples.
     Internal sub-modes may be `audit`, `refactor`, `new-implementation`, `new-repo-bootstrap`, `pr-review`, `docs-sync`, or `stack-deviation`.
2. From the request alone, classify the preliminary collaboration route and resolve only its relevant host controls before repository inspection: planning plus read-only enforcement for a decision phase, read-only enforcement for an audit, and the review surface plus read-only enforcement when that surface does not establish a no-write boundary for a review. Direct execution does not request Plan or Read Only merely because either is available. Then follow both routing references. Silence is not a declined transition.
3. Inspect enough repository evidence to validate the preliminary route, using only non-mutating operations and index-safe Git status while the route remains provisional, then build the rule set from repo evidence and bundled guardrail candidates. If that evidence changes the route, stop before decision work or mutation, resolve the newly required host controls, and continue under the reclassified route. Use the prefilled rows in `assets/setup-report-template.md` as the canonical bundled guardrail inventory for setup and new-repo runs. Label each rule as `target ADR`, `target docs`, `target example`, `target stack rule`, `bundled ADR candidate`, `bundled pattern`, or `assumption`.
4. Resolve conflicts explicitly:
   - accepted target ADRs are binding for refactor work,
   - setup and new-repo work must record whether each bundled ADR guardrail is adopted, adapted, deferred, or rejected,
   - guardrails that do not fit the current implementation slice should be deferred with a future trigger instead of removed,
   - target evidence that contradicts a bundled guardrail is conflict evidence, not permission to omit the guardrail silently,
   - user-confirmed rejection requires an explicit rationale and, when durable, an ADR note or superseding ADR,
   - target docs outrank current drift,
   - current code examples count as evidence only when they are identified as approved examples or consistently match the ADR,
   - stale or contradictory ADRs require a maintainer decision or superseding ADR before broad implementation.
   - Oxc formatting/linting is the bundled JS/TS starter default, but target ADRs, stack rules, or explicit maintainer rejection outrank that default.
5. Map files by source role: route entrypoint, React component, hook, domain module, query contract, client query options, server query options, server-only module, Server Action, backend bootstrap, runtime composition, HTTP app, route plugin, service, config/env, infrastructure, test, fixture, generated file, or docs.
6. Compare the current or proposed implementation against the rule set.
7. Produce a concise gap report before broad edits. Include file paths, violated rule, severity, recommended change, and validation.
8. For a decision phase, remain read-only and return the reference's statuses. When implementation was requested, also return allowlisted paths, validation, any required permission transition, and the matching direct, native, or portable-fallback continuation; otherwise return `Execution status: not requested` without an implementation handoff. If a required write-capable control remains inactive or unconfirmed after the route is otherwise ready, return `Execution status: pending write permission` with the matching continuation and stop. Before approved implementation, recheck repository state, ADRs, and target paths; stop on drift.
9. If implementation is requested, required write permission is confirmed or unnecessary, and the recheck passes, refactor in small reversible slices. Keep framework entrypoints thin and move business behavior behind named modules.
10. Update relevant docs when rules, contracts, deviations, validation, or agent instructions change. Setup may create its standard guardrail files; otherwise ask before creating missing docs or ADR directories.
11. Run focused validation for the touched boundary. Prefer target repo commands over generic command guesses.
12. Return changed files, validation results, remaining risks, skipped checks, and follow-up ADR or validation work.

## Core enforcement rules

Use the routed references for exact checks. Keep ownership and runtime boundaries
explicit, framework entrypoints thin, trusted server code isolated, request
reads/writes aligned with the target pattern, backend bootstrap/composition/config
separated, and infrastructure outside runtime source trees. Target ADRs and
approved examples decide the concrete shape; bundled patterns do not override
them.

## References

Read only what the mode requires:

- `references/rule-extraction-and-conflict-resolution.md` before deriving rules from ADRs, docs, and examples.
- `references/repository-source-structure.md` for workspace, source-role, server-only, package, env, infra, export, and validation rules.
- `references/nextjs-request-patterns.md` for route, component, hydration, retry boundary, query, read, write, and optional realtime patterns.
- `references/backend-runtime-patterns.md` for backend runtime, HTTP app, service lifecycle, config, and env-loading patterns.
- `references/adoption-workflows.md` for setup, existing refactors, new repository bootstrap, new feature guardrails, PR review, docs sync, and stack deviation workflows.
- `references/host-collaboration-modes.md` before routing a decision phase or resuming approved implementation.
- `references/preferred-stack-profile.md` when the target repo has adopted this stack profile, asks for it, or needs a starter stack profile.
- `references/checklists.md` before finalizing output.
- `assets/refactor-report-template.md` when returning an audit or refactor report.
- `assets/setup-report-template.md` when returning setup results, including the canonical bundled guardrail inventory and new-repo guardrail adoption decisions.
- `assets/new-repo-adoption-plan-template.md` only when a separate first-implementation layout plan is needed after the setup report.
- `assets/agent-instructions-template.md` when creating or updating ADR-focused agent instructions.
- `assets/adr-draft-template.md` when a target repo needs a source-structure ADR draft.

## Scripts

No bundled scripts. Prefer target validation.

## Safety rules

- Do not invent repo facts, file paths, commands, accepted ADRs, or validation results.
- Do not override target repo ADRs with bundled defaults during implementation.
- Do not drop bundled ADR guardrails in setup mode; defer future-fit guardrails and challenge rejected guardrails before recording the user-confirmed rationale.
- Do not include secrets, credentials, private links, private repo names, customer data, internal hostnames, or copied full source files in output.
- Do not perform destructive migrations, broad rewrites, file deletion, or irreversible moves without explicit user approval.
- Do not create missing docs, ADR folders, or validation scripts without approval, except for standard guardrail files in explicit `setup` mode.
- Do not turn an audit into an implementation unless the user asked for implementation.
- Follow `host-collaboration-modes.md`: never claim a mode or permission switch, write through a pending decision, or resume through material drift.
- Mark missing context as `unspecified` instead of guessing.

## Output format

Return in this order:

1. Top-level action, internal mode, collaboration route, explicit `Planning capability` and `Read-only enforcement` fields, and exact architecture/execution statuses.
2. Inspected evidence and any unavailable evidence.
3. Setup plan, gap report, or implementation placement map.
4. Proposed or completed changes.
5. Docs, ADR, or agent-instruction updates needed.
6. Validation commands and results.
7. Stack-deviation result when relevant.
8. Remaining risks, assumptions, and follow-up actions.

For audit-only tasks, do not paste patches unless asked. For implementation tasks, summarize patches and include validation results.

## Completion criteria

- Target repo evidence was inspected before bundled guardrails were adopted or adapted, or the missing evidence is reported.
- In setup and new-repo modes, each bundled ADR guardrail has an adoption decision, deferred future trigger, or user-confirmed rejection rationale.
- Rules are linked to their provenance labels.
- File roles and runtime boundaries are explicit.
- Changes are minimal and reversible.
- Collaboration routing, approval, allowlisting, and re-entry satisfy `host-collaboration-modes.md`.
- Existing docs are updated when repo-facing rules changed.
- Validation is run or the blocker is stated.
- No private or source-project-specific material is introduced.

## Failure modes

- If ADRs and examples conflict, stop before broad edits and report the conflict.
- If target evidence conflicts with a bundled ADR guardrail during setup, ask why the guardrail should be rejected or changed before recording it as rejected.
- If the target repo has no rules and the action is `setup`, create a starter ADR governance plan. If the action is `refactor`, produce an adoption plan instead of pretending rules exist.
- If validation commands are unknown, mark them as `unspecified` and infer only from repo scripts when available.
- If a refactor is too large for one safe pass, split it into phases.
- If current code violates the ADR in many places, produce a drift report and migrate the touched boundary first.
- If a durable decision changes, propose an ADR update before implementation depends on it.
- If decision routing cannot proceed safely, use the transition or fallback rules in `host-collaboration-modes.md` and stop before writing.
