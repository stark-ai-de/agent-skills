# Offline Update Check

## Should Trigger

Yes.

## Prompt

Use my installed CodeGraph and ast-grep to map this refactor, but this machine is offline and `DO_NOT_TRACK` is set. Do not contact registries or GitHub.

## Expected Behavior

- Inspect local paths, versions/help, and ast-grep config without network access; explain the generated-state boundary and obtain affirmative approval for the selected root or an approved disposable copy before graph status/queries.
- Report remote update state as `not checked` because offline/opt-out policy applies.
- Do not invoke `codegraph upgrade --check`, package metadata commands, web search, or a fallback registry/API.
- Do not imply the installed versions are current.
- Continue with installed help/exposed capabilities and a clearly labeled degraded/legacy path when needed.
- Do not re-prompt for remote update checks during the task.
- Preserve semantic/structural evidence, rewrite approval, and project-validation rules.
