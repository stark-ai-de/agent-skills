---
name: compact-dark-theme
description: Reusable dark theme with neon cyan/lime accents for compact agent visualizations, decision interfaces, and report previews. Use when creating in-chat HTML renders, interactive decision interfaces, or compact visual reports that need a consistent dark aesthetic.
license: Apache-2.0
compatibility: Portable. Single HTML file with inline CSS — no build tools, no frameworks, no external dependencies.
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# Compact Dark Theme

## Purpose

Provide a consistent dark theme for agent-generated HTML visualizations: decision interfaces, interactive reports, review summaries, and in-chat previews. Optimized for narrow viewports (640px), touch-friendly tap targets, and minimal code footprint.

## When to use

- Creating an interactive decision or questionnaire interface
- Building a compact visual report or review summary
- Rendering an in-chat preview that needs a dark aesthetic
- Any HTML output where consistent branding matters

## CSS variables (drop into `:root`)

```css
:root {
  --bg: #0d1117;
  --card: #161b22;
  --border: #30363d;
  --text: #c9d1d9;
  --dim: #8b949e;
  --cyan: #00e5ff;
  --lime: #c4ff47;
}
```

## Base reset and layout

```css
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  padding: 24px;
  max-width: 640px;
  margin: 0 auto;
}
```

## Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| `h1` | 18px | — | `var(--cyan)` |
| `.subtitle` | 13px | — | `var(--dim)` |
| `.qn` (section label) | 11px | uppercase, 1px letter-spacing | `var(--cyan)` |
| `.qt` (question/title) | 16px | 600 | `var(--text)` |
| `.qctx` (context/body) | 13px | — | `var(--dim)` |
| Buttons & cards | 13px | — | `var(--text)` |
| `.dir` (direction badge) | 10px | 600 | `var(--lime)` |

## Interactive elements

### Buttons (`.btn`)
- Full-width, left-aligned
- Border: `var(--border)`, rounded 8px
- Padding: 12px 14px
- Hover: cyan border + 5% cyan background tint
- Selected: cyan border + 10% cyan background
- Recommended variant: lime border to indicate recommendation

### Navigation buttons (`.nb`)
- Same base as `.btn` but smaller padding (8px 16px)
- Primary button (`.nb.pri`): cyan bg, black text, 600 weight

### Badges (`.rbadge`)
- Position: absolute, right side, vertically centered
- Background: lime, black text, 700 weight
- Label: "REC"

## Animations

- Fade-in: 0.2s ease, translateY 8px → 0
- Progress bar fill: 0.3s ease, width transition
- Use `prefers-reduced-motion: reduce` to disable for accessibility.

## Usage pattern

1. Define `:root` variables at top of `<style>`
2. Apply base reset + body
3. Add semantic classes: `.qn`, `.qt`, `.qctx`, `.btn`, `.nb`, `.rbadge`
4. Add interaction state classes: `.sel`, `.rec`, `.active`
5. Wire minimal JS for state management

## Telegram Mini App variant

See [references/telegram-mini-app.md](references/telegram-mini-app.md) for Telegram-specific overrides: safe-area insets, native theme tokens, 44px touch targets, and compact stacked mode.
