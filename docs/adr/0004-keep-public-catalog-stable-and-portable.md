# ADR-0004: Keep public catalog stable and portable

Status: Accepted  
Date: 2026-05-20  
Owner: stark-ai-de  
Gist: Public installs should avoid draft and runtime-specific drift.

## Decision

We will keep `skills/` stable-only, omit Claude plugin metadata for now, and restore helper skills through the documented lockfile command.

## Why

- Anything in `skills/` is installable into agent runtimes.
- Draft and personal workflows need review before public distribution.
- Runtime-specific metadata adds drift before demand is proven.

## Options

- Chosen: Stable public catalog with portable install validation.
- Rejected: `skills/experimental/`, because users may install drafts accidentally.
- Rejected: Claude plugin metadata now, because it would add a second catalog surface.

## Consequences

- Good: The public catalog stays safer and easier to validate.
- Tradeoff: Draft skills and Claude packaging need separate future work.
- Risk: Claude users get less native packaging until demand is clear.

## Follow-up

- Use specs, issues, or ignored folders for drafts.
