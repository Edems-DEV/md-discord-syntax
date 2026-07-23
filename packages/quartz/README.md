# `@edems-dev/md-discord-syntax-quartz`

Quartz static site generator transformer plugin adapter for **Discord Markdown Syntax** (`||spoiler||` and `-# subtext`).

## Features

- **Discord Spoilers (`||spoiler||`)**: Mask text behind a clickable/hoverable spoiler block.
- **Discord Subtext (`-# subtext`)**: Render small, muted secondary text lines.
- **Built-in CSS Styling**: Includes optional default CSS via Quartz's `externalResources()` hook with hover and reveal effects.
- **Zero Config Required**: Works out-of-the-box with Quartz v4 & Quartz v5.

---

## Installation & Setup Guide for Quartz

### Option 1: Quartz v5 (`quartz.config.yaml`)

Add `@edems-dev/md-discord-syntax-quartz` under `plugins:` in your `quartz.config.yaml`:

```yaml
plugins:
  # ... existing plugins ...
  - source: "@edems-dev/md-discord-syntax-quartz"
    enabled: true
    options:
      enableDefaultStyles: true # Enabled by default
    order: 45
```

> **Note for Monorepos / Local Development**:
> You can also link a local build directory in `quartz.config.yaml`:
> ```yaml
>   - source: "../../packages/quartz"
>     enabled: true
>     options:
>       enableDefaultStyles: true
>     order: 45
> ```

---

### Option 2: Quartz v4 (`quartz.config.ts`)

Import `DiscordSyntax` in your `quartz.config.ts` and add it to `plugins.transformers`:

```ts
import { DiscordSyntax } from "@edems-dev/md-discord-syntax-quartz";

export default {
  // ... configuration
  plugins: {
    transformers: [
      // ... other transformers
      DiscordSyntax({
        enableDefaultStyles: true, // Inject default spoiler and subtext CSS automatically
      }),
    ],
  },
};
```

---

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableDefaultStyles` | `boolean` | `true` | Automatically inject built-in spoiler & subtext CSS styles via `externalResources()`. |

---

## Manual / Custom CSS Styling

If you set `enableDefaultStyles: false`, you can import `styles.css` directly into your custom Quartz styles or SCSS (`custom.scss`):

```scss
@import "@edems-dev/md-discord-syntax-quartz/styles.css";
```

### CSS Selectors & Customization

```css
/* Unrevealed Spoiler */
.discord-syntax-spoiler, .discord-spoiler, [data-spoiler="true"] {
  background-color: var(--darkgray, #2b2d31);
  color: transparent !important;
  cursor: pointer;
  border-radius: 3px;
  padding: 0 4px;
}

/* Revealed Spoiler */
.discord-syntax-spoiler.revealed,
.discord-syntax-spoiler.is-revealed,
.discord-syntax-spoiler:hover {
  color: var(--dark, inherit) !important;
  background-color: var(--highlight, rgba(255, 255, 255, 0.15)) !important;
}

/* Subtext */
.discord-syntax-subtext, .discord-subtext, [data-subtext="true"] {
  font-size: 0.82em;
  color: var(--gray, #72767d);
}
```

---

## License

GPL-3.0 © Edems-DEV
