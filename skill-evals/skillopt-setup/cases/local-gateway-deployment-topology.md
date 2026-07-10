# Local Gateway Deployment Topology

## Should Trigger

Yes.

## Prompt

We now have several gateway scripts for model routes. Should I deploy one gateway service for all of them, or create separate services? I plan to use the Codex OpenAI-compatible gateway with SkillOpt and route it through our shared model gateway.

## Expected Behavior

- Activate `skillopt-setup`.
- State that the bundled Codex gateway is loopback-only and must remain unpublished until an OS/container boundary provides host-read isolation.
- Recommend a shared route layer for client-facing model names.
- Reject one monolithic service that hosts every gateway script.
- Recommend separate gateway deployments per backend and trust boundary.
- Allow one Codex gateway deployment to serve multiple Codex aliases only when auth, sandbox, network, resource, and ownership boundaries are the same.
- Keep Codex routes blocked until the internal Codex gateway has host-read isolation, has passed `/v1/chat/completions` preflight, and the route catalog marks it accurately.
- State that Kubernetes workloads, NetworkPolicy, route publication, and secret wiring belong in the infrastructure source of truth, not this skill repository.

## Deterministic Assertions

- contains: shared route layer
- contains: not one monolithic service
- contains: separate gateway deployments
- contains: backend and trust boundary
- contains: same auth
- contains: /v1/chat/completions
- contains: infrastructure source of truth
- contains: loopback-only
- contains: host-read isolation

## Visual Assertions

- None.
