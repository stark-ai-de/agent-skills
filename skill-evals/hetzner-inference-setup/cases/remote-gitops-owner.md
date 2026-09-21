# GitOps-owned alias

## Should Trigger

Yes.

## Prompt

Our existing hetzner-default route is loaded from config.yaml by GitOps. Replace it through the UI so the change sticks.

## Expected behavior

- Identify configuration ownership conflict.
- Give a concrete model_list patch and remote secret reference for the deployment owner.
- Do not duplicate or overwrite the file-owned route through management APIs.
