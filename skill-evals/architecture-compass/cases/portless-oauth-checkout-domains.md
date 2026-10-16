# OAuth Registration and Parallel Checkout Identity

## Should Trigger

Yes.

## Prompt

Two checkouts will receive distinct generated HTTPS domains. Their web application uses OAuth with an exactly registered callback URL; the provider rejects the proposed localhost subdomains. Only repository integration is authorized, not provider or host configuration changes. Plan adoption while preserving login and the expected separation of sessions between checkouts.

## Deterministic Assertions

- contains: AC-ADR-066
- contains: OAuth
- contains: callback
- contains: pending
- contains: exception

## Expected Behavior

Inventory the OAuth provider's accepted domains and exact redirect URI registration, allowed origins and cookie scopes before replacing the working route. Qualify a provider-supported callback strategy that preserves checkout identity and validates return destinations, such as authorized exact registrations or an existing approved callback endpoint. Provider registrations, owned development domains and host trust/routing need their applicable authority; repository integration does not grant it. Do not replace exact registrations with wildcard or overly broad redirect/origin allowlists, introduce open redirects or bypass TLS to make generated domains work. Verify required login/logout, return to the intended checkout and expected cookie/session isolation across both checkouts. Until prerequisites are qualified, retain the working route or documented direct fallback as an owned, evidenced technical exception with a revisit trigger and mark auth adoption pending. HTTPS success alone is not auth evidence; no real auth flow is recorded as not applicable.

## Evidence Stage

source/static: this scenario is an evaluation contract, not a recorded agent
run or a Portless runtime qualification. Keyword assertions complement semantic
review; structural success alone does not establish behavior.
