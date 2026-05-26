# Animated GIF Only

## Should Trigger

Yes.

## Prompt

The README logo is currently an animated GIF:

```html
<img src="docs/assets/logo-animated.gif" alt="Project logo" width="240" height="240" />
```

Can you review whether this is good enough?

## Expected Behavior

- Trigger because this is README logo animation.
- Keep GIF as a conservative fallback but warn about color and transparency limitations.
- Recommend a static reduced-motion source.
- Recommend WebP/APNG when transparency or quality matters and compatibility is verified.
- Provide a README snippet or concrete next steps.
