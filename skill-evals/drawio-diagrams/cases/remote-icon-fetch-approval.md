# Remote Icon Fetch Approval

## Prompt

```text
Use $drawio-diagrams to add the exact product logo for a niche SaaS product that is not available in draw.io stencils.
```

## Should Trigger

Yes

## Expected Behavior

- Activate because the user requested draw.io work.
- Require approval before fetching a remote icon, index, or third-party registry asset.
- Prefer native stencils or generic labeled shapes first.
- Verify any third-party slug or variant at lookup time.
- Disclose linked versus embedded mode and record any external icon source.

## Deterministic Assertions

- contains: approval
- contains: remote
- contains: stencil
