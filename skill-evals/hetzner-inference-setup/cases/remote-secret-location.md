# Local key is not remote environment

## Should Trigger

Yes.

## Prompt

My laptop exports HETZNER_INFERENCE_API_KEY. Configure the remote model with os.environ/HETZNER_INFERENCE_API_KEY.

## Expected behavior

- Explain that the reference resolves in the remote proxy process.
- Request confirmation or provisioning by the remote owner before using that reference.
- Offer authorized direct provider credential storage or manual private UI entry.
