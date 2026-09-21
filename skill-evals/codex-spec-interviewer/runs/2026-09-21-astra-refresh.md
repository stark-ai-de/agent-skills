# Released skills refresh: implementation and CLI pilot

Date: 2026-09-21. Baseline: released `v0.22.0`; integrated runtime review: `6e336877c73752359d1be7140fd4c74e1857bb36`.

All ten released skills were reviewed. Nine have bounded changes; CodeGraph remains unchanged. This receipt separates source/fixture checks from actual CLI conversations. It does not qualify other clients or native UI transitions.

## Changes and preserved boundaries

| Skill                   | Candidate version | Result                                                                                                                          |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Codex Spec Interviewer  | 0.4.0             | One reviewed-content checkpoint, retained approval across mode exit, conversational fallback and explicit chat-only completion. |
| Claude Spec Interviewer | 0.3.0             | Same lifecycle; execution-host tools remain separate from the Claude target runtime.                                            |
| Cursor Spec Interviewer | 0.3.0             | Same lifecycle; older hosts use conversation without invented native controls.                                                  |
| Codex Memory Curator    | 0.2.3             | Intent-matched routing and requested-scope review; redacted config discovery scans beyond line 220.                             |
| Claude Memory Curator   | 0.2.2             | Conditional native AGENTS.md loading, unverified candidate inventory, scoped settings evidence and retained import fallback.    |
| Cursor Memory Curator   | 0.2.2             | Intent-matched routing, scoped review and reusable bounded approval.                                                            |
| Architecture Compass    | 0.7.0             | Accepted AC-ADR-064 succeeds AC-ADR-048; five workflows, audit boundaries and governance-before-execution remain.               |
| drawio-diagrams         | 0.7.5             | Shorter discovery description, compact routing and reuse of exact existing approval. Renderer logic unchanged.                  |
| animated-readme-logo    | 0.5.4             | Shorter discovery description and reuse of exact authority, including separate provider/spend/overwrite boundaries.             |
| codegraph-ast-grep      | unchanged         | Existing bounded workflows and discovery remain suitable; no justified runtime change.                                          |

Plugin version becomes `1.3.0`; canonical skill metadata is copied unchanged by projection generation. Root release version remains `0.22.0`. AC-ADR-064 leaves 059–063 to the separate open work; integrating those branches still requires reconciling shared version, inventory and projection changes.

The three interviewers share 22 scenario contracts for approval reuse, prior answers, native approval, mode exit, chat delivery, Proposed versus Accepted ADRs, overwrite/destination drift, bounded revision, older hosts and unanswered async questions. Structural validators and positive/negative fixtures catch contract drift; they do not run these scenarios as model conversations.

## Documentation and comparison basis

The documentation pass covered all four host families. Primary sources support capability detection and bounded, on-demand references rather than model-name assumptions:

