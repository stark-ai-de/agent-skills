# Architecture Compass Evals

This folder stores maintainer regression and release evidence for the public `architecture-compass` skill. Historical promotion evidence remains under `runs/`; dated summaries must distinguish static, local, CI, publication, deployed, and external proof.

## Eval Contract

Passing behavior must:

- expose exactly `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`, with no recursive `auto` workflow;
- state the task-derived selection and rationale and proceed when intent and authority are clear, while asking on bare or materially ambiguous activation;
- limit agent-initiated selection to a relevant read-only audit unless the user's existing request authorizes the mutating outcome and scope;
- use setup coverage `recommended` or `complete`, applying the seven-decision foundation only to new or evidence-empty repositories;
- keep audit strictly read-only and prevent direct refactor from inventing durable decisions or repairing governance;
- use native Plan mode for plan workflows when supported, block on indeterminate state, fall back only when native Plan is definitely unavailable, exit before writes, and recheck state before execution;
- distinguish ChatGPT web Chat/Work from Codex web: only an observed inactive
  Codex web `/plan` may receive the Codex `$` handoff, while missing evidence is
  `Indeterminate` and a positive no-control enumeration permits fallback;
- route from `references/adr-catalog.md` to Short variants first, then load only applicable canonical Long ADRs and optional Guides;
- preserve accepted local ADR identity and history, use repository-native provider mapping, and keep skill-runtime ADRs outside target adoption matrices;
- rank architecture evidence through AC-ADR-046 independently from operational authority and stop the affected scope when same-rank accepted decisions conflict;
- preserve current Next.js request, hydration, query-key, retry/reset, validated-write, and realtime lifecycle patterns across AC-ADR-008/009/010/017;
- preserve conditional backend runtime/configuration and target-dependent source-placement mechanics without turning examples into universal stack or layout defaults;
- reconcile complete setup matrices, legacy input routing, refactor reports, and validation receipts without missing or duplicate fields;
- add the generic intent-bound selector instruction only during setup when evidence proves a stable public skill repository with multiple material workflows; audit only reports it;
- preserve permission, protected-state, risk-based validation, receipt-reuse, portability, host-metadata, public-skill reuse, and evidence-stage boundaries;
- use AC-ADR-050 semantic receipt markers as redundant cues without marking informational, skipped, unavailable, stale, or failed work as verified;
- select a capability-aware `plain` or `enhanced` final-receipt profile, with `interactive` kept as a separate transient progress adapter, without changing the underlying evidence contract;
- keep final receipts meaningful without emoji, color, Unicode width, ANSI, or cursor support, and keep initial activation output compact and host-neutral;
- compare formatting overhead against the same semantic receipt, separating model-token cost from renderer bytes/lines without imposing a decorative hard budget;
- reject host-wrong persistence instructions, preserve repository-native durable artifacts, and report an indeterminate or blocked write path rather than silently writing another host's file;
- keep internal Architecture Compass implementation ADRs in a separately validated namespace, out of the public catalog and target adoption matrix, while routing generalized behavior through exposed ADR triplets; and
- produce public-safe output without private paths, source names, secrets, or unsupported completion claims.

## Eval Artifacts

- `activation-cases.md`: activation and intent-routing examples.
- `rubric.md`: quality and lifecycle hard gates.
- `cases/`: focused text-only cases with deterministic assertions.
- [`legacy-case-lineage.json`](legacy-case-lineage.json): machine-checked disposition and material-expectation mapping for the ten cases removed from the reviewed HEAD snapshot.
- `legacy-case-baseline/1d454f06375f3b74ba506fef54b664a2517674c0/`: byte-locked source copies outside the installed skill payload.
- `runs/YYYY-MM-DD-summary.md`: dated evidence only after the named checks actually ran.

The owning validator binds the lineage to the exact staged-deletion path set and independent HEAD SHA-256 values. Every legacy assertion and expected-behavior bullet maps exactly once to an existing target heading and marker; missing, duplicate, unknown, drifted, or leaked evidence fails validation.

Focused workflow and lifecycle cases:

