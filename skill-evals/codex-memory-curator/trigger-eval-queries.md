# Trigger Eval Queries

Use this compact set to check whether `codex-memory-curator` activates only for memory work.

| ID  | Should trigger | Query                                                                                              |
| --- | -------------- | -------------------------------------------------------------------------------------------------- |
| T1  | Yes            | Use $codex-memory-curator to audit my Codex memories for stale repo rules.                         |
| T2  | Yes            | Review `~/.codex/memories` and tell me which entries should move to AGENTS.md.                     |
| T3  | Yes            | I think old memories are making Codex use the wrong test command in new repos.                     |
| T4  | Yes            | Check my Codex memory config and recommend whether injection should be disabled for this refactor. |
| T5  | Yes            | Find sensitive or secret-like values in the synthetic Codex memory fixture.                        |
| T6  | Yes            | Decide whether these memory entries belong in memory, repo docs, a skill, config, or deletion.     |
| T7  | Yes            | Memory pollution is causing bad assumptions; prepare a `review-chat` result.                       |
| T8  | Yes            | Create an ID-by-ID cleanup plan for stale Codex memory entries, but do not edit yet.               |
| T9  | No             | Clean up this README and make the docs easier to scan.                                             |
| T10 | No             | Improve this prompt so Codex writes better tests.                                                  |
| T11 | No             | Refactor this TypeScript module to remove duplication.                                             |
| T12 | No             | Add an AGENTS.md file for this repo from the current package scripts.                              |
| T13 | No             | Review my PR for bugs and missing tests.                                                           |
| T14 | No             | Summarize the architecture decisions in `docs/adrs/`.                                              |
| T15 | No             | Tune my shell aliases and terminal prompt.                                                         |
| T16 | No             | Install a third-party skill from a GitHub repository.                                              |
