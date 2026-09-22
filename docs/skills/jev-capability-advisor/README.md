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

**[Explore the benchmarks](benchmarks/README.md)** for the selection-speed comparison, feature overview and 6,000+ recorded benchmark executions across development iterations. The website presents these in a separate visual section below this guide.

## Scope

The agent supplies the current catalog and controls loading, permissions and execution. This release candidate does not automatically intercept ordinary prompts. Compound advice remains experimental, and omitted candidates can limit results.

Read the [skill instructions](../../../skills/skill-maintenance/jev-capability-advisor/SKILL.md) for the operational workflow and [evaluation record](../../../skill-evals/jev-capability-advisor/README.md) for qualification and known limits.
