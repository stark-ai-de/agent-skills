# hetzner-inference-setup Eval Proof

This folder covers workflow routing, authority, secret handling, host boundaries, proof claims, lifecycle ownership, and rollback for the public standalone `hetzner-inference-setup` skill.

## Cases

- [`ambiguous-workflow.md`](cases/ambiguous-workflow.md)
- [`clear-setup.md`](cases/clear-setup.md)
- [`offline-diagnosis.md`](cases/offline-diagnosis.md)
- [`selected-compatibility-check.md`](cases/selected-compatibility-check.md)
- [`cursor-guided-only.md`](cases/cursor-guided-only.md)
- [`unknown-port-listener.md`](cases/unknown-port-listener.md)
- [`wsl-cross-boundary.md`](cases/wsl-cross-boundary.md)
- [`repair-attributable-drift.md`](cases/repair-attributable-drift.md)
- [`provider-rotation.md`](cases/provider-rotation.md)
- [`rollback-preserves-credentials.md`](cases/rollback-preserves-credentials.md)
- [`client-proof-separation.md`](cases/client-proof-separation.md)
- [`remote-gateway-negative.md`](cases/remote-gateway-negative.md)

Use [`rubric.md`](rubric.md). These prompts contain no live token and authorize no network call by themselves. Automated repository validation uses mocks; opt-in live evidence is separate and must remain sanitized.

## Local, remote and manual coverage

- [`remote-autonomous.md`](cases/remote-autonomous.md)
- [`manual-local-no-key.md`](cases/manual-local-no-key.md)
- [`manual-remote-ui.md`](cases/manual-remote-ui.md)
- [`remote-inference-key.md`](cases/remote-inference-key.md)
- [`remote-gitops-owner.md`](cases/remote-gitops-owner.md)
- [`remote-secret-location.md`](cases/remote-secret-location.md)
- [`remote-timeout-recovery.md`](cases/remote-timeout-recovery.md)
- [`remote-owned-rollback.md`](cases/remote-owned-rollback.md)
- [`client-claim-boundary.md`](cases/client-claim-boundary.md)
- [`codex-system-message-order.md`](cases/codex-system-message-order.md)
- [`generic-provider-negative.md`](cases/generic-provider-negative.md)

## Current evidence

- [Windows ACL follow-up](runs/2026-09-22-windows-acl.md) — native SID regression and hosted qualification boundaries.
- [Validation and live evidence](runs/2026-09-21-validation.md) — source-bound local proof and explicit remote/client/platform gaps.

- [Known-expectations text exercise](runs/2026-09-21-text-evaluation.md) — response coverage only, not an executed activation benchmark.
- Public runtime validation: `pnpm run validate:hetzner-inference`. Native/hosted skips and live evidence are reported separately.
