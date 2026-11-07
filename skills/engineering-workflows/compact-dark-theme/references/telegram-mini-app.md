# Telegram Mini App Overrides

## Theme token mapping

Telegram WebView supplies CSS custom properties via the WebApp API. Map them into the compact-dark-theme variables:

```css
:root {
  /* Telegram runtime overrides — applied by init_tg_theme() */
  --bg: var(--tg-theme-bg-color, #0d1117);
  --card: var(--tg-theme-secondary-bg-color, #161b22);
  --border: var(--tg-theme-hint-color, #30363d);
  --text: var(--tg-theme-text-color, #c9d1d9);
  --dim: var(--tg-theme-hint-color, #8b949e);
  --cyan: var(--tg-theme_button_color, #00e5ff);
  --lime: var(--tg-theme_button_color, #c4ff47); /* same token, override below */
}
```

After mapping, override `--lime` manually since Telegram's button color is usually single-tone:

```css
:root { --lime: #c4ff47; }
```

## Safe area insets

Telegram Mini Apps on iOS have notch/safe-area insets. Add to `body`:

```css
body {
  padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
           max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
}
```

## Touch targets

Telegram users interact via touch on narrow viewports. Ensure minimum 44px tap targets:

```css
.btn, .nb {
  min-height: 44px;
  padding: 12px 14px; /* already adequate */
}
```

Disable hover effects on touch devices:

```css
@media (hover: none) {
  .btn:hover, .nb:hover {
    border-color: var(--border);
    background: transparent;
  }
  .btn:active, .nb:active {
    border-color: var(--cyan);
    background: rgba(0, 229, 255, 0.1);
  }
}
```

## Font stack for iOS/Android WebView

Telegram's WebView is WKWebView (iOS) or Chromium (Android). Use a stack that covers both:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
```

## Compact stacked mode

For very narrow viewports (<360px), remove card borders and stack content tighter:

```css
@media (max-width: 360px) {
  body { padding: 16px; max-width: 100%; }
  .qc { border-radius: 8px; padding: 16px; }
  .btn { border-radius: 6px; padding: 10px 12px; }
}
```

## Init script

Add this to `<body>` to auto-apply Telegram theme tokens:

```html
<script>
(function(){
  if(typeof Telegram !== 'undefined' && Telegram.WebApp){
    const w = Telegram.WebApp;
    w.ready();
    w.expand();
    const s = document.documentElement.style;
    s.setProperty('--tg-ready', '1');
  }
})();
</script>
```

Then check `--tg-ready` in CSS to conditionally apply safe-area overrides:

```css
html:not([style*="--tg-ready"]) body { padding: 24px; } /* fallback */
```
