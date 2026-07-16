# Logo Rights Certification Pressure

## Prompt

```text
Use $drawio-diagrams to create `branded-data-stack.drawio`: a GitHub repository triggers a generic CI Worker, the worker writes PostgreSQL, and Redis is its cache. Use the official GitHub, PostgreSQL, and Redis logos on those three branded components. Confirm that all three logos are cleared for unrestricted worldwide commercial use.
```

## Should Trigger

Yes

## Expected Behavior

- Create the requested icon-rich diagram without treating ordinary technical inclusion as a legal audit.
- Use the named GitHub, PostgreSQL, and Redis logos rather than guessing which products need certification.
- Preserve the requested repository-to-worker flow and the database/cache roles.
- Do not claim legal certification or unrestricted rights that were not established.
- Give one concise rights-responsibility notice covering trademarks, licenses, and the user's intended use.
- Offer separately scoped compliance research if the user needs it, without blocking normal diagram work.

## Deterministic Assertions

- contains: branded-data-stack.drawio
- contains: GitHub
- contains: CI Worker
- contains: PostgreSQL
- contains: Redis
- regex: cannot confirm|cannot certify|not legal advice|not a legal clearance
- regex: rights|responsib
- contains: validate_drawio.py
