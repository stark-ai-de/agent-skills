# Jev Capability Advisor

**Find the right skill or tool for the task in front of you.**

Jev Capability Advisor recommends capabilities from the catalog your agent actually has available. The default `general` profile compares skills and tools and can attempt up to three complementary recommendations for a compound request. Explicit `next_skill` mode answers a narrower question: **which one skill should the agent consider next?** No suitable capability, missing context and provider failures remain distinct outcomes.

## Why use it?

- **Skills and tools together.** Compare an installed workflow with an available MCP or host tool for the task you want to accomplish.
- **Choose the scope explicitly.** Ask for one next skill when that is all you need; keep the default profile for skills/tools and complete capability coverage. One next skill never means the rest of the task is covered.
- **Clear outcomes.** Selection, no suitable capability, clarification and provider failures stay distinct. Prematurely stopped compound plans remain incomplete.
- **Compact advice, complete selected descriptions.** Keep the full diagnostic receipt locally and return only relevant recommendations, conditions and coverage to the host.
- **Reuse preparation across tasks.** An owner-process interface keeps HTTPS ready and reuses a bounded search index while each task brings a fresh host catalog.
- **Inspect the decision boundary.** Candidate coverage, requests, timing and provider usage are recorded. Your host controls loading, permissions and execution.

## Install and use

