# Start Review-Swarm Lab in Codex Cloud

## Steps in the ChatGPT/Codex UI (one-time)

1. Open https://chatgpt.com/codex and select **Work in > Cloud > Select environment**. Choose the existing environment for stark-ai-de/agent-skills. If none exists, Create environment and select that GitHub repository. Cloud environments are published via the web/desktop setup UI, **not** by adding a config file to GitHub.
2. Ensure the selected starting branch is codex/review-fix-swarm-pilot-20261013 (PR https://github.com/stark-ai-de/agent-skills/pull/146). Verify it contains references/cloud-master-handover.md, not a stale main checkout.
3. Ask the setup assistant to check Node >=24.18.0, Git, and the repository's pnpm/Bun toolchain. Install missing tools only during setup. The starter fixture kit uses only Node built-ins and Git: **no Python installation is required**.
4. Require an enforced read-only parent/session for reviewers and a separate later writing phase; subagents inherit parent sandbox/approval settings. READ-ONLY instructions alone are insufficient. If this environment cannot enforce the split, record BLOCKED before starting agents. Verify source/index/HEAD fingerprints before and after review. Ensure native Codex subagents actually work in this Cloud environment; choose affordable available reviewer models such as gpt-6-luna/medium and a maximum of four spawned threads. Do not assume local ~/.codex/config.toml transfers. No Astra.
5. Pi is **optional**. A locally installed Pi CLI or OAuth login does not transfer to Codex Cloud. To run HYBRID, install Pi in this environment setup, verify authenticated noninteractive CLI access, and provide any required provider credentials via Cloud environment secrets/Personal vault. Never commit tokens. If Pi is unavailable, the Master must record B as blocked while continuing A.
6. Keep agent-phase internet restricted. Setup can install approved packages through package-manager domains. Allow additional runtime domains only for a demonstrated need, with least-privilege domain restrictions.
7. Let Codex test setup, **Publish** (or **Republish** changed setup), then start a NEW Cloud task. Paste [cloud-master-handover.md](cloud-master-handover.md) as its first prompt. No local computer or terminal required for running the task.

Documentation: [Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments) · [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) · [Codex cloud CLI](https://learn.chatgpt.com/docs/cli/reference).

## Default execution architecture

```text
Cloud Master task
  -> native fresh-context reviewers/fixture runners in the same cloud VM
  -> one writer per disposable fixture
  -> mechanical grader + semantic independent evaluator
  -> revised prompt -> new fixture cases -> rerun on identical snapshots
  -> update the existing PR with measured evidence
```

Second-layer independent cloud tasks are **optional and unverified**. Only try codex cloud exec after a real authentication and permissions test. No undocumented cloud-to-cloud delegation assumptions.

## Starter CLI in the Cloud task

    node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs selftest
    node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs list

For a disposable case, first select a NEW, nonexisting directory:

    node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs prepare --case duplicate-validators --out /tmp/swarm-fixture-A

After the ACTUAL swarm has changed the fixture code:

    node incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs grade --case duplicate-validators --dir /tmp/swarm-fixture-A

Initially that simplification case has green tests and returns `needs_semantic_review` (exit 3, `passed: null`, `simplified: null`). A whole-diff semantic evaluator must establish actual deduplication; the mechanical grader never supplies that verdict.

## Operational boundaries

- Tasks are isolated Cloud workspaces, but spawned subagents **within one task** inherit the parent permissions. Enforce read-only review separately from the later writer; directory names and prompts alone do not enforce it.
- Other GitHub repositories require their own access, branch snapshots, runtimes and test commands. The agent-skills environment alone suffices for the synthetic pilot.
- The experiment is bounded, not scheduled perpetually. Its durable evidence belongs in Git/PR, not only in ephemeral Cloud task files.
