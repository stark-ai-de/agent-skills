# cursor-spec-interviewer evaluation evidence

`cases/` contains trigger, target-runtime and host-capability scenarios. `rubric.md` defines the current outcome criteria. Historical `runs/` are dated records, not current proof.

## Shared approval regression matrix

Run [approval-scenarios.json](../codex-spec-interviewer/approval-scenarios.json) against all three interviewer targets. It supplies fixed context, prompts, answer cards and required/forbidden observations for prior authority, native/manual exit, revisions, destination drift, ADR status, chat delivery, async pending answers and older hosts.

Use real conversation continuation for interactive evidence. Preserve material decisions while counting duplicate questions and avoidable mode interruptions. Separate native UI prompts from skill-generated questions. Test actual saved artifacts and permissions; do not score expected text as execution.

## Evidence boundaries

`validate:skills` checks structural consistency, metadata, template records and scenario inventory. Case assertions are evaluator expectations, not live passes. Parent PR evidence records the bounded Codex/Astra pilot separately; a CLI result does not prove ChatGPT, Claude Code, Cursor or native UI behavior. Historical case filenames are retained for compatibility even where the current expected lifecycle changed.
