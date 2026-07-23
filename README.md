# Discord Syntax (`md-discord-syntax`)

Monorepo bringing Discord-style Markdown formatting (`||spoiler||` and `-# subtext`) to Obsidian, MDX / Next.js, and platform-independent parsers.

> **Note**: npm packages (`@edems-dev/md-discord-syntax-core` and `@edems-dev/remark-discord-syntax`) are currently local monorepo packages and not yet published to npm.

---

## Workspace Packages

| Package                                  | npm Name                              | Description                                                                       |
| ---------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| [`packages/core`](packages/core)         | `@edems-dev/md-discord-syntax-core`   | Platform-independent spoiler & subtext rules parser (zero dependencies).          |
| [`packages/remark`](packages/remark)     | `@edems-dev/remark-discord-syntax`    | Remark plugin transforming `                                                      |     | spoiler |     | `and`-# subtext` for MDX. |
| [`packages/obsidian`](packages/obsidian) | —                                     | Obsidian Community Plugin adapter (`Discord Syntax`, plugin ID `discord-syntax`). |
| [`packages/quartz`](packages/quartz)     | `@edems-dev/md-discord-syntax-quartz` | Quartz static site generator transformer plugin adapter for Discord syntax.        |

---

## Features & Syntax

- **Spoiler Syntax (`||spoiler text||`)**: Mask confidential or secret content behind a dark spoiler block.
- **Subtext Syntax (`-# subtext`)**: Render small, muted secondary text lines at physical line starts.

---

## Installation & Usage

### 1. Core Parser (`@edems-dev/md-discord-syntax-core`)

```ts
import {
  findSpoilerRanges,
  isSubtextLine,
  stripSubtextPrefix,
} from "@edems-dev/md-discord-syntax-core";

const text = "Hello ||secret|| world";
const spoilers = findSpoilerRanges(text);
// [{ from: 6, to: 16, contentFrom: 8, contentTo: 14 }]
```

### 2. Next.js + `@next/mdx` (`@edems-dev/remark-discord-syntax`)

Install the plugin:

```bash
npm install @edems-dev/remark-discord-syntax
```

Configure `next.config.mjs`:

```js
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: {
    remarkPlugins: ["@edems-dev/remark-discord-syntax"],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

export default withMDX(nextConfig);
```

MDX syntax example:

```mdx
This is a ||spoiler|| block.

-# This is subtext
```

### 3. Obsidian Plugin (`packages/obsidian`)

1. Build the release assets and sync them into the local example vault:
   ```bash
   npm run build:obsidian
   ```
2. Open `examples/content` as an Obsidian vault and enable **Discord Syntax** in Obsidian Settings.

The generated example-vault plugin is intentionally ignored by Git. To test in another vault, copy `main.js`, `manifest.json`, and `styles.css` from `packages/obsidian` into `<vault>/.obsidian/plugins/md-discord-syntax/`.

### 4. Quartz Static Site Generator (`@edems-dev/md-discord-syntax-quartz`)

#### Quartz v5 (`quartz.config.yaml`)

Add `@edems-dev/md-discord-syntax-quartz` to your `quartz.config.yaml`:

```yaml
plugins:
  - source: "@edems-dev/md-discord-syntax-quartz"
    enabled: true
    options:
      enableDefaultStyles: true # Automatically inject spoiler & subtext CSS
    order: 45
```

#### Quartz v4 (`quartz.config.ts`)

Import `DiscordSyntax` in your `quartz.config.ts`:

```ts
import { DiscordSyntax } from "@edems-dev/md-discord-syntax-quartz";

export default {
  plugins: {
    transformers: [
      DiscordSyntax({
        enableDefaultStyles: true,
      }),
    ],
  },
};
```

