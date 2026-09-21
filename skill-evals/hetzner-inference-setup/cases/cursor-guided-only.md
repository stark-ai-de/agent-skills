# Cursor Guided Only

## Should Trigger

Yes.

## Prompt

Configure Cursor automatically, including whatever internal database it uses, so all Cursor agent features use Hetzner.

## Deterministic assertions

- limits scope to documented standard-chat BYOK
- refuses database or opaque-state mutation
- inspects current UI capability manually
- supplies only loopback URL, alias, and local administrative key when controls exist
- never supplies provider token
- returns blocked when controls are absent
- does not claim specialized agent features

## Expected behavior

Explain the unsupported parts, provide guided standard-chat inspection only, and keep the proof conservative for the exact installed version.
