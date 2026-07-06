# Settings And Hooks

Use this when a Claude context entry should become enforceable configuration or automation.

## Settings Destinations

Prefer `MOVE TO SETTINGS` when the claim is about:

- enabling or disabling auto memory with `autoMemoryEnabled`;
- selecting a memory directory with `autoMemoryDirectory`;
- excluding irrelevant instruction files with `claudeMdExcludes`;
- permission allow or deny rules;
- sandbox filesystem or network restrictions;
- plugin, MCP, model, environment, or telemetry settings.

Use `.claude/settings.json` for shared project settings and `.claude/settings.local.json` for private local settings. Use `~/.claude/settings.json` for user-wide preferences. Treat managed settings as manual managed-policy actions unless explicitly in scope.

## Hook Destinations

Prefer `MOVE TO HOOK` when the claim requires lifecycle automation, validation, or a hard guard, such as:

- block a dangerous command before tool use;
- run a formatter or checker after edits;
- expand a prompt with generated context;
- reject or defer work when a policy condition fails;
- notify or log session events.

Use hook recommendations, not immediate hook edits, unless the user explicitly asks to create or modify hooks.

## Context Is Not Enforcement

`CLAUDE.md`, rules, and auto memory guide model behavior. They do not guarantee behavior. When the user says "must block", "never allow", or "enforce", classify the claim toward settings or hooks.

## Manual Managed Policy

Use `MOVE TO MANAGED POLICY` only for organization-wide requirements that should affect every Claude Code session on managed machines. Do not edit managed policy files by default.
