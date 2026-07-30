# Ambiguous Workflow Behavioral Prompt

You are a clean-context behavioral-eval agent. Read
`skills/engineering-workflows/codegraph-ast-grep/SKILL.md`. Do not read its
references because no workflow has been selected. Do not inspect tool or
repository state, execute analysis tools, contact the network, or change files.
Respond directly to the user prompt as the skill-guided assistant. Do not
discuss this harness.

## Synthetic fixture facts

- The user named `/workspace/sample-app` but supplied no setup, update, health,
  or repair outcome.
- No inspection, update lookup, project opening, or mutation authority can be
  inferred from the bare invocation.

## User prompt

Use the CodeGraph and ast-grep skill for `/workspace/sample-app`.