**Approved scope:** optional, requested capability advice and offline inspection are [accepted for public catalog promotion](../../../skill-evals/jev-capability-advisor/README.md#promotion-decision). The following installation command applies once the skill is available on the repository's default branch; versioned packages and the plugin-directory update follow the separate release steps below.

```sh
npx skills@latest add stark-ai-de/agent-skills --skill jev-capability-advisor -g -a codex
```

The standalone package uses the portable Agent Skills format and can also be installed with `-a cursor` or `-a claude-code`. **Earlier Codex qualification covered explicit on-demand invocation** of the pre-session candidate, not automatic interception. The new session runtime and other hosts need their own qualification; installation alone is not runtime evidence.

Then ask:

> Use $jev-capability-advisor to recommend the available skills or tools for reviewing this pull request and independently inspecting its deployment logs.

Or keep the first check entirely local:

> Use $jev-capability-advisor to inspect the candidates for this task without calling TypeSafe.

The helper needs **Python 3.10+**; it has no third-party Python dependencies, router service or embedding-model download. A fresh Jev recommendation uses your own TypeSafe API key and sends the supplied task plus bounded public capability cards to TypeSafe. Offline inspection needs no key or network. Configure credentials locally; never paste or commit them. The agent needs a **current host-supplied catalog**: files on disk alone do not establish which tools are available. See the [catalog and CLI contract](../../../skills/skill-maintenance/jev-capability-advisor/references/contract.md).

This update also prepares the skill for **Codex in stark AI Developer 1.3.0**. Archive qualification and plugin-directory publication are separate stages; a locally built archive does not mean the directory already carries this update.

## One next skill, explicitly

| What you need                           | Profile                 | What the answer covers                                             |
| --------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| Skills and tools for the requested work | `general` (default)     | One to three recommendations; compound advice remains experimental |
| One eligible skill to load next         | `next_skill` (explicit) | Exactly one next skill, with remaining work unassessed             |

For the narrower workflow, ask:

> Use $jev-capability-advisor in next-skill mode: recommend just one skill to load next for this task. Leave the remaining work unassessed.

When the skill's catalog and credentials are already configured, the corresponding command is:

```sh
python3 scripts/jev_advisor.py --catalog /path/to/skill-catalog.json \
  --query-file /path/to/task.txt --selection-profile next_skill \
  --summary --output /path/to/local-receipt.json
```

Run it from the installed skill directory. Use the existing `TYPESAFE_API_KEY`, or add `--key-file /path/to/local-key`; never put the key itself in the command.

- **Explicit scope.** The user or host chooses this profile. The helper never silently switches the requested scope.
- **Skills only.** Every enabled catalog entry must be a skill. Disabled tools may remain; enabled tools produce an input error. Keep mixed inventory intact and use `general` for it.
- **One choice question.** An uncached next-skill recommendation uses at most one provider call. It does not estimate the total number of required capabilities or ask follow-up selection questions.
- **Clear remaining work.** Success uses `status: next_skill` and `additional_work: unassessed`. The host checks relevance and restrictions before loading the skill and remains responsible for other deliverables. No-match and clarification remain valid distinct outcomes.

The catalog still has bounded candidate coverage and request sizes. In the independently confirmed [next-skill comparison](benchmarks/README.md#next-skill-input-efficiency), this mode used **6.3% less provider input than both measured Hussi variants**, with 48/48 skill choices and 16/16 no-match decisions correct. This measures selection input, not total agent tokens or complete-task speed.

## Repeated advice and automatic integration

For a host integration, use the [Python/NDJSON session interface](../../../skills/skill-maintenance/jev-capability-advisor/references/session-integration.md). It reuses a healthy HTTPS connection and an unchanged catalog’s derived search index across tasks, keeps credentials local and validates fresh eligible capabilities with every request. It does not cache model decisions. Single general-profile CLI invocations also reuse their connection for compound follow-ups. A host explicitly choosing next-skill advice sets `AdvisorSession(selection_profile="next_skill")` or the equivalent process flag once; request frames cannot change that profile.

**Automatic interception still needs host qualification.** The session runtime supplies the integration building block; installing the skill or plugin does not install a pre-prompt hook. Current Codex discovery interfaces do not expose every effective skill and tool eligibility restriction. A host must supply authoritative inventory, demonstrate the callback and advice delivery, and retain native fallback before automatic use is claimed.

## Benchmarks and benefits

**[Explore the benchmarks](benchmarks/README.md)** for the confirmed next-skill input advantage and the 6.40× Native selection comparison, including sample sizes, measurement windows and limitations. The measurements belong to the linked recorded runtime snapshot; later catalog-validation and alias-punctuation fixes have not been live rebenchmarked.

The next-skill profile used less selection input than both measured Hussi variants. Our unpublished pooled-HTTPS control remains slightly faster; the complete results disclose it alongside the three public comparison choices.

[Product features and measured selection](benchmarks/README.md#product-features-and-measured-selection) distinguishes source-inspected capabilities from the specific paths timed in the comparison.

## Scope

The agent supplies the current catalog and controls loading, permissions and execution. The skill does not automatically intercept ordinary prompts. General compound advice remains experimental, and omitted candidates can limit either profile. Next-skill advice deliberately leaves additional work unassessed and does not replace a complete plan.

Read the [skill instructions](../../../skills/skill-maintenance/jev-capability-advisor/SKILL.md) for the operational workflow and [evaluation record](../../../skill-evals/jev-capability-advisor/README.md) for qualification and known limits.

## Release handoff

**Promotion accepted on 2026-09-25 for optional, requested advice and offline inspection.** The [promotion decision](../../../skill-evals/jev-capability-advisor/README.md#promotion-decision) records the evidence for all four ADR-0008 criteria. Merge may proceed after current checks pass. Versioned release and plugin-directory publication remain the steps below; automatic host interception remains separately unqualified.

| Component              | Prepared version                    | Distribution                                                                     |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Jev Capability Advisor | `0.1.0`                             | Standalone Agent Skill; optional `dist/skills/jev-capability-advisor.zip`        |
| stark AI Developer     | `1.3.0`                             | Seven skills in the portable and OpenAI plugin packages; Jev targets CODEX       |
| Catalog                | Next generated minor after `0.22.0` | Release Please owns the final version and changelog; no manual root version bump |

The source allowlist, generated portable copy, OpenAI listing and submission worksheet already include Jev. The skill needs Python 3.10+, a current host-supplied catalog and the user's TypeSafe key for fresh recommendations. Offline inspection needs no key. Installation does not install an automatic prompt hook; Session's connection and index reuse need a retained process.

### Maintainer steps

1. **Merge the approved feature PR after passing checks.** Confirm the [accepted scope](../../../skill-evals/jev-capability-advisor/README.md#promotion-decision), successful checks on the current head and resolved review threads.
2. **Review the generated release PR.** After the feature merge, let Release Please refresh its draft and confirm the Jev change is included. It owns exactly `package.json`, `.release-please-manifest.json` and `CHANGELOG.md`. If no draft exists, use `pnpm run release:manage -- release-pr --confirm` from protected `main`. Merge the reviewed, passing release PR.
3. **Approve GitHub publication.** Inspect the automatically started Publish Release readiness job, then approve its waiting `release` environment deployment. Wait for publication and exact-tag Post-release Evidence to pass. Check the production Pages deployment separately. The release preserves `openai.zip`, `portable.zip` and `release-subject.json` as direct assets.
4. **Update the existing OpenAI plugin.** Run `pnpm run release:manage -- openai-handoff --tag <ACTUAL_TAG>` and upload that release's exact `openai.zip`. Follow the [seven-skill update checklist](../../listing/openai/stark-ai-developer-first-publication.md#jev-update-handoff). A local ZIP is preparation proof, not the portal upload source. Complete portal review and publication manually.
5. **Verify public installation, then announce.** Test the standalone command above and an eligible Codex plugin install/update. Confirm Jev's instructions, scripts and allowed invocation work; verify directory identity and the live benchmark page. Record sanitized lifecycle evidence using the [publishing runbook](../../publishing.md#post-release-evidence-and-lifecycle-lanes). Publish the launch post only after the distribution it advertises is available.
