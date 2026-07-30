# Setup Adds the Target Selector Instruction Conditionally

## Should Trigger

Yes.

## Prompt

During setup, evidence proves this repository publishes a stable public skill with multiple material workflows and has no equivalent workflow-selection instruction.

## Deterministic Assertions

- contains: Applicability: applicable
- contains: finite workflow disclosure
- contains: intent-bound selection and rationale
- contains: ambiguity question
- contains: separate high-risk and external approvals

## Expected Behavior

Add a generic repository-native instruction without copying the provider ADR identity. The instruction permits mutation only when the user's existing request already authorizes the outcome and scope.