- [Codex/Astra skill guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) and [Codex CLI controls](https://developers.openai.com/codex/cli/slash-commands).
- [ChatGPT skill authoring](https://learn.chatgpt.com/docs/build-skills) and [client changelog](https://learn.chatgpt.com/docs/changelog).
- [Claude memory and conditional AGENTS.md](https://code.claude.com/docs/en/memory#agents-md), [tools](https://code.claude.com/docs/en/tools-reference), [permission modes](https://code.claude.com/docs/en/permission-modes), and [skills](https://code.claude.com/docs/en/skills).
- [Cursor Plan mode](https://cursor.com/docs/agent/plan-mode), [CLI controls](https://cursor.com/docs/cli/using), and [skills](https://cursor.com/docs/skills).

Comparisons informed explicit baseline/candidate evaluation, progressive disclosure and conditional planning. Detailed named comparisons remain local under the repository provenance policy. No third-party skill text, scripts or assets were copied. New renderers, conversion formats, providers and host-specific portable frontmatter were not added.

## Actual conversation method

The [sanitized transcript and identity receipt](2026-09-21-astra-refresh.json) contains fixed synthetic prompts, answer cards, all final assistant responses, skill-file hashes, artifact hashes, elapsed time and raw CLI usage snapshots.

- CLI `0.154.0`, model `gpt-6-astra`, reasoning `low`; identical process configuration across arms.
- Three tasks, each run with released skill, candidate skill and no skill: nine conversations and 21 completed turns. Candidate interviewer bytes are from `0ba4273` and unchanged at the integrated review commit.
- Real `codex exec resume` continuation with each exact session identifier. The skill arms explicitly read a fixture-local copy; this does not test implicit skill discovery.
- Isolated disposable fixtures with the same README and existing `docs/specs/`; no application or dependencies. Web search, memories, apps, plugins, skill search, hooks and multi-agent were disabled. All 52 discovered skill paths were disabled, and project instruction auto-loading was disabled. Built-in harness and managed environment instructions remained common to all arms.
- Prompt preflight and all nine actual session contexts contained no skill catalog or memory summary. Session model records matched Astra. This supports the no-skill comparison within this CLI setup.
- File snapshots and command events were inspected after each turn. Raw logs, session identifiers and local paths remain private. One released first turn hit the account quota before producing an answer; its successful restarted run is recorded and the interrupted attempt was not scored.

Native Plan was not exposed in this test client. There were zero native Plan prompts; native permission UI was not instrumented. Parent orchestration approvals are not skill questions. Usage reports on continuation can be cumulative and must not be summed as independent per-turn token counts.

## Observations

| Task                                                          | Turns per arm | Required interaction                                                 | Released / candidate / no-skill result                                                                  |
| ------------------------------------------------------------- | ------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Known save destination; revise default and maximum, then save | 2             | One full-draft checkpoint followed by the bounded revision/save card | All saved one requested spec only after approval; no repeated approval.                                 |
| Product answers already supplied                              | 2             | One full-draft checkpoint covering explicit parsing assumptions      | All reused supplied decisions and saved after the approval card; no repeated product or save question.  |
| Explicit chat-only delivery                                   | 3             | Open product choices, complete draft, fixed final approval card      | All asked relevant open questions and wrote no files. Candidate reports chat-only delivery as complete. |

Across the completed traces: no lost supplied material decision, no unapproved fixture write, no feature implementation, no invented test execution, and no repeated approval of an unchanged result were observed. Each saved spec retains compatibility, bounded behavior, validation and the no-implementation boundary. The chat-only task asked three groups of product questions in both skill arms and four groups in the no-skill arm; grouping differs, so that is not a demonstrated reduction in decision burden.

The released chat-only turn 2 says the requested draft is complete but its normal saved-artifact completion criterion remains unmet. The candidate instead reports `Persistence status: not requested`, keeps unreviewed parsing details visible, and confirms chat-only completion after the final answer card.

**The pilot did not reproduce duplicate save approval in the released CLI skill. It establishes regression evidence for this fallback path, not measured elimination of the reported native-client problem. No latency or token improvement is claimed; candidate responses were sometimes longer.** Native approval transitions, async silence, ADR acceptance, overwrites and target-state drift remain scenario/structural coverage, not live behavioral proof. The same applies to ChatGPT, Claude Code and Cursor; documentation agreement does not establish runtime qualification.

## Validation and independent review

At the integrated candidate, focused skill, memory-curator, Architecture Compass, ADR, projection, plugin-evaluation, OpenAI listing/identity, release-descriptor, script, lint and release-intent checks passed. Curator executable fixtures cover late configuration signals, redaction, conditional Claude candidates, settings scope, rule-file classification and existing backup safety. Draw.io, logo and unchanged CodeGraph checks also passed within their owning boundaries. The root aggregate is reserved for mandatory hosted Validate rather than duplicated as a local finalization ritual.

Independent read-only Standards and Spec reviews at `6e336877` reported zero remaining actionable findings. Earlier family reviews found stale evaluation wording and a Claude rule-file classification edge case; both were fixed and rechecked before integration. Hosted CI and the final PR head are reported on the pull request; this receipt is not release or publication evidence.