- `cases/clear-setup-intent.md`
- `cases/clear-audit-intent.md`
- `cases/clear-bounded-refactor-intent.md`
- `cases/clear-plan-refactor-intent.md`
- `cases/clear-plan-run-refactor-intent.md`
- `cases/ambiguous-workflow-selection.md`
- `cases/agent-initiated-audit-authority.md`
- `cases/setup-coverage-matrix.md`
- `cases/audit-strict-read-only.md`
- `cases/refactor-governance-boundary.md`
- `cases/plan-mode-lifecycle.md`
- `cases/plan-mode-unavailable-fallback.md`
- `cases/plan-mode-indeterminate-stop.md`
- `cases/plan-mode-declined-stop.md`
- `cases/chatgpt-plan-live-incident-replay.md`
- `cases/chatgpt-plan-product-label-only.md`
- `cases/chatgpt-plan-missing-slash-not-unavailable.md`
- `cases/chatgpt-plan-goal-and-plan-skill.md`
- `cases/chatgpt-plan-nonslash-native-control.md`
- `cases/chatgpt-plan-mobile-indeterminate.md`
- `cases/chatgpt-plan-observed-slash-handoff.md`
- `cases/chatgpt-plan-none-proven-unavailable.md`
- `cases/chatgpt-plan-observed-control-state-unknown.md`
- `cases/chatgpt-plan-web-slash-control.md`
- `cases/chatgpt-plan-codex-web-observed-slash-handoff.md`
- `cases/chatgpt-plan-codex-web-indeterminate.md`
- `cases/chatgpt-plan-codex-web-none-proven-unavailable.md`
- `cases/chatgpt-plan-official-docs-only-indeterminate.md`
- `cases/plan-run-state-recheck.md`
- `cases/conflicting-adrs-stop.md`
- `cases/stack-deviation-routing.md`
- `cases/approved-decision-no-implementation.md`
- `cases/plan-refactor-save-only-persistence.md`
- `cases/direct-write-permission-gate.md`
- `cases/reentry-material-drift.md`
- `cases/audit-and-pr-review-routing.md`

Focused routed-library cases:

- `cases/adr-catalog-short-first-inventory.md`
- `cases/selective-frontend-routing.md`
- `cases/nextjs-request-routing.md`
- `cases/nextjs-query-write-lifecycle.md`
- `cases/selective-backend-routing.md`
- `cases/source-placement-parity.md`
- `cases/cross-category-adr-routing.md`
- `cases/legacy-input-routing.md`
- `cases/instruction-adr-authority-conflict.md`
- `cases/setup-adoptable-only.md`
- `cases/stale-subagent-reconciliation.md`
- `cases/evidence-stage-claim-limits.md`
- `cases/invalid-missing-triplet.md`
- `cases/invalid-id-collision.md`
- `cases/invalid-metadata-drift.md`
- `cases/invalid-decision-drift.md`
- `cases/invalid-catalog-orphan.md`
- `cases/invalid-legacy-link.md`
- `cases/repo-native-adr-mapping-and-split.md`
- `cases/adr-deviation-warning-stop.md`
- `cases/host-instruction-conventions.md`
- `cases/setup-target-selector-instruction.md`
- `cases/audit-target-selector-report-only.md`
- `cases/portability-taxonomy.md`
- `cases/host-metadata-gating.md`
- `cases/worktree-parallelism-gate.md`
- `cases/public-skill-reuse-consent.md`
- `cases/opinionated-stack-profile-selection.md`
- `cases/proportional-planning-evidence.md`
- `cases/risk-proportional-validation-matrix.md`
- `cases/validation-evidence-reuse.md`
- `cases/refactor-report-receipt-completeness.md`
- `cases/semantic-status-marker-receipts.md`

Focused adaptive-output and governance-boundary cases:

- `cases/adaptive-presentation-profiles.md`
- `cases/receipt-accessibility-fallback.md`
- `cases/compact-initial-activation.md`
- `cases/formatting-overhead-comparison.md`
- `cases/host-wrong-persistence-surface.md`
- `cases/internal-public-adr-namespace-separation.md`

## Lifecycle Evaluation

Clear task intent is selection evidence, not a new approval. The skill exposes all five workflows, announces the matching route and rationale, and proceeds within the user's existing authority. Bare activation, conflicting cues, or ambiguity about outcome, scope, persistence, governance, or mutation authority requires a question. Selection never grants destructive, paid, irreversible, external, deployment, publication, production, or scope-expanding authority.

Plan cases are multi-turn. While native Plan mode is active, repository/workspace artifacts remain read-only. Supported-inactive and indeterminate states require a host transition and confirmed Plan mode; only definitive unavailability permits a portable in-chat fallback. Approved content is persisted only after Plan-mode exit. `plan-run-refactor` then rechecks repository and external state before executing an unchanged plan. ChatGPT Chat, Work, and mobile Plan-required cases must switch, wait, or ask rather than treating ChatGPT identity, missing Codex Plan state, or a missing `/plan` slash as unavailability.

Audit cases perform no repository, untracked, ignored, index, generated-artifact, install, or external mutation. Direct refactor is available only for bounded, reversible work fully governed by accepted local ADRs. Missing governance routes to setup; unresolved durable decisions or broad implementation route to a Plan workflow.

Routed-library cases use the catalog and Short variants for discovery, canonical Long variants for decisions, and Guides only for implementation help. Invalid-library cases are static negative contracts and never authorize repair of their fixture.
