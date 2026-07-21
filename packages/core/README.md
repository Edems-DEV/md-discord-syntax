# @edems-dev/md-discord-syntax-core

Platform-independent Discord spoiler (`||spoiler||`) and subtext (`-# subtext`) syntax parser with zero dependencies.

Part of the [md-discord-syntax](https://github.com/Edems-DEV/md-discord-syntax) repository.

## Installation

```bash
npm install @edems-dev/md-discord-syntax-core
```

## Minimal API Usage

```ts
import { findSpoilerRanges, isSubtextLine, stripSubtextPrefix } from '@edems-dev/md-discord-syntax-core'

const text = 'Hello ||secret|| world'
const spoilers = findSpoilerRanges(text)
// [{ from: 6, to: 16, contentFrom: 8, contentTo: 14 }]

const line = '-# Subtext line'
if (isSubtextLine(line)) {
  const content = stripSubtextPrefix(line) // "Subtext line"
}
```

## License

[GPL-3.0](LICENSE) © Edems-DEV
