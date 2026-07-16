# Icon First Default

## Prompt

```text
Create an editable draw.io architecture diagram containing a user, OpenAI, Anthropic, PostgreSQL, Redis, and a generic message queue. Use your defaults and make it visually easy to scan.
```

## Should Trigger

Yes

## Split Family

architecture-default-quality

## Expected Behavior

- Give every primary component a relevant visual symbol plus a readable label.
- Prefer Lobe Icons for the AI/LLM brands and Simple Icons for broad technology brands when native stencils are unavailable.
- Use a native semantic queue icon for the generic queue rather than a bare text box.
- Embed external SVGs, preserve aspect ratio, and keep logo chips consistent in light and dark mode.
- Run the icon-coverage diagram rule and include one rights-responsibility notice.

## Deterministic Assertions

- contains: Lobe Icons
- contains: Simple Icons
- contains: aspect=fixed
- contains: validate-drawio-diagram-rules.mjs
- contains: Rights notice
