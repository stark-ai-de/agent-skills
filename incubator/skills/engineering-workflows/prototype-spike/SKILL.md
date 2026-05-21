---
name: prototype-spike
description: Build or plan an explicitly throwaway prototype to answer a design, API, UX, performance, or integration question, then capture findings and cleanup. Use when the user asks for a spike, prototype, proof of concept, or experiment before committing to production design.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  internal: true
  version: "0.1.0"
---

# Prototype Spike

## Goal

Answer a specific uncertainty with a deliberately bounded prototype, then either discard it or convert only the proven idea into production work.

## When to use

- The user asks for a spike, proof of concept, prototype, or throwaway experiment.
- A design choice needs evidence before production implementation.
- An integration, API, performance assumption, or UI interaction is uncertain.

## When not to use

- The user needs production-ready implementation now.
- The uncertainty can be answered by reading docs or existing code.
- The prototype would require secrets, real customer data, or irreversible operations.

## Inputs to inspect

- The exact question the prototype must answer.
- Existing architecture, ADRs, validation commands, and domain docs.
- Constraints on where prototype files may live and how they should be cleaned up.

## Workflow

1. State the hypothesis or design question.
2. Define the prototype boundary, timebox, and throwaway location.
3. Ask before adding dependencies, new services, or files outside an agreed scratch area.
4. Build the smallest experiment that answers the question.
5. Record findings, limitations, and production implications.
6. Clean up throwaway files or clearly mark what should remain.
7. Recommend whether to proceed, revise, or abandon the production approach.

## Safety rules

- Do not ship prototype code as production code without a review step.
- Do not add persistent dependencies or config unless approved.
- Do not use live credentials, customer data, or destructive operations in a spike.
- Do not leave scratch files unmarked or unexplained.

## References

No bundled references. Use local ADRs and domain docs when the spike tests an architectural assumption.

## Scripts

No bundled scripts.

## Output format

Return:

1. Question or hypothesis
2. Prototype boundary and files touched
3. Evidence gathered
4. Decision recommendation
5. Cleanup performed or remaining
6. Production follow-up tasks

## Completion criteria

- The prototype answers the stated question or explains why it could not.
- Throwaway work is cleaned up or explicitly marked.
- The production recommendation is separated from experimental code.
- Risks and follow-up tasks are documented.

## Failure modes

- If the question is not measurable, refine it before coding.
- If the prototype starts becoming production work, stop and ask for scope confirmation.
- If cleanup cannot be completed, report exact files and next action.
