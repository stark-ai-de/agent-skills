# Codex CLI Rollout Timeout Boundary

## Should Trigger

Yes.

## Prompt

During `codex-cli-all` training for `$drawio-diagrams`, nested `codex exec` hung after trying shell and file-editing tools. Update the SkillOpt target rollout path so one target case cannot deadlock the trainer or hang during timeout cleanup.

## Expected Behavior

- Activate `skillopt-setup`.
- Explain that Codex CLI target rollouts must be bounded, no-tool, and final-response-only inside the nested rollout.
- Normalize `$drawio-diagrams` and `@drawio-diagrams` in task prompts to the provided skill body instead of installed skill registries.
- Seed only the needed local scripts, references, and declared fixtures into the isolated rollout workspace.
- Configure `codex exec` with `stdin` closed, no full-auto tool loop, approval policy `never`, no web search, no network access by default, and minimal reasoning effort.
- Run nested Codex CLI in a process group and clean it up with timeout, `SIGTERM`, then `SIGKILL` if needed.
- On timeout, avoid workspace traversal, artifact collection, or recursive cleanup that could hang; preserve only a redacted workspace path for debugging.
- Treat timeout or nonzero target rollout exit as a runtime scoring failure, not as a semantic judge pass.
- Do not print raw transcripts, auth material, or private local paths.
