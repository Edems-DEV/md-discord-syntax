# Discord Syntax (`md-discord-syntax`)

Monorepo bringing Discord-style Markdown formatting (`||spoiler||` and `-# subtext`) to Obsidian, MDX / Next.js, and platform-independent parsers.

> **Note**: npm packages (`@md-discord-syntax/core` and `remark-md-discord-syntax`) are currently local monorepo packages and not yet published to npm.

---

## Workspace Packages

| Package | npm Name | Description |
| ------- | -------- | ----------- |
| [`packages/core`](packages/core) | `@md-discord-syntax/core` | Platform-independent spoiler & subtext rules parser (zero dependencies). |
| [`packages/remark`](packages/remark) | `remark-md-discord-syntax` | Remark plugin transforming `||spoiler||` and `-# subtext` for MDX. |
| [`packages/obsidian`](packages/obsidian) | — | Obsidian Community Plugin adapter (`Discord Syntax`, plugin ID `md-discord-syntax`). |
| [`examples/next-mdx`](examples/next-mdx) | — | Minimal Next.js MDX usage example consuming `remark-md-discord-syntax`. |
| [`packages/quartz`](packages/quartz) | `@md-discord-syntax/quartz` | Reserved for future Quartz static site generator integration. |

---

## Features & Syntax

- **Spoiler Syntax (`||spoiler text||`)**: Mask confidential or secret content behind a dark spoiler block.
- **Subtext Syntax (`-# subtext`)**: Render small, muted secondary text lines at physical line starts.

---

## Installation & Usage

### 1. Core Parser (`@md-discord-syntax/core`)

```ts
import { findSpoilerRanges, isSubtextLine, stripSubtextPrefix } from '@md-discord-syntax/core'

const text = "Hello ||secret|| world"
const spoilers = findSpoilerRanges(text)
// [{ from: 6, to: 16, contentFrom: 8, contentTo: 14 }]
```

### 2. Remark Plugin (`remark-md-discord-syntax`)

In Next.js MDX config (`next.config.mjs`):

```js
import createMDX from '@next/mdx'
import { remarkMdDiscordSyntax } from 'remark-md-discord-syntax'

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkMdDiscordSyntax]
  }
})

export default withMDX({
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx']
})
```

### 3. Obsidian Plugin (`packages/obsidian`)

1. Build the release assets in `packages/obsidian`:
   ```bash
   npm run build --workspace=packages/obsidian
   ```
2. Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/md-discord-syntax/`.
3. Enable **Discord Syntax** in Obsidian Settings.

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
