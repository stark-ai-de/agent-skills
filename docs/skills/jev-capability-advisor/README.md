# Jev Capability Advisor

**Find the right skill or tool for the task in front of you.**

Jev Capability Advisor recommends capabilities from the catalog your agent actually has available. One focused task gets a focused recommendation; the experimental compound mode can attempt up to three complementary recommendations. No suitable capability, missing context and provider failures remain distinct outcomes.

## Why use it?

- **Skills and tools together.** Compare an installed workflow with an available MCP or host tool for the task you want to accomplish.
- **Clear outcomes.** Selection, no suitable capability, clarification and provider failures stay distinct. Prematurely stopped compound plans remain incomplete.
- **Compact advice, complete selected descriptions.** Keep the full diagnostic receipt locally and return only relevant recommendations, conditions and coverage to the host.
- **Reuse connections across tasks.** An optional owner-process interface keeps HTTPS ready while each task brings a fresh host catalog.
- **Inspect the decision boundary.** Candidate coverage, requests, timing and provider usage are recorded. Your host controls loading, permissions and execution.

## Install and use

**Release preparation:** the catalog and plugin changes are proposed together. Production promotion still requires the [quality and utility gate](../../../skill-evals/jev-capability-advisor/README.md#promotion-gate). The following installation command applies after publication.

```sh
npx skills@latest add stark-ai-de/agent-skills --skill jev-capability-advisor -g -a codex
```

The standalone package uses the portable Agent Skills format and can also be installed with `-a cursor` or `-a claude-code`. **Earlier Codex qualification covered explicit on-demand invocation** of the pre-session candidate, not automatic interception. The new session runtime and other hosts need their own qualification; installation alone is not runtime evidence.

Then ask:

> Use $jev-capability-advisor to recommend the available skills or tools for reviewing this pull request and independently inspecting its deployment logs.

Or keep the first check entirely local:

> Use $jev-capability-advisor to inspect the candidates for this task without calling TypeSafe.

The helper needs **Python 3.10+**; it has no third-party Python dependencies, router service or embedding-model download. A fresh Jev recommendation uses your own TypeSafe API key and sends the supplied task plus bounded public capability cards to TypeSafe. Offline inspection needs no key or network. Configure credentials locally; never paste or commit them. The agent needs a **current host-supplied catalog**: files on disk alone do not establish which tools are available. See the [catalog and CLI contract](../../../skills/skill-maintenance/jev-capability-advisor/references/contract.md).

This release candidate also prepares the skill for **Codex in stark AI Developer 1.3.0**. Archive qualification and plugin-directory publication are separate stages; a locally built archive does not mean the directory already carries this update.

## Repeated advice and automatic integration

For a host integration, use the [Python/NDJSON session interface](../../../skills/skill-maintenance/jev-capability-advisor/references/session-integration.md). It reuses a healthy HTTPS connection across different tasks, keeps credentials local and accepts fresh eligible capabilities with every request. Single CLI invocations also reuse their connection for compound follow-ups.

**Automatic interception still needs host qualification.** The session runtime supplies the integration building block; installing the skill or plugin does not install a pre-prompt hook. Current Codex discovery interfaces do not expose every effective skill and tool eligibility restriction. A host must supply authoritative inventory, demonstrate the callback and advice delivery, and retain native fallback before automatic use is claimed.

## Benchmarks and benefits

**[Explore the benchmarks](benchmarks/README.md)** for the selection-speed comparison, feature overview and 7,000+ recorded benchmark executions across development iterations. The website presents these in a separate visual section below this guide.

**[Why routing speeds differ](benchmarks/README.md#why-routing-speeds-differ):** a short technical table compares Hussi9, Jev Fresh Connection and reusable Jev sessions, including confidence thresholds and connection reuse.

## Scope

The agent supplies the current catalog and controls loading, permissions and execution. This release candidate does not automatically intercept ordinary prompts. Compound advice remains experimental, and omitted candidates can limit results.

Read the [skill instructions](../../../skills/skill-maintenance/jev-capability-advisor/SKILL.md) for the operational workflow and [evaluation record](../../../skill-evals/jev-capability-advisor/README.md) for qualification and known limits.

## Release handoff

**Prepared for review; production promotion is still open.** The [promotion gate](../../../skill-evals/jev-capability-advisor/README.md#promotion-gate) requires representative native workflow benefit. The selector benchmark does not establish faster complete agent tasks. Plugin inclusion and a green build do not replace that decision.

| Component              | Prepared version                    | Distribution                                                                     |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Jev Capability Advisor | `0.1.0`                             | Standalone Agent Skill; optional `dist/skills/jev-capability-advisor.zip`        |
| stark AI Developer     | `1.3.0`                             | Seven skills in the portable and OpenAI plugin packages; Jev targets CODEX       |
| Catalog                | Next generated minor after `0.22.0` | Release Please owns the final version and changelog; no manual root version bump |

The source allowlist, generated portable copy, OpenAI listing and submission worksheet already include Jev. The skill needs Python 3.10+, a current host-supplied catalog and the user's TypeSafe key for fresh recommendations. Offline inspection needs no key. Installation does not install an automatic prompt hook; Session's connection reuse needs a retained process.

### Maintainer steps

1. **Close the promotion gate, then merge the feature PR.** Review the [evaluation record](../../../skill-evals/jev-capability-advisor/README.md), supported scope and exact-head checks. Do not merge the proposed public promotion while the gate remains open. Review and resolve the explanatory PR threads.
2. **Review the generated release PR.** After the feature merge, let Release Please refresh its draft and confirm the Jev change is included. It owns exactly `package.json`, `.release-please-manifest.json` and `CHANGELOG.md`. If no draft exists, use `pnpm run release:manage -- release-pr --confirm` from protected `main`. Merge the reviewed, passing release PR.
3. **Approve GitHub publication.** Inspect the automatically started Publish Release readiness job, then approve its waiting `release` environment deployment. Wait for publication and exact-tag Post-release Evidence to pass. Check the production Pages deployment separately. The release preserves `openai.zip`, `portable.zip` and `release-subject.json` as direct assets.
4. **Update the existing OpenAI plugin.** Run `pnpm run release:manage -- openai-handoff --tag <ACTUAL_TAG>` and upload that release's exact `openai.zip`. Follow the [seven-skill update checklist](../../listing/openai/stark-ai-developer-first-publication.md#jev-update-handoff). A local ZIP is preparation proof, not the portal upload source. Complete portal review and publication manually.
5. **Verify public installation, then announce.** Test the standalone command above and an eligible Codex plugin install/update. Confirm Jev's instructions, scripts and allowed invocation work; verify directory identity and the live benchmark page. Record sanitized lifecycle evidence using the [publishing runbook](../../publishing.md#post-release-evidence-and-lifecycle-lanes). Publish the launch post only after the distribution it advertises is available.

### Release-note draft

> Adds Jev Capability Advisor 0.1.0 to the public catalog and stark AI Developer 1.3.0. It recommends available skills and MCP tools, supports local inspection and provides a reusable session interface for host integrations. The compact initial request selected in 406 ms versus 433 ms for our previous format in an interleaved single-skill comparison, with 80/80 correct accepted selections. An earlier revision measured 0.733 s versus 4.314 s for the native GPT-6 Astra low selector in separate runs. These are separate selection studies, not end-to-end task timings. Hosts retain activation, permissions and execution; automatic interception needs separate qualification and compound advice remains experimental.

Use this draft after promotion is approved. The exact version, changelog and release subjects come from the reviewed generated release candidate; the [publishing runbook](../../publishing.md#release-artifacts) owns packaging and publication procedures.
