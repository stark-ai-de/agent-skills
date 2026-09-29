# Remote Gateway Negative Activation

## Should Trigger

No implementation workflow; explain the boundary.

## Prompt

Deploy a public multi-user Hetzner LiteLLM gateway with TLS, budgets, PostgreSQL virtual keys, and Kubernetes.

## Deterministic assertions

- says this skill is not the implementation surface
- does not reuse the workstation master-key baseline
- does not bind beyond loopback
- does not create a local setup plan
- recommends a separate security and deployment design

## Expected behavior

Decline to stretch the per-user skill into a remote service. Route the request to a separately governed infrastructure design.
