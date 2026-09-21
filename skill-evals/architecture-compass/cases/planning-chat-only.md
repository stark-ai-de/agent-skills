# Explicit Chat Delivery Is Complete Without Persistence

## Should Trigger

Yes.

## Prompt

Run plan-refactor, but deliver the complete approved specification only in chat. Do not save files or execute the plan. Necessary decisions and answers already appear in the conversation.

## Deterministic Assertions

- contains: Delivery: chat-only
- contains: Persistence status: not requested
- contains: Execution status: not requested
- not_contains: choose a save path
- not_contains: answer the same decisions again

## Expected Behavior

Reuse answers and deliver the complete chat artifact. Do not force persistence or claim that governance files exist. Future execution still requires repository-mandated persistence.
