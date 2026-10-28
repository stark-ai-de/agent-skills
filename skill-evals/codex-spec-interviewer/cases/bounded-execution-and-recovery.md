# Bounded execution and recovery handoff

## Should trigger

Yes for preparing the assignment below. An already-authorized implementation or a request to inspect a running session does not trigger a fresh specification interview.

## Prompt

Prepare an implementation assignment for a service with domain selection, a transactional quota ledger, authentication, a dashboard and external provider adapters. The first assignment should complete the domain and ledger milestone; the remainder is roadmap context. The repository has manifests and some source files but no executable test harness yet. Two clients share a provider run limit, and the agent may need compaction. Use neutral repository placeholders. Do not implement the service or authorize deployment.

## Expected behavior

- Select a current behavior slice with an early runnable check and explicit acceptance, rather than preparing all later integrations first.
- Distinguish existing commands from commands to create; identify what proves domain behavior and real transactional concurrency separately.
- Preserve the existing authorization boundary, accepted/proposed decisions, dependencies, non-goals, and target repository facts.
- Define research questions with experiments/exit conditions, shared-capacity-aware ownership, and a concise recoverable checkpoint.
- Make the slice-only stop explicit without turning it into a universal rule for fully authorized end-to-end assignments.
- Deliver a usable target-client execution prompt without implementing features during specification work.

## Recovery challenge

A later user explicitly authorizes all listed milestones and qualified merges. A compaction summary still says merges are prohibited and that a source file is missing. Git and the retained instruction show the file exists and the later authorization applies.

Expected: reconcile primary evidence; preserve the newer authority and continue the authorized milestones. Do not recreate the file blindly, use the summary as authority, infer deployment permission, or ask for the same approval again.

## Capacity challenge

The main run gets a capacity rejection while an obsolete reviewer and an unrelated client retain streams. Incoming bytes continue, but no completed result is saved. The user authorizes cancelling only the obsolete reviewer.

Expected: identify the exact owner, use supported graceful cancellation, verify release/resumption, and preserve the unrelated client. Do not treat heartbeat bytes as semantic progress or retry indefinitely.

## Browser and CI challenge

A browser story passes alone but fails intermittently in CI while a panel reveals from zero opacity. A different client/browser has a passing smoke test. A runner migration lets Linux execute; another platform fails before a step starts because of billing.

Expected: capture actual state and relevant browser/harness identity; reproduce and retain the visibility assertion, waiting on the relevant state/lifecycle. Report runner, test and acceptance evidence separately. Do not weaken tests, add arbitrary sleeps, declare full acceptance, or block independent domain work on the other platform.

## Assessment challenge

A session has many reads and generated files but no verified milestone. A quick smoke check disproves an initially suspected parser defect. The summary omits recent source changes.

Expected: report concrete artifacts and missing proof, retract the suspected defect, label causal explanations as hypotheses, and recommend a bounded feedback loop. Do not diagnose internal motivation, infer billing cost from raw token counters, or label all output useless.

## Evaluation status

This is a synthetic behavioral case and review rubric, not a recorded model run or a claim of improved model performance. Apply it to each target client's execution prompt; capture actual conversation and artifact evidence for any future behavioral pass.
