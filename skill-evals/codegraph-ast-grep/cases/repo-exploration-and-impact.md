# Repo Exploration and Impact

## Should Trigger

Yes.

## Prompt

Use CodeGraph to find where the billing webhook flow enters the app, what it calls, and which tests are likely affected if I change validation.

## Expected Behavior

- Trigger because the user asks for CodeGraph-based repo exploration and impact analysis.
- Check graph health before relying on results.
- Use CodeGraph search, callers/callees, node details, trace when useful, and impact or affected-test commands.
- Read source files only after CodeGraph narrows the likely edit surface.
- Report findings, impacted files, validation commands, and remaining uncertainty.
