# AGENTS.md Artifact Request

## Should Trigger

Yes.

## Prompt

Plan the API error-handling overhaul for this repo. We keep agent guidance in `AGENTS.md`, so put the plan there when you are done.

## Expected Behavior

- Activate `codex-spec-interviewer` because this is an underspecified implementation-planning request.
- Interview and inspect repo evidence, including the existing `AGENTS.md`.
- Explain that `AGENTS.md` is durable agent guidance, not an implementation spec artifact, and propose saving the spec under the repo spec convention such as `docs/specs/`.
- Honor the user's explicit destination choice after the tradeoff is stated, without silently writing the full spec into `AGENTS.md` by default.
- Offer to distill durable constraints into `AGENTS.md` as a separate change only if the user confirms.