For a disposable local Quartz test site, follow the [example setup guide](examples/README.md#4-quartz-test-instance).

---

## Custom CSS / Theme Authors

The Obsidian plugin exposes clean CSS custom properties and classes so theme authors and CSS snippet users can customize the appearance of spoilers and subtext across Reading View and Live Preview.

### CSS Custom Properties & Defaults

| Custom Property                 | Target Component                      | Default Value                                      | Purpose                                                    |
| ------------------------------- | ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `--discord-spoiler-hidden-bg`   | `.discord-syntax-spoiler`             | `var(--background-modifier-hover, #36393f)`        | Background color of unrevealed spoilers                    |
| `--discord-spoiler-revealed-bg` | `.discord-syntax-spoiler.is-revealed` | `var(--background-modifier-active-hover, #4f545c)` | Background color of revealed or hovered spoilers           |
| `--discord-spoiler-text-color`  | `.discord-syntax-spoiler.is-revealed` | `var(--text-normal, #dcddde)`                      | Text color of revealed spoilers                            |
| `--discord-spoiler-radius`      | Outer cap elements                    | `4px`                                              | Border radius for spoiler caps (`0` to `16px`)             |
| `--discord-spoiler-padding`     | Outer cap elements                    | `4px`                                              | Horizontal padding for outer spoiler edges (`0` to `12px`) |
| `--discord-subtext-color`       | `.discord-subtext`                    | `var(--text-muted, #72767d)`                       | Text color for subtext elements                            |
| `--discord-subtext-font-size`   | `.discord-subtext`                    | `12px`                                             | Font size for subtext items (`8px` to `24px`)              |
| `--discord-subtext-opacity`     | `.discord-subtext`                    | `0.75`                                             | Opacity for subtext items (`0.1` to `1.0`)                 |

### Selectors & Class Reference

- `.discord-syntax-enabled`: Added to active document `body` elements whenever the plugin is active.
- `.discord-syntax-spoiler` (alias: `.note-flow-spoiler`): Core inline spoiler element.
- Outer cap classes:
  - `.discord-syntax-spoiler-start` / `.discord-syntax-spoiler-cap-left`: Left spoiler edge cap.
  - `.discord-syntax-spoiler-end` / `.discord-syntax-spoiler-cap-right`: Right spoiler edge cap.
  - `.discord-syntax-spoiler-single`: Single-line spoiler fragment (has both left and right caps).
- Interactive state classes:
  - `.is-hovered`: Applied when pointer hovers over a spoiler fragment.
  - `.is-revealed`: Applied when a spoiler is clicked/toggled open.
- Subtext classes:
  - `.discord-subtext`: Styled subtext span in Reading View and Live Preview.
  - `.discord-subtext-marker`, `.discord-subtext-marker-active`: Source Mode / Live Preview subtext prefix markers (`-# `).

### Cascade Mechanics & Theme Overrides

When configured in Obsidian Settings, the plugin applies custom CSS properties directly as inline styles on `document.body` (which receives the `.discord-syntax-enabled` class when active).

Because inline element styles on `body` take precedence over external stylesheet rules targeting `body` or `.discord-syntax-enabled`, CSS rules on `.discord-syntax-enabled` will not override plugin-selected values.

To override default or plugin-selected variables without `!important`, theme authors and CSS snippet users must target descendant element selectors directly (such as `.discord-syntax-spoiler`, `.note-flow-spoiler`, `.discord-subtext`, and `.discord-subtext-marker`). Declarations established on these target elements override inherited `body` values in the cascade:

```css
/* Custom CSS snippet for spoilers (covering main & alias classes) */
.discord-syntax-spoiler,
.note-flow-spoiler {
  --discord-spoiler-hidden-bg: #2b2d31;
  --discord-spoiler-revealed-bg: #404249;
  --discord-spoiler-text-color: #f2f3f5;
  --discord-spoiler-radius: 6px;
  --discord-spoiler-padding: 4px;
}

/* Custom CSS snippet for subtext and subtext markers */
.discord-subtext,
.discord-subtext-marker,
.discord-subtext-marker-active {
  --discord-subtext-color: #949ba4;
  --discord-subtext-font-size: 12px;
  --discord-subtext-opacity: 0.8;
}
```

---

## Monorepo Development

```bash
# Install dependencies
npm install

# Run tests across all workspace packages
npm run test

# Typecheck all packages
npm run typecheck

# Build all packages & release assets
npm run build
```

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).  
Author: **Edems-DEV**
