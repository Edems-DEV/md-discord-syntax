# remark-md-discord-syntax

Remark plugin transforming Discord-style spoiler blocks (`||spoiler||`) and subtext lines (`-# subtext`) for MDX / Markdown.

Part of the [md-discord-syntax](https://github.com/Edems-DEV/md-discord-syntax) repository.

## Installation

```bash
npm install remark-md-discord-syntax
```

## Minimal Usage

```js
import { remarkMdDiscordSyntax } from 'remark-md-discord-syntax'
import { remark } from 'remark'

const file = await remark()
  .use(remarkMdDiscordSyntax)
  .process('This is a ||spoiler|| and\n-# subtext line')
```

### Next.js (`next.config.mjs`)

```js
import createMDX from '@next/mdx'

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-md-discord-syntax'],
  },
})

export default withMDX({
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
})
```

## License

[GPL-3.0](LICENSE) © Edems-DEV
