# Discord Syntax for Obsidian

A native Obsidian plugin that brings Discord-style Markdown formatting to your notes in both **Reading View** and **Live Preview**.

## Features

- **Spoiler Syntax (`||spoiler text||`)**: Mask confidential or secret content behind a dark spoiler block. Click or press `Enter`/`Space` to reveal, click again to edit.
- **Subtext Syntax (`-# subtext`)**: Render small, muted secondary text lines at physical line starts.
- **Toggle Spoilers Command**: Trigger `Discord Syntax: Toggle all spoilers in active note` to expand or conceal all spoilers in the current note at once.

## Usage & Examples

### 1. Spoilers

Wrap any text in double vertical bars `||`:

```markdown
Here is a normal sentence with a ||secret spoiler|| inside it.
```

- **Reading View**: Renders as a spoiler block. Click to reveal.
- **Live Preview**: Automatically hides `||` delimiters and masks text when the cursor is off the spoiler. Clicking or navigating into the spoiler reveals its content and enables editing.

### 2. Subtext Lines

Start any line with `-# ` at column 0:

```markdown
This is normal paragraph text.
-# This line will be rendered as small, muted subtext.
```

- **Reading View**: Renders as smaller, muted subtext without modifying your source markdown file.
- **Live Preview**: When your cursor is on another line, `-# ` is hidden and the line is styled as subtext. When you move your cursor onto the subtext line, the `-# ` prefix appears faintly so you can edit it naturally.

---

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub Release.
2. Create a folder named `discord-syntax` inside your vault's `.obsidian/plugins/` directory:
   `<vault>/.obsidian/plugins/discord-syntax/`
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. Reload Obsidian and enable **Discord Syntax** in **Settings > Community plugins**.

---

## Development

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Type check
npm run typecheck

# Build release assets (main.js and styles.css)
npm run build

# Development watch mode
npm run dev
```

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
