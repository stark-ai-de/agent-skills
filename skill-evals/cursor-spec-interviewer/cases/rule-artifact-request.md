# Rule Artifact Request

## Should Trigger

Yes.

## Prompt

Plan the API error-handling overhaul for this repo. We keep agent guidance in `.cursor/rules/`, so put the plan there when you are done.

## Expected Behavior

- Activate `cursor-spec-interviewer` because this is an underspecified implementation-planning request.
- Interview and inspect repo evidence, including existing `.cursor/rules/**/*.mdc` files.
- Explain that Cursor rules are prompt-scope guidance, not implementation spec artifacts, and propose saving the spec under the repo spec convention such as `docs/specs/`.
- Honor the user's explicit destination choice after the tradeoff is stated, without silently converting the full spec into a rule by default.
- Offer to distill durable constraints into a rule as a separate artifact only if the user confirms.
