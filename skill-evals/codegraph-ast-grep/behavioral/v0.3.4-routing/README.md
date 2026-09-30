# v0.3.4 routing capture

Six fresh, isolated Codex CLI runs exercise direct `setup` and `update` requests, the canonical `agents/openai.yaml` starter prompt with clear setup/update additions, the bare starter, and the starter with an explicit options request. The manifest binds the complete canonical skill payload, including `SKILL.md` and `agents/openai.yaml`, plus each prompt, final answer, grading record, and sanitized event summary. The owning validator recomputes 36 routing assertions.

The runs used `codex-cli 0.159.0`, explicit model `gpt-6.1-sol`, `--ephemeral --ignore-user-config --ignore-rules -s read-only --json`, and an isolated `HOME`. `CODEX_HOME` supplied authentication, while user configuration was ignored. Only the canonical skill and task-routed references were read. No real setup or update was possible in the synthetic `/workspace/sample-app` fixture.

`events.json` files expose the completed thread, allowlisted file reads, and the SHA-256 of the locally retained raw JSONL. They omit tool output and private host paths. Captured final messages were normalized only by repository Markdown formatting and trailing newline; no words or claims were edited. A composed CLI prompt does not prove behavior of the native Codex starter UI. Each case is one model sample, not a reliability distribution. Historical v0.3.3 and v0.2 evidence remains unchanged.
